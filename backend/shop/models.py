from decimal import Decimal
from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Store(models.Model):
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=150)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
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


class PriceHistory(models.Model):
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


class Trip(models.Model):
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


class TripItem(models.Model):
    trip = models.ForeignKey(
        Trip, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('1'))
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def line_total(self):
        return self.quantity * self.price_paid

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'