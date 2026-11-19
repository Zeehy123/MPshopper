from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from .models import Category, Store, Product, PriceHistory, Trip, TripItem
from .serializers import (
    CategorySerializer, StoreSerializer, ProductSerializer,
    PriceHistorySerializer, TripSerializer, TripItemSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.select_related('category').order_by('name')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category_id=category)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        product = serializer.save()
        # the first price becomes the first history entry
        PriceHistory.objects.create(
            product=product,
            price=product.current_price,
            store_id=self.request.data.get('store') or None,
        )

    def perform_update(self, serializer):
        old_price = serializer.instance.current_price
        product = serializer.save()
        if product.current_price != old_price:
            PriceHistory.objects.create(
                product=product,
                price=product.current_price,
                store_id=self.request.data.get('store') or None,
            )
    @action(detail=True, methods=['get'], url_path='store-prices')
    def store_prices(self, request, pk=None):
        """Latest known price per store, cheapest first."""
        product = self.get_object()
        latest = {}
        for entry in product.price_history.select_related('store'):
            if entry.store_id not in latest:  # history is newest-first
                latest[entry.store_id] = entry
        rows = [
            {
                'store': e.store.name if e.store else 'Unknown',
                'price': e.price,
                'recorded_at': e.recorded_at,
            }
            for e in latest.values()
        ]
        rows.sort(key=lambda r: r['price'])
        return Response(rows)

class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PriceHistorySerializer

    def get_queryset(self):
        qs = PriceHistory.objects.select_related('store')
        product = self.request.query_params.get('product')
        return qs.filter(product_id=product) if product else qs


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.select_related('store').prefetch_related(
        'items__product')
    serializer_class = TripSerializer
    def get_queryset(self):
        qs = Trip.objects.select_related('store').prefetch_related(
            'items__product')
        completed = self.request.query_params.get('completed')
        if completed is not None:
            qs = qs.filter(is_completed=completed.lower() == 'true')
        return qs
    @action(detail=False, methods=['get'])
    def cart(self, request):
        """Return the open cart, creating one if none exists."""
        trip = (Trip.objects.filter(is_completed=False)
                .order_by('-date').first())
        if trip is None:
            trip = Trip.objects.create()
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        trip = self.get_object()
        if trip.is_completed:
            return Response({'detail': 'Trip already completed.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not trip.items.exists():
            return Response({'detail': 'The cart is empty.'},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            store_id = request.data.get('store')
            if store_id:
                trip.store_id = store_id
            trip.is_completed = True
            trip.date = timezone.now()
            trip.save()

            # prices edited during the visit become the product's new price
            for item in trip.items.select_related('product'):
                product = item.product
                if item.price_paid != product.current_price:
                    product.current_price = item.price_paid
                    product.save()
                    PriceHistory.objects.create(
                        product=product,
                        store_id=trip.store_id,
                        price=item.price_paid,
                    )
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=['post'])
    def repeat(self, request, pk=None):
        """Start a new cart from a past trip."""
        open_cart = Trip.objects.filter(is_completed=False).first()
        if open_cart and open_cart.items.exists():
            return Response(
                {'detail': 'Finish or clear your current cart first.'},
                status=status.HTTP_400_BAD_REQUEST)
        old = self.get_object()
        with transaction.atomic():
            if open_cart:
                open_cart.delete()  # it was empty
            new = Trip.objects.create(store=old.store, budget=old.budget)
            for item in old.items.select_related('product'):
                TripItem.objects.create(
                    trip=new, product=item.product, quantity=item.quantity,
                    price_paid=item.product.current_price,
                )
        return Response(self.get_serializer(new).data,
                        status=status.HTTP_201_CREATED)

class TripItemViewSet(viewsets.ModelViewSet):
    serializer_class = TripItemSerializer

    def get_queryset(self):
        qs = TripItem.objects.select_related('product')
        trip = self.request.query_params.get('trip')
        return qs.filter(trip_id=trip) if trip else qs

LINE_TOTAL = ExpressionWrapper(
    F('quantity') * F('price_paid'),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


class StatsView(APIView):
    def get(self, request):
        items = TripItem.objects.filter(trip__is_completed=True)

        monthly = (
            items.annotate(month=TruncMonth('trip__date'))
            .values('month')
            .annotate(total=Sum(LINE_TOTAL))
            .order_by('month')
        )

        by_category = (
            items.values('product__category__name')
            .annotate(total=Sum(LINE_TOTAL))
            .order_by('-total')
        )

        top_items = (
            items.values('product__id', 'product__name')
            .annotate(times_bought=Count('trip', distinct=True),
                      total_quantity=Sum('quantity'))
            .order_by('-times_bought')[:10]
        )

        return Response({
            'total_spent': items.aggregate(t=Sum(LINE_TOTAL))['t'] or 0,
            'trips_completed': Trip.objects.filter(is_completed=True).count(),
            'monthly_spending': [
                {'month': m['month'].strftime('%Y-%m'), 'total': m['total']}
                for m in monthly
            ],
            'spending_by_category': [
                {'category': c['product__category__name'] or 'Uncategorised',
                 'total': c['total']}
                for c in by_category
            ],
            'top_items': [
                {'product_id': t['product__id'], 'name': t['product__name'],
                 'times_bought': t['times_bought'],
                 'total_quantity': t['total_quantity']}
                for t in top_items
            ],
        })