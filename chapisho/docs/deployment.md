# Deployment Guide

## Prerequisites

- Python 3.12+
- PostgreSQL (production) or SQLite (development)
- Africa's Talking account (for SMS)
- A web server (Nginx + Gunicorn recommended)

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | — | Django secret key (generate with `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`) |
| `DEBUG` | No | `True` | Set to `False` in production |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DATABASE_URL` | No | `sqlite:///db.sqlite3` | Database connection string (PostgreSQL: `postgres://user:pass@host:5432/dbname`) |
| `AFRICASTALKING_USERNAME` | No | `sandbox` | Africa's Talking username |
| `AFRICASTALKING_API_KEY` | No | — | Africa's Talking API key |

## Production Setup

### 1. Database

For production, use PostgreSQL:

```bash
# Install PostgreSQL, then create database and user
createdb chapisho
# Set DATABASE_URL in .env:
# DATABASE_URL=postgres://user:password@localhost:5432/chapisho
```

### 2. Install Dependencies

```bash
cd chapisho
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

Static files will be collected to `staticfiles/` and served by Whitenoise.

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Gunicorn

```bash
gunicorn chapisho.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### 7. Nginx (recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/chapisho/staticfiles/;
    }

    location /media/ {
        alias /path/to/chapisho/media/;
    }
}
```

## Development

```bash
cd chapisho
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## WeasyPrint Dependencies

WeasyPrint requires system libraries. On Ubuntu/Debian:

```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
```

On production servers, ensure these are installed for PDF generation to work.

## Static Files

Whitenoise serves static files automatically in production. No separate static server is needed, though Nginx can be configured to serve them directly for better performance.

## SMS Configuration

To enable SMS sending:

1. Sign up at [Africa's Talking](https://africastalking.com/)
2. Get your username and API key from the dashboard
3. Set `AFRICASTALKING_USERNAME` and `AFRICASTALKING_API_KEY` in `.env`
4. Set `sms_sender_id` in the business settings page (Mipangilio)

Without configuration, the SMS page will show a warning but the app will still function.

## Security Notes

- Django's `SECRET_KEY` must be a unique, unpredictable value
- Set `DEBUG=False` and configure `ALLOWED_HOSTS` in production
- Use HTTPS in production
- The `db.sqlite3` file is gitignored — use PostgreSQL for production
- Africa's Talking API key should be kept secret
