from .base import *

SECRET_KEY = 'django-insecure-development-key-change-in-prod'

DEBUG = True

ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'educollab'),
        'USER': os.environ.get('POSTGRES_USER', 'educollab'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'educollab'),
        'HOST': os.environ.get('POSTGRES_HOST', 'db'),
        'PORT': 5432,
    }
}

# Fallback to SQLite if no Postgres config found (for non-docker local dev)
if not os.environ.get('POSTGRES_HOST'):
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Fallback for Channels (No Redis)
if not os.environ.get('REDIS_HOST'):
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }
# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'formatters': {
        'simple': {
            'format': '[%(asctime)s] %(levelname)s %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.users': {  # Specific logger for users app
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
