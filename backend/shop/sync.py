import logging
import uuid
from datetime import timedelta
from decimal import Decimal

import cloudinary.uploader
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Category, Store, Product, PriceHistory, Trip, TripItem, Tombstone,
)

logger = logging.getLogger(__name__)

# parents come before children, so references always resolve
MODELS = {
    'categories': Category,
    'stores': Store,
    'products': Product,
    'priceHistory': PriceHistory,
    'trips': Trip,
    'tripItems': TripItem,
}
RELATED = {
    'products': ('category',),
    'priceHistory': ('product', 'store'),
    'trips': ('store',),
    'tripItems': ('trip', 'product'),
}


class SyncError(Exception):
    pass


def dec(value):
    return None if value is None else Decimal(str(value)).quantize(Decimal('0.01'))


def ref(model, cid, owner):
    if not cid:
        return None
    obj = model.objects.filter(client_id=cid, owner=owner).first()
    if obj is None:
        raise SyncError(f'{model.__name__} {cid} is not on the server yet')
    return obj


def ref_soft(model, cid, owner):
    # like ref(), but a missing record gives None instead of an error
    # (a product deleted before it ever reached the server)
    if not cid:
        return None
    return model.objects.filter(client_id=cid, owner=owner).first()


def dt(value):
    parsed = parse_datetime(value or '')
    if parsed is None:
        raise SyncError(f'Bad date: {value!r}')
    return parsed


def fields(table, w, owner):
    if table == 'categories':
        return {'name': w['name']}
    if table == 'stores':
        return {'name': w['name'], 'location': w.get('location') or ''}
    if table == 'products':
        return {
            'name': w['name'], 'unit': w['unit'],
            'category': ref(Category, w.get('category_id'), owner),
            'default_quantity': dec(w['default_quantity']),
            'current_price': dec(w['current_price']),
        }
    if table == 'priceHistory':
        return {
            'product': ref(Product, w['product_id'], owner),
            'store': ref(Store, w.get('store_id'), owner),
            'price': dec(w['price']), 'recorded_at': dt(w['recorded_at']),
        }
    if table == 'trips':
        return {
            'store': ref(Store, w.get('store_id'), owner), 'date': dt(w['date']),
            'budget': dec(w.get('budget')), 'is_completed': bool(w['is_completed']),
        }
    if table == 'tripItems':
        product = ref_soft(Product, w.get('product_id'), owner)
        return {
            'trip': ref(Trip, w['trip_id'], owner),
            'product': product,
            'product_name': (
                w.get('product_name') or (product.name if product else '')
            )[:150],
            'product_unit': (
                w.get('product_unit') or (product.unit if product else '')
            )[:30],
            'quantity': dec(w['quantity']), 'price_paid': dec(w['price_paid']),
            'is_checked': bool(w.get('is_checked', w.get('is_bought', False))),
            'created_at': dt(w['created_at']),
        }
    raise SyncError(f'Unknown table {table}')


def upsert(table, w, owner):
    model = MODELS[table]
    cid = uuid.UUID(w['id'])
    data = fields(table, w, owner)
    obj = model.objects.filter(client_id=cid, owner=owner).first()
    if obj is None:
        model.objects.create(client_id=cid, owner=owner, **data)
        return
    client_time = parse_datetime(w.get('updated_at') or '')
    if client_time and obj.modified_at > client_time:
        return  # the server copy is newer; it comes back on the next pull
    for key, value in data.items():
        setattr(obj, key, value)
    obj.save()


def remove(table, cid, owner):
    model = MODELS[table]
    cid = uuid.UUID(cid)
    obj = model.objects.filter(client_id=cid, owner=owner).first()
    if obj:
        image_id = None
        if table == 'products' and obj.image_url and settings.CLOUDINARY_ENABLED:
            image_id = f'grocery/products/{obj.client_id}'
        try:
            obj.delete()
        except ProtectedError:
            return
        if image_id:
            try:  # free the picture; if this fails it is only an orphaned file
                cloudinary.uploader.destroy(image_id, invalidate=True)
            except Exception:
                pass
    Tombstone.objects.create(table=table, client_id=cid, owner=owner)


def product_image(product, request):
    if product.image_url:
        return product.image_url
    if product.image:
        return request.build_absolute_uri(product.image.url)
    return None


def wire(table, o, request):
    cid = lambda x: str(x.client_id) if x else None
    out = {'id': str(o.client_id), 'modified_at': o.modified_at.isoformat()}
    if table == 'categories':
        out.update(name=o.name)
    elif table == 'stores':
        out.update(name=o.name, location=o.location)
    elif table == 'products':
        out.update(
            name=o.name, unit=o.unit, category_id=cid(o.category),
            default_quantity=str(o.default_quantity),
            current_price=str(o.current_price),
            image=product_image(o, request),
        )
    elif table == 'priceHistory':
        out.update(
            product_id=cid(o.product), store_id=cid(o.store),
            price=str(o.price), recorded_at=o.recorded_at.isoformat(),
        )
    elif table == 'trips':
        out.update(
            store_id=cid(o.store), date=o.date.isoformat(),
            budget=None if o.budget is None else str(o.budget),
            is_completed=o.is_completed,
        )
    elif table == 'tripItems':
        out.update(
            trip_id=cid(o.trip), product_id=cid(o.product),
            product_name=o.product_name, product_unit=o.product_unit,
            quantity=str(o.quantity), price_paid=str(o.price_paid),
            is_checked=o.is_checked,
            created_at=o.created_at.isoformat(),
        )
    return out


class SyncPushView(APIView):
    def post(self, request):
        owner = request.user
        upserts = request.data.get('upserts', {})
        deletes = request.data.get('deletes', [])
        try:
            with transaction.atomic():  # all changes are saved, or none
                for table in MODELS:
                    for w in upserts.get(table, []):
                        upsert(table, w, owner)
                for d in deletes:
                    remove(d['table'], d['id'], owner)
        except (SyncError, IntegrityError, KeyError, ValueError, TypeError) as e:
            logger.warning('Sync push rejected for user %s: %s', owner.pk, e)
            return Response({'detail': f'Sync rejected: {e}'}, status=400)
        return Response({'ok': True})


class SyncPullView(APIView):
    def get(self, request):
        owner = request.user
        since = parse_datetime(request.query_params.get('since') or '')
        # a small overlap, so a record saved while we read is never missed
        cursor = timezone.now() - timedelta(seconds=5)

        changes = {}
        for table, model in MODELS.items():
            qs = model.objects.filter(owner=owner)
            if table in RELATED:
                qs = qs.select_related(*RELATED[table])
            if since:
                qs = qs.filter(modified_at__gt=since)
            changes[table] = [wire(table, o, request) for o in qs.order_by('modified_at')]

        tombs = Tombstone.objects.filter(owner=owner)
        if since:
            tombs = tombs.filter(deleted_at__gt=since)

        return Response({
            'cursor': cursor.isoformat(),
            'changes': changes,
            'deleted': [{'table': t.table, 'id': str(t.client_id)} for t in tombs],
        })


class ProductImageView(APIView):
    def post(self, request, client_id):
        product = Product.objects.filter(client_id=client_id, owner=request.user).first()
        if product is None:
            return Response({'detail': 'Product is not on the server yet.'}, status=404)
        image = request.FILES.get('image')
        if image is None:
            return Response({'detail': 'No image sent.'}, status=400)
        if not (image.content_type or '').startswith('image/'):
            return Response({'detail': 'File must be an image.'}, status=400)
        if image.size > 5 * 1024 * 1024:
            return Response({'detail': 'Image must be under 5 MB.'}, status=400)
        if settings.CLOUDINARY_ENABLED:
            try:
                result = cloudinary.uploader.upload(
                    image,
                    folder='grocery/products',
                    public_id=str(product.client_id),
                    overwrite=True,
                    invalidate=True,
                    resource_type='image',
                    # shrink on the way in, so phone photos don't eat the free allowance
                    transformation=[
                        {'width': 800, 'height': 800, 'crop': 'limit'},
                        {'quality': 'auto'},
                    ],
                )
            except Exception as e:  # network or account problem; the app retries later
                return Response({'detail': f'Image upload failed: {e}'}, status=502)
            product.image_url = result['secure_url']
        else:
            product.image = image
        product.save()
        return Response({'image': product_image(product, request)})