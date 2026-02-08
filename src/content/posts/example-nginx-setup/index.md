---
title: "Nginx Reverse Proxy Setup: Complete Configuration Guide"
description: "Configure Nginx reverse proxy with SSL/TLS. Step-by-step guide for load balancing, security & performance. Production-ready examples included."
pubDate: 2026-02-05
coverImage: "./cover.jpg"
coverImageAlt: "Nginx server architecture diagram showing reverse proxy configuration"
category: "server-config"
tags: ["Nginx", "Reverse Proxy", "SSL", "Load Balancing", "Web Server"]
author: "ServerHi Editorial Team"
featured: true
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Ubuntu server with sudo access"
  - "Domain name pointing to your server"
  - "Basic understanding of web servers"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 20.04", "Debian 11", "CentOS 8"]
---

## Introduction

A reverse proxy sits between clients and your backend servers, forwarding requests and responses. Nginx excels at this role, offering high performance, SSL termination, load balancing, and caching.

This guide shows you how to set up Nginx as a reverse proxy for your applications.

## Why Use a Reverse Proxy?

Reverse proxies provide several benefits:

- **SSL/TLS Termination**: Handle HTTPS in one place
- **Load Balancing**: Distribute traffic across multiple servers
- **Caching**: Improve performance by caching responses
- **Security**: Hide backend server details
- **Compression**: Reduce bandwidth usage

## Installing Nginx

Before configuring Nginx, ensure you have a properly configured server. See our [Ubuntu 22.04 Server Setup Guide](/posts/example-ubuntu-guide) for initial server configuration.

Update package list:

```bash
sudo apt update
```

Install Nginx:

```bash
sudo apt install nginx -y
```

Start and enable Nginx:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Verify installation:

```bash
sudo systemctl status nginx
nginx -v
```

## Basic Reverse Proxy Configuration

### Single Backend Server

Create a new configuration file:

```bash
sudo nano /etc/nginx/sites-available/myapp
```

Add basic reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
```

Test configuration:

```bash
sudo nginx -t
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

## Understanding Proxy Headers

Each header serves a specific purpose:

### X-Real-IP

Passes the client's real IP address:

```nginx
proxy_set_header X-Real-IP $remote_addr;
```

### X-Forwarded-For

Maintains a list of all proxies the request passed through:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### X-Forwarded-Proto

Indicates the original protocol (HTTP or HTTPS):

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

### Host Header

Preserves the original host header:

```nginx
proxy_set_header Host $host;
```

## SSL/TLS Configuration

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL Certificate

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot automatically configures Nginx for HTTPS. Your config becomes:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Auto-Renewal

Test renewal:

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up a cron job for renewal.

## Load Balancing

### Define Upstream Servers

```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:3000;
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Load Balancing Methods

**Round Robin** (default):

```nginx
upstream backend {
    server server1.example.com;
    server server2.example.com;
}
```

**Least Connections**:

```nginx
upstream backend {
    least_conn;
    server server1.example.com;
    server server2.example.com;
}
```

**IP Hash** (session persistence):

```nginx
upstream backend {
    ip_hash;
    server server1.example.com;
    server server2.example.com;
}
```

**Weighted**:

```nginx
upstream backend {
    server server1.example.com weight=3;
    server server2.example.com weight=1;
}
```

## Health Checks

Add health check parameters:

```nginx
upstream backend {
    server server1.example.com max_fails=3 fail_timeout=30s;
    server server2.example.com max_fails=3 fail_timeout=30s;
    server server3.example.com backup;
}
```

Parameters:
- `max_fails`: Number of failed attempts before marking server down
- `fail_timeout`: Time to wait before retrying
- `backup`: Only used when primary servers are down

## Caching Configuration

Enable caching for better performance:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 60m;
        proxy_cache_valid 404 10m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;

        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Create cache directory:

```bash
sudo mkdir -p /var/cache/nginx
sudo chown www-data:www-data /var/cache/nginx
```

## WebSocket Support

For applications using WebSockets:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

## Rate Limiting

Protect against abuse:

```nginx
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    listen 80;
    server_name example.com;

    location / {
        limit_req zone=mylimit burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

## Security Headers

Add security headers:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

## Logging Configuration

Custom log format:

```nginx
log_format custom '$remote_addr - $remote_user [$time_local] '
                  '"$request" $status $body_bytes_sent '
                  '"$http_referer" "$http_user_agent" '
                  'rt=$request_time uct="$upstream_connect_time" '
                  'uht="$upstream_header_time" urt="$upstream_response_time"';

server {
    access_log /var/log/nginx/myapp_access.log custom;
    error_log /var/log/nginx/myapp_error.log warn;
}
```

## Performance Tuning

Optimize Nginx performance:

```nginx
# /etc/nginx/nginx.conf

worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
```

## Monitoring and Debugging

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### Test Configuration

```bash
sudo nginx -t
```

### View Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

### View Access Logs

```bash
sudo tail -f /var/log/nginx/access.log
```

### Enable Stub Status

```nginx
server {
    listen 8080;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

Access at: `http://localhost:8080/nginx_status`

## Troubleshooting

### 502 Bad Gateway

Check if backend is running:

```bash
curl http://localhost:3000
```

Check Nginx error logs:

```bash
sudo tail -f /var/log/nginx/error.log
```

### 504 Gateway Timeout

Increase timeout values:

```nginx
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;
```

### Permission Denied

Check SELinux (CentOS/RHEL):

```bash
sudo setsebool -P httpd_can_network_connect 1
```

## Conclusion

You now have a production-ready Nginx reverse proxy with:

- SSL/TLS encryption
- Load balancing
- Caching
- Security headers
- Rate limiting
- Performance optimization

Monitor your setup regularly and adjust configurations based on your application's needs.

## 常见问题 (FAQ)

### 什么是反向代理？

反向代理是位于后端服务器前的服务器，接收客户端请求并转发到后端。与正向代理不同，反向代理代表服务器而非客户端。主要用于负载均衡、SSL 终止、缓存和安全防护。Nginx 是最流行的反向代理服务器之一。

### Nginx 和 Apache 哪个更好？

Nginx 在高并发场景下性能更优，内存占用更少，特别适合静态内容和反向代理。Apache 配置更灵活，.htaccess 支持更好。对于现代 Web 应用和微服务架构，推荐使用 Nginx。许多大型网站同时使用两者，Nginx 作为前端反向代理，Apache 处理动态内容。

### 如何配置 Nginx SSL/TLS？

使用 Let's Encrypt 获取免费 SSL 证书，通过 Certbot 自动配置。配置 `ssl_certificate` 和 `ssl_certificate_key` 指令，启用 HTTP/2，配置安全的加密套件。使用 `ssl_protocols TLSv1.2 TLSv1.3` 禁用旧协议。定期更新证书并监控过期时间。

### Nginx 反向代理如何处理 WebSocket？

添加 `proxy_http_version 1.1`、`proxy_set_header Upgrade $http_upgrade` 和 `proxy_set_header Connection "upgrade"` 指令。确保后端应用支持 WebSocket。配置合适的超时时间（如 `proxy_read_timeout 3600s`）以保持长连接。测试连接稳定性和断线重连机制。

### 如何优化 Nginx 性能？

调整 `worker_processes` 和 `worker_connections`，启用 gzip 压缩，配置缓存，使用 `sendfile` 和 `tcp_nopush`。启用 HTTP/2，配置合理的超时值。监控连接数和响应时间，根据实际负载调整参数。使用 `nginx -t` 验证配置，用 `ab` 或 `wrk` 进行压力测试。

---

**相关教程：**
- [Nginx 性能优化指南](/posts/nginx-performance) - 深入优化技巧
- [Let's Encrypt SSL 证书管理](/posts/certbot-ssl) - 自动化证书管理
- [Nginx 安全最佳实践](/posts/nginx-security) - 加固 Nginx 安全
- [Docker 与 Nginx 集成](/posts/example-docker-tutorial) - 容器化部署
