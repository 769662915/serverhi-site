---
title: "Server backups you can restore: a PostgreSQL drill and off-site copy"
description: "Build a versioned PostgreSQL backup, restore the downloaded copy into an empty database, and make upload, integrity or application checks fail the job."
pubDate: 2026-02-08
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Backup strategy visualization showing local, cloud, and hybrid storage approaches"
category: "devops"
tags: ["backup", "recovery", "Linux", "disaster recovery", "data protection"]
---

**Correction, November 25, 2026.** The earlier verification script accepted a gzip file containing invalid SQL. The upload step could also finish successfully after a remote error. If you adopted either example, restore an existing off-site copy before treating the job's last green run as a recovery point.

## Choose a recovery point you can afford

Write down the newest write you can afford to lose (recovery point objective, RPO) and how long users can wait (recovery time objective, RTO). A nightly logical dump can put almost a day's writes at risk. A database that must recover to a particular minute needs a different design, such as PostgreSQL base backups plus continuous WAL archiving. Time the download, restore, application checks and cutover separately. A fast dump tells you little about how long the restore will take. [PostgreSQL backup methods](https://www.postgresql.org/docs/current/backup.html)

Inventory the rest of the service too. For uploaded files, retain versioned copies and test that an object referenced by a restored row is present. Record the OS and database versions, required extensions, roles, configuration and how to recover encryption keys. Give the backup job only the permissions it needs and keep a separately protected copy outside the source host's failure domain. Test access with the credentials available during an incident.

## Set up a known recovery test

This example uses Bash, gzip, PostgreSQL client tools and rclone. It produces a plain SQL dump of **one database**. Use clients matching the source major version and a compatible disposable PostgreSQL cluster with the required extensions. The restore account needs permission to create databases on that cluster. Use a libpq service or a restricted password file for credentials. Only restore dumps you control: restoring runs SQL from the backup.

For a rehearsal, create an empty source database you own. Run the following in that database. The probe stands in for an application record whose identity you know ahead of time.

```sql
CREATE TABLE public.backup_probe (id integer PRIMARY KEY, label text NOT NULL);
INSERT INTO public.backup_probe VALUES (1, 'serverhi-drill');
```

For a real application, choose a stable, meaningful check on its own tables. Also verify a recent business record or transaction watermark from the backup window. A fixed probe alone cannot tell you how recent a copy is. This drill omits ownership and grants for portability. Back up global roles and test privileges separately before using a restored service.

## Restore into a fresh database

Save this as `verify-db.sh`. Set `RESTORE_HOST` to the host or socket directory of the **isolated test cluster**, and `RESTORE_USER` to its test account. The script creates an empty database for this attempt. It removes only the database it successfully created. `ON_ERROR_STOP` makes a SQL error fail the restore; `pipefail` also catches a gzip read failure.

```bash
#!/usr/bin/env bash
set -euo pipefail

dump=${1:?usage: verify-db.sh path/to/app.sql.gz}
: "${RESTORE_HOST:?set the isolated restore cluster host or socket directory}"
: "${RESTORE_USER:?set the restore cluster role}"
unset PGSERVICE PGDATABASE PGHOSTADDR
export PGHOST="$RESTORE_HOST" PGUSER="$RESTORE_USER" PGPORT="${RESTORE_PORT:-5432}"
database="serverhi_verify_$(date -u +%s)_$$"

createdb --template=template0 "$database"
trap 'dropdb "$database"' EXIT

gzip -dc -- "$dump" |
  psql -X --set=ON_ERROR_STOP=1 --single-transaction --dbname="$database" --file=- > /dev/null

result=$(psql -X -qAt --set=ON_ERROR_STOP=1 --dbname="$database" \
  --command="SELECT label FROM public.backup_probe WHERE id = 1")
if [[ "$result" != "serverhi-drill" ]]; then
  echo "Restore failed: the expected application record was missing or different." >&2
  exit 1
fi
echo "Restore passed: recovered the expected application record."
```

An empty SQL file can be accepted by `psql`. It still fails this drill because the probe table is absent. A file that merely contains the word “PostgreSQL” fails when the SQL parser reads it. [Restoring a plain-text dump](https://www.postgresql.org/docs/current/backup-dump.html)

## Copy one identified recovery point off-site

Save this script alongside `verify-db.sh` and make both executable. Set `SOURCE_DB` to the source database connection (a service name can be passed as `service=backup_source`), `BACKUP_DIR` to a private local directory, and `REMOTE_DIR` to a configured rclone destination such as `archive:server-backups/postgres`. Keep the restore-cluster variables set. The job writes a new directory and object name each run, including retries. It does not rotate existing backup generations.

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SOURCE_DB:?set the source database connection}"
: "${BACKUP_DIR:?set the private staging directory}"
: "${REMOTE_DIR:?set an rclone backup destination}"
verify="$(cd "$(dirname "$0")" && pwd)/verify-db.sh"
mkdir -p "$BACKUP_DIR"
run=$(mktemp -d "$BACKUP_DIR/pg-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")
object="${REMOTE_DIR%/}/${run##*/}/app.sql.gz"

echo "Exporting into $run"
pg_dump --format=plain --no-owner --no-privileges --dbname="$SOURCE_DB" |
  gzip -c > "$run/app.sql.gz"
"$verify" "$run/app.sql.gz"

echo "Uploading backup"
rclone copyto --immutable "$run/app.sql.gz" "$object"
echo "Reading back the stored object"
rclone copyto "$object" "$run/returned.sql.gz"
if ! cmp -s "$run/app.sql.gz" "$run/returned.sql.gz"; then
  echo "Remote copy differs from the local export." >&2
  exit 1
fi
"$verify" "$run/returned.sql.gz"
printf '%s\n' "$object" > "$run/VERIFIED"
echo "Verified off-site restore from $object"
```

Alert on a nonzero exit and on an overdue `VERIFIED` record; a scheduler can stop running altogether. Keep enough space for the export, downloaded copy and restored database. Monitor and expire incomplete staging directories separately. Retention and storage-side versioning should preserve older known-good generations even if the newest job fails or a source file is accidentally removed. [rclone copyto](https://rclone.org/commands/rclone_copyto/)

## Rehearse the failure paths

| Drill in the test environment | Expected result |
|---|---|
| Run a dump of the seeded source and retrieve its stored copy | Both restores return the seed record. The run gains a `VERIFIED` marker containing the remote path. |
| Pass gzipped invalid SQL, a valid gzip with an empty payload, then a truncated gzip to the verifier | Each invocation exits nonzero. None reports a successful restore. |
| Remove access to the test source, use an unavailable test remote, or change the downloaded test copy | The corresponding job stops before writing its success marker. The previous generation remains readable. |
| Restore an older generation by its recorded object name | Record its latest application data and elapsed restore time, then compare them with the RPO and RTO. |

Before a real cutover, verify application behavior using the restored database and matching file snapshot, account for writes made after the recovery point, and keep the original instance available until the recovery owner accepts the result. [Docker volume management](/posts/docker-volume-management/) · [PostgreSQL in Docker](/posts/postgresql-docker-setup/)

## Verification on November 25, 2026

On November 25, 2026, we ran these scripts against two PostgreSQL 16.15 clusters on Ubuntu 24.04.5. The source and restore ports differed. A second filesystem location served as the rclone destination. Both restored copies returned the expected record. Invalid SQL exited 3; an empty gzip payload and a truncated gzip each exited 1. Export, upload, download and byte-comparison failures all stopped the job before the marker was written. The previous verified generation still restored. A real provider’s permissions, availability and retention need a separate drill.
