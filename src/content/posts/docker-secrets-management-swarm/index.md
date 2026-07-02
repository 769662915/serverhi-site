---
title: "Docker Secrets Management: Securing Sensitive Data in Swarm and Compose"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for docker secrets management - securing sensitive data in swarm and compose."
pubDate: 2026-04-19
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Docker Secrets Management: Securing Sensitive Data in Swarm and Compose"
category: "docker"
tags: [Docker, Secrets, Security, Swarm]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## The Problem with Environment Variables

Putting secrets in environment variables is the most common Docker anti-pattern. Environment variables leak through `docker inspect`, child processes inherit them, and they often end up in logs or error messages. Docker secrets solve this by mounting secrets as in-memory files that only exist for the duration of the container.

## Docker Swarm Secrets

Docker secrets require Swarm mode. Even for a single node:

```bash
docker swarm init
```

Create a secret:

```bash
# From a string
echo "my-db-password" | docker secret create db_password -

# From a file
docker secret create db_password ./password.txt

# From stdin (no shell history leak)
docker secret create db_password -
# Type password, Ctrl+D
```

List secrets (values are never shown):

```bash
docker secret ls
# ID                          NAME          CREATED
# abc123def456                db_password   2 minutes ago
```

## Using Secrets in Services

```bash
docker service create \
  --name web \
  --secret db_password \
  --secret api_key \
  nginx:latest
```

Inside the container, secrets appear as files in `/run/secrets/`:

```bash
docker exec $(docker ps -q -f name=web) cat /run/secrets/db_password
```

The path is `/run/secrets/<secret_name>`. The file is a tmpfs — it exists only in memory for the container's lifetime.

## Application Integration

Your application reads secrets from files instead of environment variables:

```python
# Python
with open('/run/secrets/db_password') as f:
    db_password = f.read().strip()

# Node.js
const fs = require('fs');
const dbPassword = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();

# Shell script
DB_PASSWORD=$(cat /run/secrets/db_password)
```

## Rotating Secrets

Docker secrets are immutable once created. To rotate:

```bash
# Create new secret
echo "new-password" | docker secret create db_password_v2 -

# Update service to use new secret and remove old
docker service update \
  --secret-rm db_password \
  --secret-add db_password_v2 \
  web_service

# After confirming the service is healthy, remove old secret
docker secret rm db_password
```

The service update triggers a rolling restart. Each container gets the new secret as it's replaced.

## Docker Compose Secrets (Without Swarm)

For local development without Swarm, Docker Compose supports file-based secrets:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: nginx
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

Compose creates a bind mount at `/run/secrets/db_password`. The file on disk is your responsibility to protect.

## Docker Compose + Swarm Mode

When deploying Compose to Swarm, use external secrets:

```yaml
version: '3.8'
services:
  web:
    image: nginx
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true
```

Create the secret in Swarm first, then deploy:

```bash
docker secret create db_password ./password.txt
docker stack deploy -c docker-compose.yml myapp
```

## Best Practices

**Never log secrets**: Application code must not log the contents of `/run/secrets/`. Audit your logging code.

**Strip whitespace**: `echo` and `cat` add trailing newlines. Always `.strip()` or `.trim()` the file contents.

**Limit secret scope**: Only attach secrets to services that need them. A frontend proxy doesn't need the database password.

**Use secret names, not values**: Reference secrets by name in Orchestration. Never hardcode values in Compose files.

**Audit secret access**: Docker logs secret rotation events but not read access. For audit trails, use a secrets manager (Vault, AWS Secrets Manager) that records every access.

## Comparison: Swarm Secrets vs HashiCorp Vault

Docker secrets: Simple, built-in, works for Swarm deployments. No access audit, no dynamic secrets, no encryption at rest beyond TLS.

HashiCorp Vault: Dynamic secrets, access audit, encryption at rest, integration with cloud providers. Heavier to operate.

For small teams running Swarm: Docker secrets work well. For enterprises or multi-cloud: invest in Vault or the cloud provider's secrets manager.

## Summary

Docker secrets replace environment variables for sensitive data. Create secrets via stdin to avoid shell history leaks, mount them at `/run/secrets/`, and rotate by creating new secrets and updating services. For Compose-based development without Swarm, use file-based secrets with proper filesystem permissions.