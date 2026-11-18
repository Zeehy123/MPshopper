from decimal import Decimal

from rest_framework import serializers
from .models import Category, Store, Product, PriceHistory, Trip, TripItem


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ['id', 'name', 'location']


class PriceHistorySerializer(serializers.ModelSerializer):
    store_name = serializers.StringRelatedField(source='store', read_only=True)

    class Meta:
        model = PriceHistory
        fields = ['id', 'product', 'store', 'store_name', 'price', 'recorded_at']
        read_only_fields = ['recorded_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.StringRelatedField(
        source='category', read_only=True)
    previous_price = serializers.SerializerMethodField()
    price_trend = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'image', 'category', 'category_name', 'unit',
            'default_quantity', 'current_price', 'previous_price',
            'price_trend', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_previous_price(self, obj):
        # history is newest-first, so index 1 is the price before the current one
        prices = list(obj.price_history.values_list('price', flat=True)[:2])
        return prices[1] if len(prices) > 1 else None

    def get_price_trend(self, obj):
        previous = self.get_previous_price(obj)
        if previous is None or previous == obj.current_price:
            return 'same'
        return 'up' if obj.current_price > previous else 'down'


class TripItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    product_image = serializers.ImageField(
        source='product.image', read_only=True)
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = TripItem
        fields = [
            'id', 'trip', 'product', 'product_name', 'product_unit',
            'product_image', 'quantity', 'price_paid', 'line_total',
        ]
        extra_kwargs = {'price_paid': {'required': False}}

    def create(self, validated_data):
        # if no price is sent, use the product's current price
        if 'price_paid' not in validated_data:
            validated_data['price_paid'] = validated_data['product'].current_price
        return super().create(validated_data)
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be more than zero.')
        return value

    def validate(self, data):
        trip = data.get('trip') or getattr(self.instance, 'trip', None)
        if trip and trip.is_completed:
            raise serializers.ValidationError(
                'This trip is already completed and cannot be changed.')
        return data


class TripSerializer(serializers.ModelSerializer):
    store_name = serializers.StringRelatedField(source='store', read_only=True)
    items = TripItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)
    over_budget = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    budget_status = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id', 'store', 'store_name', 'date', 'budget', 'is_completed',
            'items', 'total', 'over_budget', 'remaining', 'budget_status',
        ]

    def get_over_budget(self, obj):
        return obj.budget is not None and obj.total > obj.budget

    def get_remaining(self, obj):
        if obj.budget is None:
            return None
        return obj.budget - obj.total

    def get_budget_status(self, obj):
        # none -> no budget set, ok -> under 90%, near -> 90-100%, over -> exceeded
        if not obj.budget:
            return 'none'
        if obj.total > obj.budget:
            return 'over'
        if obj.total >= obj.budget * Decimal('0.9'):
            return 'near'
        return 'ok'