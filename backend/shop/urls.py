from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, StoreViewSet, ProductViewSet,
    PriceHistoryViewSet, TripViewSet, TripItemViewSet, StatsView,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('stores', StoreViewSet, basename='store')
router.register('products', ProductViewSet, basename='product')
router.register('price-history', PriceHistoryViewSet, basename='price-history')
router.register('trips', TripViewSet, basename='trip')
router.register('items', TripItemViewSet, basename='item')

urlpatterns = [
    *router.urls,
    path('stats/', StatsView.as_view(), name='stats'),
]