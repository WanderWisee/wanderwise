"""Back up and apply the additive model-alignment migration to the local DB.

Uses existing backend/.env credentials without logging them. Requires the
installed MySQL client tools, or MYSQL_BIN pointing to their directory.
MySQL DDL commits per statement; the backup is mandatory, not a transaction.
"""
from datetime import datetime
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
DB_DIR = ROOT / 'database'


def main():
    config = {}
    for line in (ROOT / 'backend' / '.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip().strip('\"\'')
    host = config.get('DB_HOST', '127.0.0.1')
    if host.lower() not in ('localhost', '127.0.0.1', '::1'):
        raise RuntimeError('This helper only updates a local database.')
    database = config.get('DB_NAME', 'wanderwise')
    if not re.fullmatch(r'[A-Za-z0-9_]+', database):
        raise RuntimeError('Unexpected database name.')
    tool_dir = Path(os.environ.get('MYSQL_BIN', r'C:\Program Files\MySQL\MySQL Server 8.0\bin'))
    connection = ['--host=' + host, '--port=' + config.get('DB_PORT', '3306'), '--user=' + config.get('DB_USER', 'root')]
    env = os.environ.copy()
    env['MYSQL_PWD'] = config.get('DB_PASSWORD', '')

    def query(sql):
        result = subprocess.run([str(tool_dir / 'mysql.exe'), *connection, '--database=' + database,
                                 '--batch', '--raw', '--skip-column-names'], input=sql,
                                capture_output=True, text=True, env=env, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        return [line.split('\t') for line in result.stdout.splitlines() if line]

    columns = query('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()')
    existing = {(table, column) for table, column in columns}
    tables = sorted({table for table, _ in columns})
    before_counts = {table: int(query(f'SELECT COUNT(*) FROM `{table}`')[0][0]) for table in tables}
    migration_files = ['1_align_current_models.sql', '5_trip_name.sql', '6_push_tokens.sql']
    sql = '\n'.join(re.sub(r'--[^\n]*', '', (DB_DIR / name).read_text(encoding='utf-8'))
                    for name in migration_files)
    statements = [part.strip() for part in sql.split(';') if part.strip()]
    plan = []
    for statement in statements:
        alter = re.match(r'ALTER TABLE\s+`?(\w+)`?\s+ADD COLUMN\s+`?(\w+)`?\s+', statement, re.I)
        create = re.match(r'CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?', statement, re.I)
        if alter and tuple(alter.groups()) not in existing:
            plan.append(statement)
        elif create and create.group(1) not in tables:
            plan.append(statement)
        elif not alter and not create:
            raise RuntimeError('Unexpected statement: only additive columns/tables are allowed.')
    if not plan:
        print('Schema is already aligned; no changes needed.')
        return
    backup_dir = DB_DIR / 'Backups-local'
    check = subprocess.run(['git', 'check-ignore', str(backup_dir / 'check.sql')], cwd=ROOT, capture_output=True)
    if check.returncode:
        raise RuntimeError('Backup directory must be ignored by git before saving private database data.')
    backup_dir.mkdir(exist_ok=True)
    backup = backup_dir / ('before-schema-update-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f') + '.sql')
    dump = subprocess.run([str(tool_dir / 'mysqldump.exe'), *connection, '--single-transaction',
                           '--skip-lock-tables', '--no-tablespaces', '--default-character-set=utf8mb4',
                           '--result-file=' + str(backup), database], env=env, capture_output=True, text=True, timeout=120)
    if dump.returncode or not backup.exists() or backup.stat().st_size == 0:
        raise RuntimeError('Backup failed; no schema changes applied. ' + dump.stderr.strip())
    print('Backup saved:', backup.relative_to(ROOT))
    print('Additive statements:', len(plan))
    for statement in plan:
        query(statement)
        print('Applied:', statement.splitlines()[0])
    after_counts = {table: int(query(f'SELECT COUNT(*) FROM `{table}`')[0][0]) for table in tables}
    if any(after_counts[table] < count for table, count in before_counts.items()):
        raise RuntimeError('A pre-existing table row count decreased; investigate using the backup.')
    missing = []
    after = {(table, column) for table, column in query('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()')}
    for path in (ROOT / 'backend' / 'Models').glob('*.cs'):
        source = path.read_text(encoding='utf-8')
        for match in re.finditer(r'\[Table\("([^"]+)"\)\]([\s\S]*?)(?=\[Table\(|\Z)', source):
            table, body = match.groups()
            names = re.findall(r'\[Column\("([^"]+)"', body)
            missing.extend(f'{table}.{name}' for name in names if (table, name) not in after)
            if names:
                query('SELECT ' + ','.join(f'`{name}`' for name in names) + f' FROM `{table}` LIMIT 0')
    if missing:
        raise RuntimeError('Model columns still missing: ' + ', '.join(missing))
    report = {'backup': str(backup.relative_to(ROOT)), 'statements_applied': len(plan),
              'existing_row_counts_before': before_counts, 'existing_row_counts_after': after_counts,
              'missing_model_columns': missing}
    (backup_dir / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Verified: all mapped model columns exist and select successfully.')
    print('Verified: no existing table row count decreased.')


if __name__ == '__main__':
    main()
