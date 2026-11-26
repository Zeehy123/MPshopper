from django.urls import path
from .accounts import RegisterView, LoginView, ProfileView, PasswordView
from .sync import SyncPushView, SyncPullView, ProductImageView

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/profile/', ProfileView.as_view()),
    path('auth/password/', PasswordView.as_view()),
    path('sync/push/', SyncPushView.as_view()),
    path('sync/pull/', SyncPullView.as_view()),
    path('sync/image/<uuid:client_id>/', ProductImageView.as_view()),
]