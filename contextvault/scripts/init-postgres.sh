#!/bin/sh
set -eu
# Runs only on a fresh postgres volume. The migration principal owns tables;
# this runtime principal is deliberately neither owner nor BYPASSRLS.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$POSTGRES_APP_PASSWORD" <<'SQL'
CREATE ROLE contextvault_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE contextvault TO contextvault_app;
GRANT USAGE ON SCHEMA public TO contextvault_app;
ALTER DEFAULT PRIVILEGES FOR ROLE cvmigrate IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO contextvault_app;
ALTER DEFAULT PRIVILEGES FOR ROLE cvmigrate IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO contextvault_app;
SQL
