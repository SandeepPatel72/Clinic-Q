# Clinic-Q — Docker Deployment Guide

Deploy Clinic-Q on any server (AWS, Hostinger VPS, DigitalOcean, local server) using Docker.

---

## Prerequisites

Install these on your server first:

- **Docker** — https://docs.docker.com/engine/install/
- **Docker Compose** — https://docs.docker.com/compose/install/

Verify:
```bash
docker --version
docker compose version
```

---

## 5-Step Quick Deploy

### Step 1 — Download the project

Download the ZIP from Replit (Files panel → ⋮ menu → Download as ZIP), upload it to your server and extract:

```bash
unzip Clinic-Q.zip -d Clinic-Q
cd Clinic-Q
```

Or if you have Git:
```bash
git clone <your-repo-url> Clinic-Q
cd Clinic-Q
```

---

### Step 2 — Configure login credentials

Edit `secretcred.json` to set your usernames, passwords, and subscription dates:

```json
{
  "users": [
    {
      "username": "DOCTOR_USERNAME",
      "password": "your_password",
      "mobile": "9999999999",
      "role": "DOCTOR"
    },
    {
      "username": "OPERATOR_USERNAME",
      "password": "your_password",
      "mobile": "8888888888",
      "role": "OPERATOR"
    }
  ],
  "subscription": {
    "start_date": "2026-01-01",
    "recharge_value": 900,
    "day_count": 365,
    "number_of_days": 365,
    "end_date": "2027-01-01"
  }
}
```

---

### Step 3 — Set your hospital name

Edit `metadata.json`:

```json
{
  "name": "Clinic-Q OPD Management",
  "description": "OPD management system",
  "hospitalName": "YOUR HOSPITAL NAME",
  "appName": "Clinic-Q",
  "data_reset": "enable"
}
```

---

### Step 4 — Set the database password

Copy the example environment file and set a strong password:

```bash
cp docker.env.example docker.env
nano docker.env
```

Inside `docker.env`, change `DB_PASSWORD`:

```
DB_PASSWORD=MySecurePassword123
PORT=3001
```

> `docker.env` is git-ignored. Never commit it.

---

### Step 5 — Start the app

```bash
docker compose up -d --build
```

This will:
- Start a PostgreSQL 16 database container
- Build and start the Clinic-Q app container
- Automatically create all database tables on first run

Open in your browser:
```
http://your-server-ip:3001
```

---

## Application URLs

| URL | Description |
|-----|-------------|
| `http://server-ip:3001` | Main app (login required) |
| `http://server-ip:3001/display` | Queue Display for waiting room TV |
| `http://server-ip:3001/site/` | Marketing website |

---

## Common Commands

```bash
# Start in background
docker compose up -d

# Stop everything
docker compose down

# View live logs
docker compose logs -f app

# Rebuild after code changes
docker compose up -d --build

# Restart app only (no rebuild)
docker compose restart app
```

---

## Firewall: Open Port 3001

### AWS EC2
1. Go to EC2 → Security Groups → your instance's group
2. Add Inbound Rule: Type = Custom TCP, Port = 3001, Source = 0.0.0.0/0

### Ubuntu UFW
```bash
sudo ufw allow 3001/tcp
```

### Hostinger VPS (CentOS/Firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

---

## Use a Domain with Nginx (Optional)

If you want to use a domain like `clinic.yourhospital.com` instead of an IP:port, install Nginx and add this config:

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/clinicq
```

```nginx
server {
    listen 80;
    server_name clinic.yourhospital.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/clinicq /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

For HTTPS, use Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d clinic.yourhospital.com
```

---

## Backup Your Data

Database data is stored in a Docker volume (`pgdata`). To take a backup:

```bash
docker compose exec db pg_dump -U clinicq clinicq > backup_$(date +%Y%m%d).sql
```

To restore:
```bash
cat backup_20260226.sql | docker compose exec -T db psql -U clinicq clinicq
```

---

## Updating the App

When you get a new version of Clinic-Q:

```bash
# Upload new files, then:
docker compose up -d --build
```

The database is preserved in the Docker volume — patient data is safe.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't open in browser | Check firewall — open port 3001 |
| App won't start | Run `docker compose logs app` to see error |
| Database error | Run `docker compose logs db` — check DB_PASSWORD matches |
| Changes not showing | Run `docker compose up -d --build` to rebuild |

---

**Clinic-Q v1.50** | Last Updated: February 26, 2026
