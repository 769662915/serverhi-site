---
title: "Redis Sentinel failover on Ubuntu: a three-voter rehearsal"
description: "Elect a replica on a loopback lab, ask Sentinel for the new primary, and verify a replicated key and client reconnection after failover."
pubDate: 2026-04-14
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Redis Sentinel High Availability: Automatic Failover Configuration on Ubuntu"
category: "server-config"
tags: [Redis, High Availability, Sentinel, Server Config]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Sentinel supplies a current primary address and coordinates promotion for non-clustered Redis. A client pinned to the old port will continue trying the old address. The following Ubuntu rehearsal puts a primary, one replica and three Sentinels on a **single disposable VM**. It demonstrates election and discovery; independent hosts or failure domains are required for availability during a machine failure.

Install the Ubuntu `redis-server`, `redis-tools` and `redis-sentinel` packages. Check that TCP ports 16379, 16380 and 26380–26382 are free. Run the following as one unprivileged lab user. Keep the files writable by that user: Sentinel rewrites its configuration when the topology changes.

```bash
lab=$(mktemp -d)
for port in 16379 16380; do
  mkdir "$lab/$port"
  extra=()
  if [[ "$port" = 16380 ]]; then extra=(--replicaof 127.0.0.1 16379); fi
  redis-server --port "$port" --bind 127.0.0.1 --dir "$lab/$port" \
    --daemonize yes --pidfile "$lab/$port/redis.pid" \
    --logfile "$lab/$port/redis.log" "${extra[@]}"
done

for port in 26380 26381 26382; do
  mkdir "$lab/$port"
  cat > "$lab/$port/sentinel.conf" <<EOF
port $port
bind 127.0.0.1
dir $lab/$port
daemonize yes
pidfile $lab/$port/sentinel.pid
logfile $lab/$port/sentinel.log
sentinel monitor labprimary 127.0.0.1 16379 2
sentinel down-after-milliseconds labprimary 4000
sentinel failover-timeout labprimary 30000
sentinel parallel-syncs labprimary 1
EOF
  redis-sentinel "$lab/$port/sentinel.conf"
done
```

## Check quorum and replication before the drill

Use Bash for the setup above. Wait until `redis-cli -p 16380 INFO replication` reports `master_link_status:up` and `redis-cli -p 26380 SENTINEL MASTER labprimary` reports two other Sentinels and one replica. Run the two commands below. `WAIT` must run on the **same client connection** as the write it is checking. The last reply should be 1.

```bash
redis-cli -p 26380 SENTINEL CKQUORUM labprimary
printf 'SET serverhi:probe rehearsal\nWAIT 1 3000\n' | redis-cli -p 16379 --raw
```

## Stop the lab primary and rediscover it

```bash
redis-cli -p 16379 SHUTDOWN NOSAVE
redis-cli -p 26380 SENTINEL get-master-addr-by-name labprimary
```

Poll the second command until it returns 127.0.0.1 and **16380**. Confirm `redis-cli -p 16380 ROLE` identifies the primary (Redis reports `master`), then read `redis-cli -p 16380 GET serverhi:probe`. The expected value is `rehearsal`. Measure from stopping the old server until a client using Sentinel discovery can complete a write on the new one. Configure a real client with the service name and multiple Sentinel addresses; retrying a stale address cannot discover the change.

Replication is asynchronous. One acknowledged test key demonstrates a specific transfer and does not guarantee every production write survives a failover. Quorum for judging a primary down and authorization by a majority of Sentinels both matter. Keep production ACLs, TLS, persistence and backups in the design. When finished, shut down only the lab processes on 16380 and 26380–26382. [Redis Sentinel deployment and client discovery](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) · [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

## Verification on November 25, 2026

With Redis 7.0.15, one primary, one replica and three Sentinels ran on different loopback ports in a single VM. The replica acknowledged the marked write. After stopping the primary on 16379, Sentinel returned 16380; the new primary reported the master role and returned `rehearsal`. This tested a process failure on one host.
