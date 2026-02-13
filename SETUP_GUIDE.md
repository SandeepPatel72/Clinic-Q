# Clinic-Q OPD Management - Setup Guide

Complete step-by-step instructions to host Clinic-Q on your local machine or any server.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Local Development)](#quick-start-local-development)
3. [Database Setup](#database-setup)
4. [Configuration Files](#configuration-files)
5. [Running the Application](#running-the-application)
6. [Production Deployment](#production-deployment)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18.x or higher | https://nodejs.org/ |
| PostgreSQL | 14.x or higher | https://www.postgresql.org/download/ |
| npm | 9.x or higher | Comes with Node.js |
| Git | Latest | https://git-scm.com/ |

### Verify Installation
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
psql --version    # Should show psql 14.x or higher
```

---

## Quick Start (Local Development)

### Step 1: Clone or Download the Project
```bash
# If using git
git clone <your-repository-url>
cd clinic-q

# Or extract the downloaded ZIP file
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up PostgreSQL Database
See [Database Setup](#database-setup) section below.

### Step 4: Configure Environment Variables
Create a `.env` file in the project root:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/clinicq
```
Note: The application uses `DATABASE_URL` as the primary connection string. This single variable contains all database connection details.

### Step 5: Run the Application
```bash
# Development mode (with hot reload)
npx concurrently "node server.js" "npm run dev"
```

### Step 6: Access the Application
Open your browser and go to: `http://localhost:5000`

**How it works in development:**
- Vite dev server runs on port 5000 (frontend with hot reload)
- Express backend runs on port 3001 (API server)
- Vite automatically proxies `/api` and `/socket.io` requests to the backend

### Step 7: Login
Login requires 3 fields: **Mobile Number**, **Username**, and **Password**.

Credentials are configured in the `secretcred.json` file.

**Default Credentials:**

| Role | Mobile | Username | Password |
|------|--------|----------|----------|
| Doctor | 9033338800 | SANDEEP | 123 |
| Operator | 9033775500 | HETAL | 123 |

---

## Database Setup

### Option A: Using psql Command Line

1. **Connect to PostgreSQL**
```bash
psql -U postgres
```

2. **Create Database**
```sql
CREATE DATABASE clinicq;
\c clinicq
```

3. **Run Schema Script**
```bash
psql -U postgres -d clinicq -f database_schema.sql
```

### Option B: Using pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server
2. Right-click on "Databases" and select "Create" > "Database"
3. Name it `clinicq` and click "Save"
4. Right-click on the new database > "Query Tool"
5. Open `database_schema.sql` file and execute it

### Option C: Using Command in One Line
```bash
psql -U postgres -c "CREATE DATABASE clinicq;" && psql -U postgres -d clinicq -f database_schema.sql
```

### Verify Database Setup
```bash
psql -U postgres -d clinicq -c "\dt"
```
You should see 9 tables: `patient`, `visits`, `messages`, `events`, `plan_inquiries`, `complaint_tags`, `diagnosis_tags`, `medicine_tags`, `app_sett`

---

## Configuration Files

### 1. metadata.json
Customize your clinic name and app settings:
```json
{
  "name": "Clinic-Q OPD Management",
  "description": "OPD management system",
  "hospitalName": "Your Hospital Name Here",
  "appName": "Clinic-Q",
  "data_reset": "enable"
}
```
`data_reset` can be set to "enable" or "disable" to control visibility of the Reset Data button (Doctor role only).

### 2. secretcred.json
Login credentials configuration. Each user has a mobile number, username, password, and role:
```json
{
  "users": [
    {
      "username": "SANDEEP",
      "password": "123",
      "mobile": "9033338800",
      "role": "DOCTOR"
    },
    {
      "username": "HETAL",
      "password": "123",
      "mobile": "9033775500",
      "role": "OPERATOR"
    }
  ]
}
```
To add new users, add entries to the `users` array with the appropriate role (`DOCTOR` or `OPERATOR`).

### 3. OPDSTATUS.txt
Add OPD pause reasons (one per line). Supports multiple languages:
```
OPD Starts from 09:30am
LUNCH BREAK. Doctor will Return at 02:30pm
DOCTOR is in Operation. Please Wait
DOCTOR is Currently Not Available
```

### 4. vite.config.ts
For local development, the default config works. For production behind a proxy, you may need to adjust the server settings.

---

## Running the Application

### Development Mode
Runs both backend (Express) and frontend (Vite) with hot reload:
```bash
npx concurrently "node server.js" "npm run dev"
```
- Frontend (Vite): http://localhost:5000 (use this URL)
- Backend API: http://localhost:3001 (internal, proxied automatically)

### Production Mode

1. **Build the frontend**
```bash
npm run build
```
This creates a `dist` folder with the compiled frontend.

2. **Start the production server**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/clinicq node server.js
```
Access at: http://localhost:3001 (or set PORT env var to use a different port)

In production, the Express server serves both the API and the static frontend files.

---

## Production Deployment

### Option 1: VPS/Cloud Server (DigitalOcean, AWS, etc.)

1. **Set up the server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Configure PostgreSQL**
```bash
sudo -u postgres psql
CREATE USER clinicq_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE clinicq OWNER clinicq_user;
\q
```

3. **Clone and setup project**
```bash
git clone <your-repo-url> /var/www/clinicq
cd /var/www/clinicq
npm install
npm run build
```

4. **Set environment variables**
```bash
export DATABASE_URL="postgresql://clinicq_user:your_secure_password@localhost:5432/clinicq"
export PORT=5000
```
Add these to `/etc/environment` or create a `.env` file for persistence.

5. **Run database schema**
```bash
psql $DATABASE_URL -f database_schema.sql
```

6. **Start with PM2**
```bash
PORT=5000 pm2 start server.js --name clinicq
pm2 save
pm2 startup
```
Note: Set PORT=5000 if you want the app accessible on port 5000, otherwise it defaults to 3001.

### Option 2: Using Nginx as Reverse Proxy

1. **Install Nginx**
```bash
sudo apt install nginx
```

2. **Create Nginx config**
```bash
sudo nano /etc/nginx/sites-available/clinicq
```

3. **Add configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;  # Match your PORT env var
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;  # Match your PORT env var
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

4. **Enable and restart Nginx**
```bash
sudo ln -s /etc/nginx/sites-available/clinicq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://clinicq:password@db:5432/clinicq
      - PORT=5000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=clinicq
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=clinicq
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database_schema.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose up -d
```

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | Full PostgreSQL connection string | postgresql://user:pass@localhost:5432/clinicq |
| PORT | No | Backend server port (default: 3001) | 3001 |

**Note:** The application uses only `DATABASE_URL` to connect to PostgreSQL. The connection string format is:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

---

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U your_user -d clinicq -c "SELECT 1"
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Permission Denied Errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/clinicq
```

### Frontend Not Loading
1. Ensure you ran `npm run build` for production
2. Check that `NODE_ENV=production` is set
3. Verify the `dist` folder exists

### Socket.IO Connection Issues
- Ensure WebSocket is enabled in your reverse proxy config
- Check firewall allows WebSocket connections
- Verify the correct Socket.IO path in Nginx config

### Common Error Messages

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | PostgreSQL not running or wrong connection details |
| `relation does not exist` | Run `database_schema.sql` to create tables |
| `permission denied` | Check database user permissions |
| `CORS error` | Frontend and backend on different ports - check proxy config |

---

## Application Features (v1.50)

| Feature | Description |
|---------|-------------|
| **Queue Management** | Waiting, OPD, and Completed queues with real-time sync |
| **Patient Registration** | Register patients with mobile lookup for returning patients |
| **Doctor Consultation** | Add notes and medicines during consultation |
| **Real-time Chat** | Operator and Doctor can communicate about patients |
| **Statistics/Info Page** | View daily and overall clinic statistics |
| **Event Calendar** | Monthly/daily calendar with event types and reminders |
| **Patient History** | View complete visit history for any patient |
| **Patient Reports** | Search and export patient records with date filters and CSV export |
| **OPD Status Toggle** | Pause/resume OPD with configurable status messages |
| **Queue Display Screen** | Public TV display at /display URL for waiting room |
| **Login Persistence** | Token-based authentication with session persistence |
| **Resizable Dashboard** | Adjustable column widths on the dashboard |
| **Marketing Website** | Public website at /site/ with Home, About, Pricing, Contact pages |
| **Token-based Auth** | Secure authentication with bearer tokens |
| **Keyboard Shortcuts** | F2 for quick access, Ctrl+Enter for form submission |
| **Call Operator** | Doctor can send alert to Operator with sound notification |
| **Queue Reordering** | Up/Down buttons to reorder waiting queue |
| **Hospital Name Marquee** | Animated hospital name on display screen (configurable in metadata.json) |
| **Doctor Consultation Form** | Structured consultation with vitals, tag-based complaints/diagnosis, prescription table, advice, and follow-up date |
| **Print Prescription** | Generate printable A5-sized prescription from consultation data |
| **Data Reset** | Doctor can reset all patient/visit data from Report page (controlled via metadata.json) |
| **License Management** | Login page shows subscription expiry warning based on app_sett table |
| **Auto-complete Tags** | Complaints, diagnosis, and medicine names auto-suggest from usage history |

### Marketing Website

The marketing website is accessible at `/site/` and includes:
- **Home** (`/site/`) - Landing page with product overview
- **About** (`/site/about.html`) - About the product and team
- **Pricing** (`/site/pricing.html`) - Plans and pricing with inquiry form
- **Contact** (`/site/contact.html`) - Contact information

---

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review server logs: `pm2 logs clinicq`
3. Check browser console for frontend errors

---

## File Structure

```
clinic-q/
├── server.js              # Backend Express server
├── App.tsx                # Main React component
├── index.tsx              # React entry point
├── index.html             # HTML entry point
├── types.ts               # TypeScript type definitions
├── constants.tsx           # Application constants
├── components/            # React components
│   ├── Calendar.tsx       # Event calendar
│   ├── ChatModal.tsx      # Real-time chat modal
│   ├── DoctorConsultationForm.tsx  # Doctor consultation form
│   ├── Login.tsx          # Login component
│   ├── PatientCard.tsx    # Patient card display
│   ├── PatientForm.tsx    # Patient registration form
│   ├── PatientHistoryModal.tsx  # Patient history viewer
│   ├── PatientReport.tsx  # Patient reports with CSV export
│   ├── QueueColumn.tsx    # Queue column component
│   ├── QueueDisplay.tsx   # Waiting room display
│   └── Statistics.tsx     # Statistics/Info page
├── website/               # Marketing website
│   ├── index.html         # Home page
│   ├── about.html         # About page
│   ├── pricing.html       # Pricing page
│   └── contact.html       # Contact page
├── database_schema.sql    # PostgreSQL schema (9 tables)
├── database_backup.sql    # Database backup with data
├── metadata.json          # App configuration (hospital name, etc.)
├── secretcred.json        # Login credentials configuration
├── OPDSTATUS.txt          # OPD pause status messages
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── dist/                  # Production build (after npm run build)
```

---

**Version:** 1.50  
**Last Updated:** February 8, 2026
