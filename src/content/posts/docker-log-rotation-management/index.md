---
title: "Bound Docker log growth and verify a container’s rotation policy"
description: "Identify the active logging driver, apply size-based retention to new containers, and check the result without editing daemon-owned logs."
pubDate: 2026-07-09
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration showing Docker container log files expanding to fill a disk, with a log rotation mechanism trimming them in green-on-black terminal aesthetic"
category: docker
tags: [Docker, logging, log rotation, json-file, Loki, Grafana, DevOps, disk management]
author: ServerHi Editorial Team
difficulty: intermediate
estimatedTime: "12 minutes"
osCompatibility: [Ubuntu 24.04, Debian 12, RHEL 9]
---

**Correction, November 25, 2026.** Editing, truncating or rotating Docker's internal log files with external tools can interfere with the logging driver. Broad resource pruning can also remove stopped containers and unreferenced data. For a noisy service, establish which driver owns its logs, configure a limit and verify a replacement container. [Docker JSON file driver](https://docs.docker.com/engine/logging/drivers/json-file/) · [Docker system prune](https://docs.docker.com/reference/cli/docker/system/prune/)

## Identify the writer

```bash
docker info --format '{{.LoggingDriver}}'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker inspect --format '{{json .HostConfig.LogConfig}}' my-service
docker logs --since 5m --tail 50 my-service
docker system df -v
```

Substitute the container's actual name. The first command shows the daemon default. The inspect result describes that container. `docker system df -v` helps distinguish image, volume and cache usage but does not measure every application's log bytes. If the app writes directly into a bind mount, it needs its own retention policy.

## Set a limit for one Compose service

Merge the following `logging` block into the service's existing settings. Size and count are strings. This example retains up to three log files at a target of 10 MB each. Leave disk headroom for other containers, oversize records and filesystem overhead.

```yaml
services:
  web:
    image: nginx:stable-alpine
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

`docker compose config -q` checks configuration syntax. Schedule replacement when the service can be interrupted, confirm persistent application data has an explicit mount, then run `docker compose up -d --no-deps --force-recreate web`. Check the new container ID and inspect its `HostConfig.LogConfig`. Restarting an existing container alone keeps its previous logging settings.

For a daemon-wide default, merge `log-driver` and `log-opts` into the existing `daemon.json`. Preserve other configuration, validate with `dockerd --validate --config-file=/etc/docker/daemon.json` and plan the daemon restart. Docker's `local` driver includes rotation by default. Choose a driver compatible with the tools that consume your logs. [Docker logging configuration](https://docs.docker.com/engine/logging/configure/) · [Local driver](https://docs.docker.com/engine/logging/drivers/local/)

## Observe rotation in a disposable container

Use an unused container name on a development engine. A short loop writes a recognizable first and last line. The small limit makes rollover visible through Docker's own read interface.

```bash
docker run --name serverhi-log-test --log-driver json-file \
  --log-opt max-size=10k --log-opt max-file=2 \
  alpine:3.22 sh -c 'for i in $(seq 1 3000); do echo "line-$i rotation rehearsal"; done'
docker inspect --format '{{json .HostConfig.LogConfig}}' serverhi-log-test
docker logs serverhi-log-test 2>&1 | head -n 1
docker logs --tail 1 serverhi-log-test
```

The last line should contain `line-3000`. The oldest available line should have a number above one, because the earliest segment aged out. Remove this completed test with `docker rm serverhi-log-test`. In a real service, decide how long operators need the output. If months of history are required, ship logs to separate storage and monitor delivery before shortening local retention.

## When the disk is already full

Work from a second session. Check `df -h`, `df -i` and the writer's current error rate. Slow a runaway producer or route traffic to a healthy peer. Preserve diagnostic evidence and make enough space for a controlled replacement. On a shared host, find the owner of any stopped container or unreferenced volume before considering removal. [Linux disk space diagnosis](/posts/linux-disk-space-analysis-tools/)

## Verification on November 25, 2026

On Docker Engine 29.1.3, the container retained `line-2867` as the first readable line and `line-3000` as the last. Inspect showed `json-file`, `max-size=10k` and `max-file=2`. No underlying log file was opened or modified.
