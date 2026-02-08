---
title: "Docker Container Health Checks: Best Practices"
description: "Implement effective container health checks in Docker. This guide covers HEALTHCHECK instructions, monitoring strategies, and integration with orchestrators."
pubDate: 2026-02-08
coverImage: "./cover.webp"
coverImageAlt: "Docker container health status visualization with check marks"
category: "docker"
tags: ["Docker", "containers", "health check", "monitoring", "orchestration", "DevOps"]
---

## Introduction

Container health checks enable Docker to distinguish between running containers and those actively serving traffic. Without health checks, Docker considers a container running as long as its main process exists, regardless of whether the application inside functions correctly. Health checks solve this problem by defining commands that verify actual application health, enabling Docker to restart unhealthy containers and orchestrators to route traffic away from failing instances.

Health checks matter critically in production environments. Applications crash, hang, run out of resources, or enter degraded states where the process runs but serves errors. Health checks detect these conditions and trigger appropriate responses. Orchestrators like Docker Swarm and Kubernetes use health status to make load balancing decisions, removing unhealthy containers from service rotation automatically.

This comprehensive guide covers health check implementation in Dockerfiles, Docker Compose, and runtime configurations. You will learn to write effective health check commands, configure appropriate intervals and timeouts, handle edge cases, and integrate health status with monitoring systems. By implementing proper health checks, your containers achieve self-healing behavior that reduces operational burden.

## Understanding Docker Health Checks

Health checks extend Docker's awareness of container state beyond simple process existence.

When you define a health check, Docker executes the specified command inside the container at configured intervals. The command returns an exit code indicating health status: 0 means healthy, 1 means unhealthy. Docker tracks these results and updates container status accordingly.

Health check results affect container lifecycle in several ways. Docker Compose reports container health in status output. Docker Swarm uses health status to determine service task readiness. Kubernetes requires health checks for rolling updates and readiness probes. Monitoring systems can query health status through the Docker API.

Three components define health check behavior. The test command specifies what to execute. The interval defines how frequently checks run. The timeout determines how long to wait for command completion. Retries specify consecutive failures before marking unhealthy. Start period provides initialization buffer before checks begin.

## Implementing Health Checks in Dockerfiles

Dockerfile HEALTHCHECK instructions create images with built-in health monitoring.

### Basic Health Check

```dockerfile
# Simple health check using curl for web services
FROM nginx:alpine

# Health check every 30 seconds, timeout after 5 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Copy custom application files
COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Application-Specific Health Checks

Different applications require different health verification approaches:

```dockerfile
# Node.js application
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Health check verifies API endpoint
HEALTHCHECK --interval=15s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3000
CMD ["node", "src/index.js"]
```

```dockerfile
# Python/Flask application
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Health check using Flask's built-in endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')" || exit 1

EXPOSE 5000
CMD ["python", "app.py"]
```

```dockerfile
# Database container (PostgreSQL)
FROM postgres:15-alpine

# Health check using pg_isready
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD pg_isready -U postgres -d postgres

VOLUME /var/lib/postgresql/data
EXPOSE 5432
```

```dockerfile
# Redis container
FROM redis:7-alpine

# Health check using redis-cli ping
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping | grep -q PONG

EXPOSE 6379
CMD ["redis-server"]
```

### Shell vs Exec Form

Health check commands support shell and exec forms:

```dockerfile
# Shell form (commands run through shell)
HEALTHCHECK CMD /bin/bash -c "curl -f http://localhost/health || exit 1"

# Exec form (direct exec, preferred)
HEALTHCHECK CMD ["curl", "-f", "http://localhost/health"]
```

Exec form avoids shell processing and works more reliably. Use shell form only when shell features like pipes or redirects are necessary.

### Complex Health Checks

```dockerfile
# Multi-step health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD /bin/bash -c '
        # Check process is running
        pgrep -x myapp > /dev/null || exit 1
        
        # Check port is listening
        ss -tlnp | grep -q ":8080" || exit 1
        
        # Check disk space
        df /data | awk "NR==2 {print \$5}" | grep -q "[0-9]%" || exit 1
        
        # Check memory usage
        free | awk "NR==2 {print \$3/\$2*100}" | awk "{if (\$1 > 90) exit 1}"
        
        exit 0
    '
```

## Docker Compose Health Checks

Compose files define health checks with additional orchestration features.

### Compose File Configuration

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    depends_on:
      db:
        condition: service_healthy

  api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://db:5432/app
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 5s
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 2

volumes:
  postgres_data:
```

### depends_on with Health Conditions

Docker Compose 2.1+ supports health-dependent startup:

```yaml
services:
  web:
    build: ./web
    depends_on:
      api:
        condition: service_healthy
      db:
        condition: service_healthy
```

Services won't start until dependencies report healthy status.

## Runtime Health Check Configuration

Override or add health checks when running containers:

```bash
# Override health check at runtime
docker run \
  --health-cmd="curl -f http://localhost:9000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=15s \
  myapp:latest
```

## Health Check Best Practices

Effective health checks follow specific principles for reliability.

### Principles for Health Checks

Health checks should verify actual application functionality, not just process existence. A web server returning 500 errors still runs as a process but fails the health check. Database connections should actually work. API endpoints should return valid responses.

Keep health checks lightweight to avoid performance impact. Complex checks with external dependencies or heavy operations slow container startup and add load. Consider async or cached results for expensive checks.

Fail fast on critical conditions. Health checks that take too long delay failure detection. Configure appropriate timeouts that account for expected response times plus margin.

### Appropriate Intervals and Timeouts

Configure timing based on recovery objectives:

```yaml
# Fast detection for critical services
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 5s      # Check every 5 seconds
  timeout: 2s       # Fail if check takes > 2 seconds
  retries: 2        # Mark unhealthy after 2 consecutive failures
  start_period: 10s # Allow 10s for startup

# Slower checks for background services
healthcheck:
  interval: 60s
  timeout: 30s
  retries: 5
```

### Handling Edge Cases

Address common failure modes:

```bash
#!/bin/bash
# Robust health check script

# Check process exists
if ! pgrep -x myapp > /dev/null; then
    echo "Process not running"
    exit 1
fi

# Check port is listening
if ! ss -tlnp 2>/dev/null | grep -q ":8080"; then
    echo "Port not listening"
    exit 1
fi

# Check disk space (exit if below threshold)
disk_pct=$(df /data | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$disk_pct" -gt 90 ]; then
    echo "Disk space critically low: ${disk_pct}%"
    exit 1
fi

# Check memory
mem_pct=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
if [ "$mem_pct" -gt 95 ]; then
    echo "Memory critically low: ${mem_pct}%"
    exit 1
fi

# Check dependent service
if ! curl -sf http://localhost:9000/ > /dev/null 2>&1; then
    echo "Dependency unavailable"
    exit 1
fi

echo "Healthy"
exit 0
```

## Integrating with Monitoring Systems

Connect health check data to monitoring infrastructure.

### Querying Health Status

```bash
# View container health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"

# Detailed health information
docker inspect --format='{{range .State.Health.Status}}{{.}}{{end}}' container_name

# Full health check history
docker inspect --format='{{json .State.Health.Log}}' container_name | jq

# Check specific health check result
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' container_name
```

### Prometheus Scraping

Export health metrics for Prometheus:

```bash
#!/bin/bash
# Export Docker health checks as Prometheus metrics

while true; do
    echo '# HELP docker_container_health_status Health status (1=healthy, 0=unhealthy)'
    echo '# TYPE docker_container_health_status gauge'
    
    docker ps --format '{{.Names}}' | while read name; do
        status=$(docker inspect --format='{{if .State.Health}}{{range .State.Health.Status}}{{.}}{{end}}{{else}}none{{end}}' "$name")
        value=1
        if [ "$status" != "healthy" ]; then
            value=0
        fi
        echo "docker_container_health_status{name=\"$name\"} $value"
    done
    
    sleep 15
done | nc -l 9090
```

### Alerting Integration

```bash
#!/bin/bash
# Alert on unhealthy containers

UNHEALTHY=$(docker ps --format '{{.Names}}' --filter "health=unhealthy")

if [ -n "$UNHEALTHY" ]; then
    for container in $UNHEALTHY; do
        # Get health check failure details
        details=$(docker inspect --format='{{json .State.Health.Log}}' "$container" | \
            jq -r '.[-1].Output')
        
        # Send alert (example using curl to webhook)
        curl -X POST "https://alerts.example.com/webhook" \
            -H "Content-Type: application/json" \
            -d "{
                \"alert\": \"Container Unhealthy\",
                \"container\": \"$container\",
                \"details\": \"$details\"
            }"
    done
fi
```

## Health Checks in Orchestrators

Health checks integrate deeply with container orchestrators.

### Docker Swarm Services

```bash
# Create service with health check
docker service create \
  --name api \
  --health-cmd "curl -f http://localhost/health || exit 1" \
  --health-interval 10s \
  --health-retries 3 \
  --health-timeout 5s \
  --replicas 3 \
  myapi:latest

# Update service with health check
docker service update --health-cmd "curl -f http://localhost/health || exit 1" api
```

Swarm uses health status to determine service readiness. Unhealthy tasks are removed from load balancing and may be replaced according to update policies.

### Container Restart Policies

```bash
# Restart containers based on health status
docker run \
  --restart=on-failure:3 \
  --health-cmd="curl -f http://localhost/health || exit 1" \
  myapp:latest

# Restart policies:
# no - Don't restart (default)
# on-failure - Restart if container exits with error
# unless-stopped - Always restart unless manually stopped
# always - Always restart
```

## Troubleshooting Health Checks

Common health check problems and solutions.

### Health Checks Not Running

```bash
# Verify health check is configured
docker inspect --format='{{.Config.Healthcheck}}' container_name

# Check Docker daemon health
docker info | grep Health

# Verify container has health check capability
docker run --rm myimage cat /etc/passwd | grep healthd
```

### Intermittent Failures

```bash
# View health check logs
docker inspect --format='{{json .State.Health.Log}}' container_name | jq

# Monitor health check execution
watch -n 1 'docker inspect --format "{{.State.Health.Status}}" container_name'

# Check for resource constraints
docker stats container_name
```

### Timeout Issues

```bash
# Increase timeout for slow applications
docker run \
  --health-timeout=30s \
  --health-cmd="wget --timeout=20 -q --spider http://localhost/ || exit 1" \
  myapp:latest

# Profile health check duration
time docker exec container_name /path/to/healthcheck
```

## Conclusion

Health checks transform containers from simple process containers into self-monitoring services. Implement health checks that verify actual application functionality, configure appropriate timing parameters, and integrate health status with your monitoring infrastructure. The investment in writing robust health checks pays dividends through automated recovery and improved reliability.

Update health checks as applications evolve. New features may require new checks, and changing dependencies may invalidate existing assumptions. Regular review ensures health checks remain effective at detecting real problems.

---

**Related Guides:**
- [Docker Compose Tutorial](/posts/docker-compose-tutorial)
- [Docker Security Guide](/posts/docker-security-guide)
- [Container Deployment Strategies](/posts/container-deployment-strategies)