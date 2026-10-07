# Attendance & Salary SaaS — Docker Deployment & Portability Guide

This guide describes how to run the Attendance & Salary SaaS application inside Docker containers and move the entire system (code, configuration, and database data) to another computer with minimal setup.

---

## Architecture Overview

The containerized stack consists of 3 services managed via `docker-compose.yml`:

```
                    +----------------------------------------+
                    |              Web Browser               |
                    +-------------------+--------------------+
                                        |
                 Port 3000              |         Port 4000
           (Next.js Web UI)             |     (NestJS REST API)
                    |                   |             |
                    v                   |             v
+-----------------------+               |   +-----------------------+
|  attendance_frontend  |               +-->|  attendance_backend   |
|   (Next.js 16 Alpine) |                   |    (NestJS Alpine)    |
+-----------------------+                   +-----------+-----------+
                                                        |
                                                        | Internal Docker Network
                                                        | (Port 5432, not published)
                                                        v
                                            +-----------------------+
                                            |  attendance_postgres  |
                                            | (PostgreSQL 16 Alpine)|
                                            +-----------+-----------+
                                                        |
                                                        v
                                            [ postgres_data volume ]
```

- **Frontend (`attendance_frontend`)**: Next.js 16 standalone build running on Node 20 Alpine (`PORT=3000`).
- **Backend (`attendance_backend`)**: NestJS API on Node 20 Alpine (`PORT=4000`), with fontconfig and `ttf-dejavu` for in-memory PDF payslip generation and automatic TypeORM migrations.
- **Database (`attendance_postgres`)**: PostgreSQL 16 Alpine with persistent data volume `postgres_data`. Exposed only within internal bridge network `app_network`.

---

## 1. Prerequisites

Before running the application, ensure the host machine has:
1. **Docker Desktop** (macOS / Windows) or **Docker Engine + Docker Compose v2** (Linux).
2. **Git** (to clone or pull repository updates).
3. **Bash shell** (standard on macOS/Linux, or Git Bash / WSL2 on Windows) to run backup/restore scripts.

---

## 2. Initial Setup (First Run)

### Step 1: Clone or Copy the Repository
```bash
git clone <repository-url> attendance-saas
cd attendance-saas
```

### Step 2: Configure Environment Variables
Copy the root `.env.example` template:
```bash
cp .env.example .env
```

Review `.env` and configure:
```env
# Database Credentials
DATABASE_USERNAME=srihari
DATABASE_PASSWORD=choose_a_strong_password
DATABASE_NAME=attendence_management

# Ports (change if 3000 or 4000 are already in use on your host)
PORT=4000
FRONTEND_PORT=3000

# Browser API endpoint (must point to backend port accessible by host browser)
NEXT_PUBLIC_API_URL=http://localhost:4000

# JWT Secrets (replace with strong random strings, min 32 characters)
JWT_ACCESS_SECRET=your_jwt_access_secret_key_change_in_production_min32chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_in_production_min32chars
JWT_REFRESH_EXPIRES_IN=7d

# Optional Integrations (leave defaults or fill your credentials)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Step 3: Build and Start Containers
```bash
docker compose up --build -d
```

### Step 4: Verify Service Health
Check container statuses:
```bash
docker compose ps
```
All 3 containers should be running with `(healthy)` status:
- `attendance_postgres` (healthy)
- `attendance_backend` (healthy)
- `attendance_frontend` (healthy)

Check endpoints:
- **Backend Health Check**: [http://localhost:4000/health](http://localhost:4000/health) → Returns `{"status":"ok","timestamp":"..."}`
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)

---

## 3. Database Migrations

Database schema changes are governed strictly by **TypeORM Migrations** (`synchronize: false`).

- When `attendance_backend` boots up, TypeORM automatically inspects `dist/database/migrations/*.js` against the `migrations` table and runs all pending migrations in order.
- To inspect migration execution logs:
  ```bash
  docker compose logs backend | grep -i migration
  ```
- No manual migration commands are required during routine deployment.

---

## 4. Moving the Application to Another Computer (Computer A -> Computer B)

Follow this exact step-by-step procedure to migrate the SaaS app and its database to a new machine without data loss:

### On Computer A (Source Machine)

1. **Ensure all pending operations are saved and containers are running:**
   ```bash
   docker compose ps
   ```

2. **Generate a fresh database backup:**
   ```bash
   ./scripts/backup-db.sh
   ```
   This creates a file in the `backups/` directory, for example:
   `backups/backup_attendence_management_20261007_153000.sql`

3. **Package the application for transfer:**
   Option A: Git + Backup File
   - Commit and push your code changes to Git (Git already ignores `.env` and `backups/`).
   - Transfer your `.env` file and the generated `.sql` file securely (e.g. via USB drive, SCP, or encrypted transfer).

   Option B: Full directory archive (excluding build artifacts)
   ```bash
   tar --exclude='client/node_modules' \
       --exclude='server/node_modules' \
       --exclude='client/.next' \
       --exclude='server/dist' \
       -czvf attendance-saas-migration.tar.gz .
   ```

### On Computer B (Destination Machine)

1. **Install Docker Desktop** on Computer B and start it.

2. **Extract or clone the project:**
   ```bash
   # If using archive:
   mkdir attendance-saas && cd attendance-saas
   tar -xzvf /path/to/attendance-saas-migration.tar.gz

   # Or if using git:
   git clone <repo-url> attendance-saas && cd attendance-saas
   ```

3. **Place the environment file and backup file:**
   - Put your configured `.env` file into the project root.
   - Place the backup `.sql` file into the `backups/` directory (e.g., `backups/backup_attendence_management_20261007_153000.sql`).

4. **Build and start the fresh containers:**
   ```bash
   docker compose up --build -d
   ```
   Wait 10-15 seconds for PostgreSQL and Backend to become healthy:
   ```bash
   docker compose ps
   ```

5. **Restore the database:**
   ```bash
   ./scripts/restore-db.sh backups/backup_attendence_management_20261007_153000.sql
   ```
   Type `y` when prompted to confirm the restore.

6. **Restart Backend to re-sync cache and connections:**
   ```bash
   docker compose restart backend
   ```

7. **Verify migration on Computer B:**
   - Open [http://localhost:3000](http://localhost:3000) in browser.
   - Log in with existing credentials from Computer A.
   - All companies, employees, attendance records, leaves, payrolls, and individual employee payments are fully intact.

---

## 5. Routine Backup and Restore Operations

### Create a Backup
```bash
./scripts/backup-db.sh
```
Backups are saved to `./backups/backup_<db_name>_<timestamp>.sql`.

### Restore a Backup
```bash
./scripts/restore-db.sh backups/backup_<db_name>_<timestamp>.sql
```
To run without interactive confirmation (e.g. in CI/CD or automation):
```bash
./scripts/restore-db.sh backups/backup_<db_name>_<timestamp>.sql --force
```

### Manual PostgreSQL CLI Access
If you ever need direct access to the database inside the container:
```bash
docker compose exec postgres psql -U srihari -d attendence_management
```

---

## 6. External Integrations Setup

### Razorpay Webhooks (Local Testing)
Razorpay needs a publicly reachable URL to send webhook events (e.g. `payment.captured`). When testing locally:
1. Start an ngrok tunnel to the backend port:
   ```bash
   ngrok http 4000
   ```
2. In Razorpay Dashboard, set Webhook URL to:
   `https://<your-ngrok-subdomain>.ngrok-free.app/payments/webhook`
3. Copy the Secret into `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=your_secret_from_dashboard
   ```
4. Restart backend:
   ```bash
   docker compose restart backend
   ```

### PDF Payslip Generation
The backend uses `pdfkit` to stream PDF payslips directly into memory buffers. The `server/Dockerfile` installs system fonts (`ttf-dejavu` and `fontconfig`) inside the Alpine container to ensure Unicode rendering and table typography generate consistently across all operating systems.

---

## 7. Useful Docker Management Commands

| Action | Command |
| :--- | :--- |
| **Start stack in background** | `docker compose up -d` |
| **Rebuild and start** | `docker compose up --build -d` |
| **Stop stack (preserves DB data)** | `docker compose down` |
| **View logs (all services)** | `docker compose logs -f` |
| **View logs (backend only)** | `docker compose logs -f backend` |
| **Restart backend** | `docker compose restart backend` |
| **Check service health** | `docker compose ps` |
| **Inspect database volume** | `docker volume inspect attendence-manager_postgres_data` |
| **Wipe database completely (CAUTION)** | `docker compose down -v` |

---

## 8. Troubleshooting

### Port Conflicts
- **Error**: `bind: address already in use` (e.g., port 3000 or 4000 already used by a local service).
- **Fix**: Update `PORT` or `FRONTEND_PORT` in `.env`:
  ```env
  PORT=4001
  FRONTEND_PORT=3001
  NEXT_PUBLIC_API_URL=http://localhost:4001
  ```
  Then rebuild frontend:
  ```bash
  docker compose up --build -d
  ```

### Database Connection Refused
- **Error**: `ECONNREFUSED` connecting to `postgres:5432`.
- **Fix**: Check PostgreSQL container logs:
  ```bash
  docker compose logs postgres
  ```
  Ensure `postgres` health check passes before backend starts (`depends_on: postgres: condition: service_healthy` handles this automatically).

### Browser Cannot Call Backend API
- **Symptom**: Frontend loads, but API requests fail with `NetworkError`.
- **Cause**: Browser runs on your host machine, so `NEXT_PUBLIC_API_URL` cannot be `http://backend:4000` (which is only resolvable inside the Docker network).
- **Fix**: Ensure `NEXT_PUBLIC_API_URL` is set to the host-accessible URL (e.g. `http://localhost:4000` or your host domain) and rebuild the frontend container (`docker compose up --build -d frontend`).

### Resetting to Clean State
If you want to completely reinitialize the database from scratch:
```bash
docker compose down -v
docker compose up --build -d
```
> **Warning**: `-v` removes the named volume `postgres_data`. Back up beforehand if you need existing data.
