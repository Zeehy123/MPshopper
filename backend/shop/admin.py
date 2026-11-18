from django.contrib import admin
from .models import Category, Store, Product, PriceHistory, Trip, TripItem

admin.site.register([Category, Store, Product, PriceHistory, Trip, TripItem])