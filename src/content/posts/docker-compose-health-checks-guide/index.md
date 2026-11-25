---
title: "Wait for a healthy dependency in Docker Compose"
description: "Run a two-service Compose example, break its readiness probe without stopping the process, and inspect the health, restart count and dependent job."
pubDate: 2026-04-06
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Docker Compose Health Checks: Ensuring Service Availability in Production"
category: "docker"
tags: [Docker, Docker Compose, Health Checks, Production]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Starting an HTTP server and being ready to serve a request are separate events. Compose can wait for a named dependency's health check before it starts a consumer. The check executes **inside the service container**, so its tools, URL and exit status must make sense there.

## A two-container rehearsal

Use Docker Engine with Compose v2. Save this as `compose.yaml` in a new directory. Python serves the directory containing a small readiness file. Binding the probe to container loopback avoids publishing a host port. The client uses the Compose service name for its request.

```yaml
services:
  web:
    image: python:3.12-alpine
    working_dir: /tmp
    command: ["sh", "-c", "printf ready > ready.txt && exec python -m http.server 8000"]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/ready.txt', timeout=1).read()"]
      interval: 3s
      timeout: 2s
      retries: 3
      start_period: 3s
  reader:
    image: python:3.12-alpine
    depends_on:
      web:
        condition: service_healthy
    command: ["python", "-c", "import urllib.request; print(urllib.request.urlopen('http://web:8000/ready.txt').read().decode())"]
```

```bash
docker compose config -q
docker compose up -d
docker wait "$(docker compose ps -aq reader)"
docker compose logs reader
docker compose ps -a
```

The reader should print `ready` and exit successfully. An exited reader is expected here: it was given a single fetch operation. The web service should remain running and healthy.

## Make the distinction visible

```bash
web_id=$(docker compose ps -q web)
docker inspect --format '{{.State.Health.Status}} {{.RestartCount}}' "$web_id"
docker compose exec -T web mv /tmp/ready.txt /tmp/ready.off
```

Wait for the configured consecutive failures, then repeat the inspect command. Expect `unhealthy` with the **same** restart count. The server process is still responding; the probe's file has disappeared. Put it back with `docker compose exec -T web mv /tmp/ready.off /tmp/ready.txt` and wait for a successful check. It should return to `healthy`. Run `docker compose down` in this rehearsal directory when finished.

For a database-backed application, choose the smallest check that establishes the dependency can accept the work the consumer will send. Keep it cheap, set a timeout, and let clients retry transient errors after startup. The initial dependency gate does not maintain an already-running application's connections. [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/) · [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)

## Verification on November 25, 2026

With Docker Engine 29.1.3 and Compose v2 on Ubuntu 24.04.5, the one-shot reader exited 0 and printed `ready`. Removing the file produced `unhealthy 0` in the inspect output. Putting it back produced `healthy 0`. The second value is the restart count.
