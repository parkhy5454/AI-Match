#!/bin/bash

# 데이터베이스 백업 스크립트
# 사용: ./scripts/backup-database.sh

BACKUP_DIR="backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# PostgreSQL 백업
echo "Backing up database..."
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# 압축
gzip "$BACKUP_FILE"

# 오래된 백업 삭제 (7일 이상)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

# 클라우드 스토리지에 업로드 (AWS S3 예시)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  aws s3 cp "$BACKUP_FILE.gz" "s3://ai-match-backups/database/"
  echo "Backup uploaded to S3"
fi

echo "Backup completed: $BACKUP_FILE.gz"
