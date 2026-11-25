from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone


class SyncModel(models.Model):
    owner=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.CASCADE,related_name="+",editable=False,)
    client_id = models.UUIDField(null=True, blank=True, unique=True, editable=False)
    modified_at = models.DateTimeField(default=timezone.now, db_index=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.client_id is None:
            self.client_id = uuid.uuid4()
        self.modified_at = timezone.now()
        super().save(*args, **kwargs)
class Category(SyncModel):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'categories'
        constraints=[models.UniqueConstraint(fields=['owner','name'],name='uniq_category_owner_name'),]

    def __str__(self):
        return self.name

class Tombstone(models.Model):
    owner=models.ForeignKey(
        settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.CASCADE,related_name='+'
    )
    table=models.CharField(max_length=30)
    client_id=models.UUIDField()
    deleted_at=models.DateTimeField(default=timezone.now, db_index=True)

class Store(SyncModel):
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name


class Product(SyncModel):
    name = models.CharField(max_length=150)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, default='')  # picture hosted on Cloudinary
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='products',
    )
    unit = models.CharField(max_length=30)  # kg, bag, tin, litre...
    default_quantity = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('1'))
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} ({self.unit})'


class PriceHistory(SyncModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='price_history')
    store = models.ForeignKey(
        Store, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f'{self.product.name}: {self.price} on {self.recorded_at:%Y-%m-%d}'


class Trip(SyncModel):
    store = models.ForeignKey(
        Store, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    budget = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)
    is_completed = models.BooleanField(default=False)  # False = still the cart

    class Meta:
        ordering = ['-date']

    @property
    def total(self):
        return sum((item.line_total for item in self.items.all()), Decimal('0'))

    def __str__(self):
        status = 'done' if self.is_completed else 'cart'
        return f'Trip {self.pk} ({status})'


class TripItem(SyncModel):
    trip = models.ForeignKey(
        Trip, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('1'))
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    is_bought = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    @property
    def line_total(self):
        return self.quantity * self.price_paid

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'