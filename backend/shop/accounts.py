import re

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

User = get_user_model()

USERNAME_RE = r'[A-Za-z0-9_.-]{3,30}'
USERNAME_HELP = 'Username must be 3-30 letters, numbers, dots, dashes or underscores.'


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

        if not re.fullmatch(USERNAME_RE, username):
            return Response({'detail': USERNAME_HELP}, status=400)
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


class ProfileBase(APIView):
    # needs a logged-in user (the default); the throttle slows down password guessing
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class ProfileView(ProfileBase):
    def get(self, request):
        return Response({'user_id': request.user.id, 'username': request.user.username})

    def patch(self, request):
        username = str(request.data.get('username', '')).strip()
        if not re.fullmatch(USERNAME_RE, username):
            return Response({'detail': USERNAME_HELP}, status=400)
        taken = User.objects.filter(username__iexact=username).exclude(pk=request.user.pk)
        if taken.exists():
            return Response({'detail': 'That username is taken.'}, status=400)
        request.user.username = username
        request.user.save(update_fields=['username'])
        return Response({'user_id': request.user.id, 'username': request.user.username})


class PasswordView(ProfileBase):
    def post(self, request):
        current = str(request.data.get('current_password', ''))
        new = str(request.data.get('new_password', ''))
        user = request.user

        if not user.check_password(current):
            return Response({'detail': 'Your current password is wrong.'}, status=400)
        if new == current:
            return Response({'detail': 'Choose a password different from the current one.'}, status=400)
        try:
            validate_password(new, user=user)
        except ValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)

        user.set_password(new)
        user.save(update_fields=['password'])
        # sign every other device out; this one gets the new token in the reply
        Token.objects.filter(user=user).delete()
        return token_response(user)
