#!/bin/bash

if [ ! -f .db.env ]; then
    echo "Error: The .db.env file does not exist. Copy .db.env to .db.env.example and fill in the details."
    exit 1
fi

if ! command -v pg_dump &> /dev/null; then
    echo "Error: The command pg_dump from the package postgresqlXX-client is required to create backups."
    exit 1
fi

source ./.db.env
backup_dir="./backups"
mkdir -p $backup_dir
timestamp=$(date +"%Y%m%d%H%M%S")
backup_filename="backup_${DB_NAME}_${timestamp}.sql"

PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$backup_dir/$backup_filename"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully. Filename: $backup_filename"
else
    echo "Backup failed."
fi