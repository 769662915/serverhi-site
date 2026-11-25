---
title: "Run Redis in Docker and restore a snapshot into a second container"
description: "Persist Redis 7 data, restore a known key on a separate instance, and check the transport settings before connecting clients."
pubDate: 2026-02-08
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Redis container deployment architecture showing cache clusters and persistence"
category: "docker"
tags: ["Redis", "Docker", "caching", "containers", "deployment"]
---

**Correction, November 25, 2026.** An AOF configured with `appendfsync everysec` can lose roughly the last second of acknowledged writes after a crash. An RDB snapshot reflects an earlier instant. Redis also has optional native TLS, available since version 6 in builds with TLS support. These details change both the recovery target and the client configuration. [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) · [Redis TLS](https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/)

## Create an isolated instance

This rehearsal uses the official Redis 7 Alpine image and a new Docker volume. Choose unused names. The commands run clients inside the container, so no host port needs to be published. The sample is for a single trusted lab host. For an application, create a private network, restrict which services can join and configure credentials with Redis ACLs.

```bash
docker volume create serverhi-redis-data
docker run -d --name serverhi-redis --network none \
  -v serverhi-redis-data:/data redis:7-alpine \
  redis-server --appendonly yes --appendfsync everysec
docker exec serverhi-redis redis-cli ping
docker exec serverhi-redis redis-cli SET serverhi:restore-check expected-v1
docker exec serverhi-redis redis-cli CONFIG GET appendfsync
docker exec serverhi-redis redis-cli INFO persistence
```

Look for `PONG`, `OK`, `everysec` and `aof_enabled:1`. Restart the same container and read the key with `docker exec serverhi-redis redis-cli GET serverhi:restore-check` after the server starts. This checks reuse of the mounted data. A failing disk could still take both the instance and its volume down.

## Take a snapshot and read it on a different instance

Run this block in Bash in a new private directory. `redis-cli --rdb` asks the running server for a complete RDB snapshot. It works with Redis 7's multipart AOF because it does not copy its live append-only files. A real backup needs a separately retained copy and periodic recovery exercises.

```bash
set -euo pipefail
umask 077
backup_dir=$(mktemp -d)
docker exec serverhi-redis redis-cli --rdb /tmp/serverhi-test.rdb
docker cp serverhi-redis:/tmp/serverhi-test.rdb "$backup_dir/dump.rdb"
docker volume create serverhi-redis-restore
docker create --name serverhi-redis-restore --network none \
  -v serverhi-redis-restore:/data redis:7-alpine \
  redis-server --appendonly no
docker cp "$backup_dir/dump.rdb" serverhi-redis-restore:/data/dump.rdb
docker start serverhi-redis-restore
for attempt in {1..20}; do
  if docker exec serverhi-redis-restore redis-cli ping 2>/dev/null | grep -qx PONG; then break; fi
  sleep 1
done
actual=$(docker exec serverhi-redis-restore redis-cli --raw GET serverhi:restore-check)
test "$actual" = expected-v1
printf 'Restored value: %s\n' "$actual"
```

The restore uses a fresh volume with AOF disabled to ensure the RDB is loaded. A missing key must fail the test. For production, use an application-owned check, record the recovery time and the most recent transaction you restored, and protect the off-host snapshot as sensitive data. Keep the last verified generation. [Redis CLI snapshot mode](https://redis.io/docs/latest/develop/tools/cli/)

## Connect application clients over TLS

For a server built with TLS, configure `port 0`, `tls-port 6379`, `tls-cert-file`, `tls-key-file` and `tls-ca-cert-file`. Use issued certificates for the actual hostname and mount keys read-only with restricted permissions. With the default client-certificate requirement, a client also needs a signed client certificate and private key. Redis ACLs control the commands and keys a user can access. Use your secret manager for credentials.

```bash
redis-cli --tls -h redis.internal.example -p 6379 \
  --cacert ca.crt --cert client.crt --key client.key PING
```

Replace the name and files with the deployment's values. Expect `PONG` for an authorized user. Repeat with a different trust root in the lab and verify that the handshake fails. TLS protects traffic between clients and servers. Encrypt storage and snapshots separately. A deployment with replicas or Sentinel also needs its replication and client-discovery settings checked. [Redis access controls](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/) · [Sentinel failover rehearsal](/posts/redis-sentinel-high-availability-setup/)

## Clean up the rehearsal

After verifying the snapshot, remove the two named test containers with `docker rm -f serverhi-redis serverhi-redis-restore`. Inspect the named volumes and your backup directory before deleting any test data. The production retention procedure should track verified generations independently of these local names.

## Verification on November 25, 2026

With the Redis 7 Alpine image (7.4.12), the second container loaded `expected-v1` from the copied RDB. In a separate native TLS rehearsal, a signed client and the test CA returned `PONG`; substituting an unrelated CA failed the connection. This was a snapshot recovery and transport check. It did not simulate an abrupt loss of power.
