from django.db import router
from django.urls import path
from .views import (
    CategoryViewSet, StoreViewSet, ProductViewSet,
    PriceHistoryViewSet, TripViewSet, TripItemViewSet, StatsView,
)



urlpatterns = router.urls + [
    path('stats/', StatsView.as_view()),
]