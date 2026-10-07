#!/usr/bin/env bash
# ==============================================================================
# Attendance & Salary SaaS — Database Restore Script
# ==============================================================================
# Restores a PostgreSQL dump into the running docker container.
# Usage: ./scripts/restore-db.sh <path_to_backup.sql> [--force]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Validate arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path_to_backup.sql> [--force]"
  echo ""
  echo "Example:"
  echo "  $0 backups/backup_attendence_management_20261007_120000.sql"
  exit 1
fi

RESTORE_FILE="$1"
FORCE_FLAG="${2:-}"

if [[ ! -f "$RESTORE_FILE" ]]; then
  echo "ERROR: Backup file '$RESTORE_FILE' does not exist."
  exit 1
fi

# Load environment variables from .env if present
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$')
  set +a
fi

DB_USER="${DATABASE_USERNAME:-srihari}"
DB_NAME="${DATABASE_NAME:-attendence_management}"

echo "=================================================="
echo " Database Restore Tool"
echo "=================================================="
echo "Backup File: $RESTORE_FILE"
echo "Target DB:   $DB_NAME"
echo "Target User: $DB_USER"
echo "--------------------------------------------------"

# Confirmation prompt unless --force is specified
if [[ "$FORCE_FLAG" != "--force" ]]; then
  echo "WARNING: This will overwrite existing data in '$DB_NAME'."
  read -r -p "Are you sure you want to proceed? [y/N]: " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[yY]([eE][sS])?$ ]]; then
    echo "Restore cancelled by user."
    exit 0
  fi
fi

# Check if postgres container is running
if ! docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres --status running -q 2>/dev/null | grep -q .; then
  echo "ERROR: The 'postgres' container is not running."
  echo "Please start the services first using: docker compose up -d"
  exit 1
fi

echo "Restoring database from SQL dump..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
  psql -U "$DB_USER" -d "$DB_NAME" < "$RESTORE_FILE"

echo "--------------------------------------------------"
echo " Database restore completed successfully!"
echo " Date: $(date)"
echo "=================================================="
