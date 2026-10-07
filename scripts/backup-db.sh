#!/usr/bin/env bash
# ==============================================================================
# Attendance & Salary SaaS — Database Backup Script
# ==============================================================================
# Creates a clean, timestamped PostgreSQL dump from the running docker container.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env if present
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  # Export variables from .env ignoring comments
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$')
  set +a
fi

DB_USER="${DATABASE_USERNAME:-srihari}"
DB_NAME="${DATABASE_NAME:-attendence_management}"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "=================================================="
echo " Starting Database Backup"
echo "=================================================="
echo "Container Service: postgres"
echo "Database:          $DB_NAME"
echo "User:              $DB_USER"
echo "Destination:       $BACKUP_FILE"
echo "--------------------------------------------------"

# Check if postgres service is running
if ! docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres --status running -q 2>/dev/null | grep -q .; then
  echo "ERROR: The 'postgres' container is not running."
  echo "Please start the services first using: docker compose up -d"
  exit 1
fi

echo "Dumping database schema and data..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILE"

FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"

echo "--------------------------------------------------"
echo " Backup completed successfully!"
echo " File: $BACKUP_FILE"
echo " Size: $FILE_SIZE"
echo " Date: $(date)"
echo "=================================================="
