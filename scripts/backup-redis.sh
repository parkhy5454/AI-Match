#!/bin/bash

# Redis 백업 스크립트

BACKUP_DIR="backups/redis"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.rdb"

mkdir -p "$BACKUP_DIR"

# Redis 백업
redis-cli BGSAVE

# 백업 파일 복사
cp /var/lib/redis/dump.rdb "$BACKUP_FILE"

# 압축
gzip "$BACKUP_FILE"

# 오래된 백업 삭제
find "$BACKUP_DIR" -name "backup_*.rdb.gz" -mtime +7 -delete

# S3 업로드
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  aws s3 cp "$BACKUP_FILE.gz" "s3://ai-match-backups/redis/"
fi

echo "Redis backup completed"
