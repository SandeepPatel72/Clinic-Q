# Clinic-Q — Deployment Guide

Three ways to run Clinic-Q. Pick the one that matches your setup:

| Scenario | Best For |
|----------|----------|
| [Local Machine with Docker](#option-a-local-machine-docker-desktop) | Developer laptop, clinic PC with Docker Desktop |
| [Cloud Server with Docker](#option-b-cloud-server-with-docker) | AWS, DigitalOcean, Hostinger VPS |
| [Cloud Server without Docker](#option-c-cloud-server-without-docker) | Any Linux VPS with Node.js + PostgreSQL |

---

## Before You Start — Edit These 3 Files

Regardless of which option you choose, first configure these files:

### 1. `.env` — Database password and port
```bash
cp .env.example .env
```
Open `.env` and set `DB_PASSWORD` to something strong. Keep `DATABASE_URL` matching it.

### 2. `secretcred.json` — Login credentials and subscription
```json
{
  "users": [
    { "username": "DOCTOR_NAME", "password": "yourpassword", "mobile": "9999999999", "role": "DOCTOR" },
    { "username": "OPERATOR_NAME", "password": "yourpassword", "mobile": "8888888888", "role": "OPERATOR" }
  ],
  "subscription": {
    "start_date": "2026-01-01",
    "end_date": "2027-01-01",
    "recharge_value": 900,
    "day_count": 365,
    "number_of_days": 365
  }
}
```

### 3. `metadata.json` — Hospital name
```json
{
  "hospitalName": "YOUR HOSPITAL NAME",
  "appName": "Clinic-Q",
  "data_reset": "enable"
}
```

---

## Option A: Local Machine (Docker Desktop)

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
# 1. Extract/clone the project, enter the folder
cd Clinic-Q

# 2. Edit .env, secretcred.json, metadata.json (see above)

# 3. Start everything
docker compose up -d --build
```

Open: **http://localhost:3001**

That's it. Docker handles Postgres, app build, and database setup automatically.

---

## Option B: Cloud Server with Docker

**Requirements:** A VPS/cloud server with Docker + Docker Compose installed.

### Install Docker on Ubuntu/Debian
```bash
curl -fsSL https://get.docker.com | sh
```

### Deploy
```bash
# Upload your project folder to the server, then:
cd Clinic-Q

# Edit .env, secretcred.json, metadata.json

docker compose up -d --build
```

Open: **http://your-server-ip:3001**

### Open the firewall port

**AWS EC2:** Go to Security Groups → Add Inbound Rule → TCP port 3001

**Ubuntu UFW:**
```bash
sudo ufw allow 3001/tcp
```

**Hostinger / CentOS (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp && sudo firewall-cmd --reload
```

---

## Option C: Cloud Server without Docker

**Requirements:** Ubuntu/Debian VPS with Node.js 18+ and PostgreSQL 14+.

### 1. Install dependencies
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# PM2 (keeps app running after reboot)
sudo npm install -g pm2
```

### 2. Create database
```bash
sudo -u postgres psql -c "CREATE USER clinicq WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE clinicq OWNER clinicq;"
```

### 3. Upload and build
```bash
cd Clinic-Q
npm install
npm run build
```

### 4. Configure .env
```bash
cp .env.example .env
```

Edit `.env` — change `DATABASE_URL` to point to your local Postgres:
```
DATABASE_URL=postgresql://clinicq:yourpassword@localhost:5432/clinicq
PORT=3001
```

### 5. Import database schema
```bash
psql $DATABASE_URL -f database_schema.sql
```

### 6. Start with PM2
```bash
pm2 start server.js --name clinicq
pm2 save
pm2 startup
```

Open: **http://your-server-ip:3001**

---

## Use a Domain with Nginx (Optional)

If you want `http://clinic.yourhospital.com` instead of IP:port:

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/clinicq
```

Paste:
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
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/clinicq /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

For HTTPS (free SSL):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d clinic.yourhospital.com
```

---

## Application URLs

| URL | Description |
|-----|-------------|
| `http://server:3001` | Main app (login required) |
| `http://server:3001/display` | Waiting room queue display (no login) |
| `http://server:3001/site/` | Marketing website |

---

## Docker: Useful Commands

```bash
# View live logs
docker compose logs -f app

# Stop everything
docker compose down

# Restart app only
docker compose restart app

# Rebuild after code changes
docker compose up -d --build
```

---

## Backup Your Data (Docker)

```bash
# Export
docker compose exec db pg_dump -U clinicq clinicq > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260226.sql | docker compose exec -T db psql -U clinicq clinicq
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't open in browser | Open port 3001 in firewall |
| App won't start | `docker compose logs app` or `pm2 logs clinicq` |
| Database error | Check `DB_PASSWORD` in `.env` matches `DATABASE_URL` |
| Login fails | Check `secretcred.json` — mobile, username, password must match exactly |
| OPD status options empty | Check `OPDSTATUS.txt` exists in project folder |

---

**Clinic-Q v1.50** | Last Updated: March 7, 2026
