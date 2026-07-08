---
title: "Docker Log Rotation Done Right: Stop Your Containers from Eating Your Disk"
description: "Unchecked container logs can quietly fill your production disk in days. This guide covers Docker logging drivers, rotation configs, and a Loki+Grafana stack so you never wake up to a full /var/lib/docker again."
pubDate: 2026-07-09
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration showing Docker container log files expanding to fill a disk, with a log rotation mechanism trimming them in green-on-black terminal aesthetic"
category: docker
tags: [Docker, logging, log rotation, json-file, Loki, Grafana, DevOps, disk management]
author: ServerHi Editorial Team
difficulty: intermediate
estimatedTime: "12 minutes"
osCompatibility: [Ubuntu 24.04, Debian 12, RHEL 9]
---

Nobody plans for logs to take down production. But when a containerized app starts spitting stack traces at 200 lines per second, the default Docker logging config will happily write every byte to disk until there's nothing left. Then your database stops committing, your CI pipeline stalls mid-build, and you're SSHing into a server that can't even tab-complete because `/var` is at 100%.

The fix isn't complicated, but the defaults won't save you. Here's how to configure Docker log rotation properly — from a quick per-container flag to a full observability stack — so you never have to think about it again.

## How Docker Stores Logs (and Why It's a Problem)

Every container's stdout and stderr streams are captured by a **logging driver**. The default driver, `json-file`, writes each log line as a JSON object to a file on the host:

```bash
# Find where your container logs actually live
$ docker inspect --format='{{.LogPath}}' my-container
/var/lib/docker/containers/a1b2c3.../a1b2c3...-json.log
```

Docker never rotates or truncates this file on its own. A container that logs 50 MB a day will produce 1.5 GB a month — per container. On a server running eight services, that's 12 GB of log files that serve no purpose beyond the last hour of debugging.

The first thing to check when you suspect a disk issue:

```bash
$ find /var/lib/docker/containers -name '*.log' -exec du -sh {} \; 2>/dev/null | sort -rh | head -10
1.8G    /var/lib/docker/containers/abc123/abc123-json.log
892M    /var/lib/docker/containers/def456/def456-json.log
...
```

## Quick Fix: Per-Container Rotation

If you need to stop the bleeding right now on a running container, you can't change the logging driver without recreating it. But you can truncate the file in place:

```bash
# Zero out a runaway log without restarting the container
$ sudo truncate -s 0 /var/lib/docker/containers/<container-id>/<container-id>-json.log
```

Docker keeps the file handle open, so the container keeps logging. The next `docker logs <container>` will start fresh from that point.

For **new** containers, pass rotation options directly:

```bash
$ docker run -d \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    nginx:alpine
```

- `max-size=10m` — rotate when the log file hits 10 megabytes
- `max-file=3` — keep the current file plus two rotated backups (so max ~30 MB total)

The rotated files are named `container-id-json.log.1`, `.2`, etc. Docker handles the rotation internally — no cron, no logrotate config, no external tool needed.

## The Compose Way

For services defined in `docker-compose.yml`, add a `logging` block to each service:

```yaml
services:
  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
        tag: "api-{{.Name}}"

  worker:
    image: my-worker:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

The `tag` option prepends a label to each log entry, which is useful when you're aggregating logs from multiple containers and need to identify the source. `{{.Name}}` resolves to the container name.

After updating `docker-compose.yml`, recreate the affected services:

```bash
$ docker compose up -d --force-recreate api worker
```

**Important**: `--force-recreate` is necessary. A plain `docker compose up -d` won't recreate a container whose config hasn't changed, so the old logging settings would persist.

## Set It Globally: /etc/docker/daemon.json

If you want rotation on every container by default, configure the daemon:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:

```bash
$ sudo systemctl restart docker
```

This affects **only new containers created after the restart**. Existing containers keep their original logging configuration until they're recreated. To apply the new defaults to everything:

```bash
# List all running containers, then recreate them
$ docker ps -q | xargs docker inspect --format='{{.Name}}' | while read name; do
    docker compose -f /path/to/compose.yml up -d --force-recreate
done
```

Be careful with that in production — you're restarting containers.

## Inspect What a Container Is Using

To check the logging configuration on a running container:

```bash
$ docker inspect my-container | jq '.[0].HostConfig.LogConfig'
{
  "Type": "json-file",
  "Config": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

The `jq` filter pulls exactly the logging block. If `Config` is empty, the container is running with no rotation at all.

## Beyond json-file: The `local` Driver

Docker 20.10 introduced the `local` driver as a lighter alternative to `json-file`. It stores logs in a protobuf-based format with rotation **built in by default**, and it supports compression:

```bash
$ docker run -d \
    --log-driver local \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    --log-opt compress=true \
    nginx:alpine
```

Default limits without any `--log-opt`: 20 MB max-size and 5 max-file. That alone makes `local` a better default for servers where you rarely inspect logs via `docker logs` and rely on an external aggregator instead.

Trade-off: `docker logs` still works fine with the `local` driver, but third-party tools that parse raw `*-json.log` files from `/var/lib/docker/containers/` won't find anything because the format is different. If you're using Filebeat or a similar file-tailer that expects the `json-file` format, stick with `json-file`.

You can set the `local` driver as the daemon default the same way:

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  }
}
```

The `compress` option gzips rotated log files, saving even more disk. On a server running 20 containers with verbose logging, compression can be the difference between 200 MB and 40 MB of rotated logs.

## Understanding Log Tags

When you're aggregating logs from multiple containers into a single stream (syslog, Fluentd, Loki), you need to know which line came from which container. The `tag` option solves this:

```bash
$ docker run -d \
    --log-opt tag="production/{{.Name}}/{{.ID}}" \
    --log-driver syslog \
    nginx:alpine
```

Available Go template variables for `tag`:

| Variable | Example Value |
|----------|--------------|
| `{{.ID}}` | First 12 chars of container ID |
| `{{.FullID}}` | Full 64-char container ID |
| `{{.Name}}` | Container name (e.g., `/nginx`) |
| `{{.ImageID}}` | Image ID |
| `{{.ImageName}}` | Image name with tag |
| `{{.DaemonName}}` | `docker` |

A production-grade tag pattern: `{{.Name}}/{{.ID}}` — name tells you the service, ID lets you trace back to the exact container instance.

## Checking Container Disk Usage the Smart Way

Beyond just log files, Docker has a built-in disk usage report that breaks down images, containers, volumes, and build cache:

```bash
$ docker system df -v
Images space usage:
REPOSITORY       TAG       SIZE        SHARED SIZE   UNIQUE SIZE
nginx            alpine    42.6MB      0B            42.6MB
my-api           latest    185.3MB     0B            185.3MB

Containers space usage:
CONTAINER ID     IMAGE         SIZE (writable)
abc123def456     nginx:alpine  2.1kB
def456ghi789     my-api:latest 45.2MB   <-- writable layer growing!

Local Volumes space usage:
VOLUME NAME      LINKS     SIZE
api_uploads      1         892.5MB
```

The `-v` flag is essential — it shows per-container writable layer size. If a container's writable layer is growing steadily, something inside it is writing to the container filesystem (not just stdout/stderr). That won't show up in the log file check, and rotation won't help. You need to find the process writing inside the container:

```bash
$ docker exec my-container find / -type f -size +10M -exec ls -lh {} \; 2>/dev/null
-rw-r--r-- 1 root root 245M /app/debug-output/unclean-core-dump
```

## When Containers Share a Logging Sidecar

For anything beyond single-host debugging, you'll want logs **aggregated** somewhere searchable. The most common patterns:

| Stack | Components | Best For |
|-------|-----------|----------|
| Loki + Promtail + Grafana | Promtail collects, Loki stores, Grafana queries | Teams already on Grafana; low resource footprint |
| Elasticsearch + Filebeat + Kibana | Filebeat tails log files, Elasticsearch indexes, Kibana visualizes | Full-text search across massive log volumes |
| Fluentd / Fluent Bit → any backend | Pluggable output to S3, Elasticsearch, Kafka, etc. | Heterogeneous environments |

Here's a minimal **Loki + Grafana** setup in Docker Compose that you can drop into any project:

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - loki

volumes:
  loki-data:
  grafana-data:
```

With this running, you add Loki as a data source in Grafana (`http://loki:3100`), then query container logs with LogQL:

```logql
{container="api"} |= "ERROR"
```

This searches all `api` container logs for lines containing "ERROR."

LogQL can do a lot more than substring matching. Here are a few queries you'll use daily:

```logql
# Errors in the last 5 minutes, grouped by container
{job="docker"} |= "ERROR"
  | json
  | line_format "{{.container_name}}: {{.log}}"

# Count 5xx responses from nginx containers (requires json log format or a pipeline)
{container=~"nginx.*"} | json | status =~ "5.."
  | line_format "HTTP {{.status}} {{.method}} {{.path}}"

# Find log lines where a specific field matches a pattern
{container="api"} | logfmt | level = "error"
  | line_format "{{.msg}}"

# Rate of log entries per second per container (spike detection)
rate({job="docker"}[1m])
```

The `json` and `logfmt` pipeline stages are where things get interesting. If your application logs are structured (JSON or key=value), you can filter and format on individual fields rather than grepping raw text.

### Promtail Config for Docker JSON Logs

Promtail needs to know where your Docker logs live and how to parse them. Here's a `promtail-config.yml` that reads `json-file` logs and extracts the container name:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: container
      - source_labels: [__meta_docker_container_image]
        target_label: image
    pipeline_stages:
      - json:
          expressions:
            log: log
            time: time
      - timestamp:
          source: time
          format: RFC3339Nano
      - output:
          source: log
```

This config auto-discovers containers via the Docker socket, attaches `container` and `image` labels, and parses the timestamp from the Docker JSON log format so Loki displays log lines at the correct time.

## Disk Recovery Playbook

When you're already in a disk-full situation and need to recover immediately:

```bash
# 1. Confirm Docker logs are the culprit
$ du -sh /var/lib/docker/containers/
12G     /var/lib/docker/containers/

# 2. Find the worst offenders
$ find /var/lib/docker/containers -name '*.log' -printf '%s %p\n' | sort -rn | head -5
1932735283 /var/lib/docker/containers/abc123/abc123-json.log
...

# 3. Truncate the big ones (containers keep running)
$ sudo truncate -s 0 /var/lib/docker/containers/abc123/abc123-json.log

# 4. Check Docker's own disk usage (images, volumes, build cache)
$ docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        8         4.2GB     2.1GB (50%)
Containers      12        8         1.8GB     0B (0%)
Local Volumes   8         5         3.1GB     1.2GB (38%)
Build Cache     42        0         890MB     890MB

# 5. Clean up unused images and build cache
$ docker system prune -a --volumes
```

## A Shell Alias Worth Keeping

Add this to your `.bashrc` or `.zshrc`:

```bash
alias docker-log-hogs='find /var/lib/docker/containers -name "*.log" -exec du -sh {} \; 2>/dev/null | sort -rh | head -10'
```

One command, instant visibility into which container is filling your disk.

## Summary

Docker's default logging behavior is fine for development and terrible for production. The fix takes two minutes:

1. Add `max-size` and `max-file` to your `daemon.json` — this covers every container you'll ever start on that host.
2. Add a `logging:` block to every service in `docker-compose.yml` — this makes rotation explicit and portable across hosts.
3. If you manage more than one server, set up Loki + Grafana. Hunting through `docker logs` on five different machines is a waste of time you'll never get back.

Logs are useful for about 48 hours, then they're just entropy. Configure rotation once and let the machinery handle it.
