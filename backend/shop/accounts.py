import re

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

User = get_user_model()


def token_response(user):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user_id': user.id, 'username': user.username})


class AuthBase(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class RegisterView(AuthBase):
    def post(self, request):
        if not getattr(settings, 'ALLOW_REGISTRATION', True):
            return Response({'detail': 'Registration is closed.'}, status=403)

        username = str(request.data.get('username', '')).strip()
        password = str(request.data.get('password', ''))

        if not re.fullmatch(r'[A-Za-z0-9_.-]{3,30}', username):
            return Response(
                {'detail': 'Username must be 3-30 letters, numbers, dots, dashes or underscores.'},
                status=400)
        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': 'That username is taken.'}, status=400)
        try:
            validate_password(password)
        except ValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)

        return token_response(User.objects.create_user(username=username, password=password))


class LoginView(AuthBase):
    def post(self, request):
        user = authenticate(
            username=str(request.data.get('username', '')).strip(),
            password=str(request.data.get('password', '')),
        )
        if user is None:
            return Response({'detail': 'Wrong username or password.'}, status=400)
        return token_response(user)


class ProfileView(APIView):
    def patch(self, request):
        user = request.user
        current_password = str(request.data.get('current_password', ''))
        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=400)

        username = str(request.data.get('username', user.username)).strip()
        if not re.fullmatch(r'[A-Za-z0-9_.-]{3,30}', username):
            return Response(
                {'detail': 'Username must be 3-30 letters, numbers, dots, dashes or underscores.'},
                status=400,
            )
        if User.objects.filter(Q(username__iexact=username), ~Q(pk=user.pk)).exists():
            return Response({'detail': 'That username is taken.'}, status=400)

        new_password = str(request.data.get('new_password', ''))
        if new_password:
            try:
                validate_password(new_password, user=user)
            except ValidationError as e:
                return Response({'detail': ' '.join(e.messages)}, status=400)

        user.username = username
        if new_password:
            user.set_password(new_password)
        user.save()
        return Response({'username': user.username})