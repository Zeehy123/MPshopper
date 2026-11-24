"""
Django settings for the Grocery Shopper API.

Every secret and every address comes from environment variables, so the same
code runs on your laptop (values in backend/.env) and on the server.
"""
import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')  # local development only; the file is not in git


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name):
    return [v.strip() for v in os.environ.get(name, '').split(',') if v.strip()]


# ---------- core ----------
DEBUG = env_bool('DJANGO_DEBUG', False)

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'local-development-only-not-a-secret'
    else:
        raise ImproperlyConfigured('Set the DJANGO_SECRET_KEY environment variable.')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS')
RENDER_HOST = os.environ.get('RENDER_EXTERNAL_HOSTNAME')  # set automatically by Render
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)
if DEBUG:
    ALLOWED_HOSTS += ['localhost', '127.0.0.1']

# ---------- apps ----------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'shop',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves the admin's CSS in production
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ---------- REST framework ----------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_RATES': {'auth': '20/min'},
}
if not DEBUG:
    # no browsable API on the public server
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = ['rest_framework.renderers.JSONRenderer']

ALLOW_REGISTRATION = env_bool('ALLOW_REGISTRATION', True)

# ---------- database ----------
if not os.environ.get('DATABASE_URL'):
    raise ImproperlyConfigured(
        'Set DATABASE_URL, e.g. postgres://postgres:PASSWORD@127.0.0.1:5432/grocery_shopper'
    )
DATABASES = {
    'default': dj_database_url.config(conn_max_age=60, conn_health_checks=True)
}
# needed when the database sits behind a connection pooler (Neon's default)
DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------- language and time ----------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Lagos'
USE_I18N = True
USE_TZ = True

# ---------- static and media files ----------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {
        'BACKEND': (
            'django.contrib.staticfiles.storage.StaticFilesStorage'
            if DEBUG
            else 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        )
    },
}

# Product pictures live on Cloudinary in production (the server's disk is wiped on every
# deploy). With no CLOUDINARY_URL set, pictures are saved in backend/media instead.
CLOUDINARY_ENABLED = bool(os.environ.get('CLOUDINARY_URL'))

# -- browser access (CORS / CSRF) ---
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS')
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')
if RENDER_HOST:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_HOST}')
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:4173', 'http://127.0.0.1:4173',
    ]

# ---------- HTTPS hardening (production only) ----------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 3600  # raise to a year once everything works
    SECURE_REFERRER_POLICY = 'same-origin'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
