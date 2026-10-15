# Local database schema updates

`0_schema.sql` is the original full database dump. It contains `DROP TABLE`
statements: do not reimport it over an existing database to apply updates.

For an existing local database, run from the repository root:

```powershell
python database/apply_schema_update.py
```

The helper reads existing `backend/.env` connection settings, checks actual
columns/tables, saves a full local backup, and applies only missing additive
statements from `1_align_current_models.sql`, `5_trip_name.sql`, and
`6_push_tokens.sql`. It leaves existing records and
existing column definitions unchanged. Rerunning skips already-applied changes.

MySQL client tools are expected in `C:\Program Files\MySQL\MySQL Server 8.0\bin`.
Set `MYSQL_BIN` if installed elsewhere. Only local database hosts are accepted.

Private backups and verification row counts are stored under the git-ignored
`database/Backups-local/`. They contain account data and must not be committed.
MySQL DDL commits each statement independently; failures require checking which
statements completed before rerunning or considering restoration.

The update adds the existing backend model requirements for account status/roles,
crew permissions, journal visibility, Classes, Tour Day, and activity logs.
Existing accounts default to active students and existing crew default to
view-only. No professor/admin application screens or backend code are changed.
