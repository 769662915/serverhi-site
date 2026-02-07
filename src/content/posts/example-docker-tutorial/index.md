---
title: "Docker Compose Tutorial: Deploy Multi-Container Applications"
description: "Learn how to use Docker Compose to define and run multi-container Docker applications with practical examples and best practices."
pubDate: 2026-02-07
coverImage: "./cover.jpg"
coverImageAlt: "Docker containers connected together representing multi-container architecture"
category: "docker"
tags: ["Docker", "Docker Compose", "Containers", "DevOps", "Tutorial"]
author: "ServerHi Editorial Team"
featured: true
draft: false
difficulty: "intermediate"
estimatedTime: "20 minutes"
prerequisites:
  - "Basic Docker knowledge"
  - "Docker installed on your system"
  - "Understanding of YAML syntax"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 20.04", "Debian 11", "CentOS 8"]
---

## Introduction

Docker Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file to configure your application's services, networks, and volumes. Then, with a single command, you create and start all the services from your configuration.

This tutorial walks you through creating a complete multi-container application using Docker Compose.

## Why Use Docker Compose?

Managing multiple containers manually becomes complex quickly. Docker Compose solves this by:

- Defining all services in one file
- Starting everything with one command
- Managing dependencies between containers
- Simplifying development environments

## Installing Docker Compose

First, verify Docker is installed:

```bash
docker --version
```

Install Docker Compose (if not already installed):

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Verify the installation:

```bash
docker-compose --version
```

## Creating Your First Compose File

Create a new directory for your project:

```bash
mkdir my-app && cd my-app
```

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html
    networks:
      - app-network

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: myapp
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  db-data:
```

## Understanding the Configuration

Let's break down each section:

### Services

Services are the containers that make up your application. Each service can:

- Use an existing image or build from a Dockerfile
- Expose ports to the host
- Mount volumes for persistent data
- Connect to networks

### Networks

Networks allow containers to communicate. By default, Compose creates a network for your app, but you can define custom networks for better control.

### Volumes

Volumes persist data beyond container lifecycles. They're essential for databases and any data you want to keep.

## Starting Your Application

Create the HTML directory and add content:

```bash
mkdir html
echo "<h1>Hello from Docker Compose!</h1>" > html/index.html
```

Start all services:

```bash
docker-compose up -d
```

The `-d` flag runs containers in detached mode (background).

## Managing Your Application

View running services:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs
docker-compose logs web
docker-compose logs -f database
```

Stop all services:

```bash
docker-compose stop
```

Stop and remove containers:

```bash
docker-compose down
```

Remove containers and volumes:

```bash
docker-compose down -v
```

## Building Custom Images

Instead of using pre-built images, you can build your own. Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Update your `docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    depends_on:
      - database
```

## Environment Variables

Store sensitive data in a `.env` file:

```bash
POSTGRES_PASSWORD=supersecret
POSTGRES_USER=admin
POSTGRES_DB=production
```

Reference in `docker-compose.yml`:

```yaml
services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
```

## Health Checks

Add health checks to ensure services are ready:

```yaml
services:
  database:
    image: postgres:15-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Best Practices

### Use Specific Image Tags

Avoid using `latest` tags in production:

```yaml
# Bad
image: nginx:latest

# Good
image: nginx:1.25-alpine
```

### Limit Resource Usage

Prevent containers from consuming all resources:

```yaml
services:
  web:
    image: nginx:alpine
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Use Named Volumes

Named volumes are easier to manage:

```yaml
volumes:
  postgres-data:
  redis-cache:
```

### Separate Development and Production

Create multiple compose files:

- `docker-compose.yml` - Base configuration
- `docker-compose.dev.yml` - Development overrides
- `docker-compose.prod.yml` - Production overrides

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Real-World Example: WordPress Stack

Here's a complete WordPress setup:

```yaml
version: '3.8'

services:
  wordpress:
    image: wordpress:6.4-php8.2-apache
    restart: always
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: database
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wordpress-data:/var/www/html
    depends_on:
      - database
    networks:
      - wp-network

  database:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - wp-network

  phpmyadmin:
    image: phpmyadmin:latest
    restart: always
    ports:
      - "8081:80"
    environment:
      PMA_HOST: database
      PMA_USER: root
      PMA_PASSWORD: ${DB_ROOT_PASSWORD}
    depends_on:
      - database
    networks:
      - wp-network

networks:
  wp-network:
    driver: bridge

volumes:
  wordpress-data:
  db-data:
```

## Troubleshooting Common Issues

### Port Already in Use

Change the host port in your compose file:

```yaml
ports:
  - "8081:80"  # Use 8081 instead of 8080
```

### Container Exits Immediately

Check logs for errors:

```bash
docker-compose logs service-name
```

### Network Issues

Recreate networks:

```bash
docker-compose down
docker network prune
docker-compose up
```

### Volume Permission Issues

Fix permissions:

```bash
sudo chown -R $USER:$USER ./volumes
```

## Conclusion

Docker Compose simplifies multi-container application management. You've learned how to:

- Create compose files
- Manage services, networks, and volumes
- Use environment variables
- Implement best practices
- Troubleshoot common issues

Start small, experiment with different configurations, and gradually build more complex applications.

---

**Related Tutorials:**
- [Docker Networking Deep Dive](/posts/docker-networking)
- [Docker Volumes and Data Persistence](/posts/docker-volumes)
- [Production Docker Deployment Guide](/posts/docker-production)
