---
title: "Load Balancing with HAProxy: Production Guide"
description: "Configure HAProxy for high availability and load distribution. This guide covers configuration, health checks, SSL termination, and advanced deployment patterns."
pubDate: 2026-02-08
coverImage: "./cover.webp"
coverImageAlt: "HAProxy load balancer distributing traffic to multiple servers"
category: "server-config"
tags: ["HAProxy", "load balancing", "high availability", "reverse proxy", "deployment"]
---

## Introduction

Load balancing distributes incoming network traffic across multiple servers, ensuring no single server becomes overwhelmed while providing redundancy against failures. HAProxy (High Availability Proxy) stands as one of the most widely deployed load balancers worldwide, powering critical infrastructure for organizations ranging from small startups to Fortune 500 companies. Its combination of performance, flexibility, and reliability makes it a top choice for production deployments.

HAProxy operates at layer 4 (TCP) and layer 7 (HTTP), enabling both generic TCP load balancing and application-aware routing for HTTP traffic. It supports numerous algorithms from simple round-robin to sophisticated least-connection and source-based distribution. Health checking mechanisms automatically remove failed servers from rotation, while session persistence ensures users remain connected to the same server when required.

This comprehensive guide walks you through HAProxy deployment for production environments. You will configure basic and advanced load balancing, implement health checks, set up SSL termination, and understand deployment patterns that maximize availability and performance. By the end, you will have a production-ready HAProxy configuration that serves as the entry point for your infrastructure.

## Understanding Load Balancing

Before configuration, understanding load balancing concepts helps you make informed architectural decisions.

Load balancers sit between clients and servers, accepting incoming connections and distributing them according to configured rules. This intermediary position enables centralized traffic management, SSL termination, request inspection, and automatic failover without client awareness.

Four main load balancing algorithms determine how connections distribute across servers. Round-robin selects servers in sequence, equally distributing load when servers have similar capacity. Weighted round-robin assigns different numbers of connections based on server capability. Least-connections routes to the server with fewest active connections, adapting to varying request times. Source hashing consistently routes requests from the same client IP to the same server, enabling session persistence without dedicated cookies.

Health checking ensures only functional servers receive traffic. TCP checks verify basic connectivity. HTTP checks validate application-level responses. Active checks probe servers periodically, while passive checks learn from observed traffic patterns.

## Installing HAProxy

HAProxy installation requires minimal dependencies and works on all major Linux distributions.

### Package Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install haproxy

# RHEL/CentOS
sudo yum install haproxy

# Verify installation
haproxy -v
```

### Docker Installation

For containerized deployments:

```bash
# Run HAProxy in Docker
docker run -d \
  --name haproxy \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro \
  --restart always \
  haproxy:2.8
```

### Source Installation (Latest Version)

For environments requiring the newest features:

```bash
# Install build dependencies
sudo apt install build-essential libssl-dev libpcre3-dev libsystemd-dev

# Download and compile
cd /tmp
wget https://www.haproxy.org/download/2.8/src/haproxy-2.8.0.tar.gz
tar xzf haproxy-2.8.0.tar.gz
cd haproxy-2.8.0
make -j$(nproc) TARGET=linux-glibc USE_PCRE=1 USE_OPENSSL=1 USE_SYSTEMD=1
sudo make install

# Create user and service files
sudo useradd -r haproxy
sudo cp admin/systemd/haproxy.service /etc/systemd/system/
sudo systemctl daemon-reload
```

## Basic Configuration

HAProxy configuration uses a declarative syntax defining frontends (listeners) and backends (server pools).

### Configuration Structure

```bash
# /etc/haproxy/haproxy.cfg

# Global settings apply to entire HAProxy process
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 50000
    nbproc 1
    nbthread 4
    cpu-map auto:1/1-4 0-3

# Default settings apply to all frontend/backend sections
defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    timeout http-request 10000ms
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 500 /etc/haproxy/errors/500.http

# Frontend defines how requests enter HAProxy
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/
    mode http
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_websocket hdr_beg(Connection) -i upgrade
    use_backend ws_backend if is_websocket
    default_backend web_backend

# Backend defines the pool of servers
backend web_backend
    mode http
    balance roundrobin
    cookie SERVERID insert indirect nocache
    option httpchk HEAD /
    http-check expect status 200
    server web1 10.0.0.10:80 check cookie s1
    server web2 10.0.0.11:80 check cookie s2
    server web3 10.0.0.12:80 check cookie s3

# Statistics interface
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats realm "HAProxy Statistics"
    stats auth admin:secure_password
```

### Starting and Managing HAProxy

```bash
# Test configuration syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Start HAProxy
sudo systemctl start haproxy

# Enable automatic startup
sudo systemctl enable haproxy

# View status
sudo systemctl status haproxy

# Reload configuration without dropping connections
sudo systemctl reload haproxy
```

## Load Balancing Algorithms

Choosing the right algorithm affects performance and user experience.

### Round Robin

Simple sequential distribution, equally balancing when servers have similar capacity:

```bash
backend web_backend
    balance roundrobin
    server web1 10.0.0.10:80 check
    server web2 10.0.0.11:80 check
```

### Weighted Distribution

Assign different weights to servers based on capacity:

```bash
backend web_backend
    balance static-rr
    server web1 10.0.0.10:80 weight 100 check
    server web2 10.0.0.11:80 weight 50 check
```

### Least Connections

Route to server with fewest active connections, ideal for varying request times:

```bash
backend api_backend
    balance leastconn
    server api1 10.0.0.20:8080 check
    server api2 10.0.0.21:8080 check
```

### Source/IP Hashing

Consistent routing for same client, enables session without cookies:

```bash
backend sticky_backend
    balance source
    server app1 10.0.0.30:8000 check
    server app2 10.0.0.31:8000 check
```

## Health Checks

Health checking prevents routing traffic to failed servers.

### Basic TCP Checks

```bash
backend web_backend
    option tcplog
    server web1 10.0.0.10:80 check
    server web2 10.0.0.11:80 check inter 5000 downinter 10000
```

### HTTP Health Checks

```bash
backend api_backend
    option httpchk GET /health
    http-check expect status 200
    server api1 10.0.0.20:8080 check
    server api2 10.0.0.21:8080 check
```

### Advanced Health Check Options

```bash
backend web_backend
    # Check every 5 seconds, mark down after 2 failed checks
    server web1 10.0.0.10:80 check inter 5000 fall 2 rise 3
    
    # Custom check method
    option httpchk GET /api/health HTTP/1.1\r\nHost:\ api.example.com
    http-check expect status 200 string OK
```

## SSL Termination

Terminate SSL at HAProxy to centralize encryption management.

### Certificate Configuration

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/haproxy/server.key \
  -out /etc/haproxy/server.crt

# Combine certificate and key
cat /etc/haproxy/server.crt /etc/haproxy/server.key > /etc/haproxy/certs/combined.pem

# Use multiple certificates
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/ no-sslv3 no-tlsv10 no-tlsv11 no-tls-tickets
```

### Let's Encrypt Integration

Automate certificate management with Certbot and HAProxy:

```bash
# Install Certbox integration
sudo apt install certbot-haproxy

# Obtain certificate
sudo certbot certonly --preferred-challenges http \
  --haproxy -d api.example.com

# Configure HAProxy to reload certificates
frontend https_front
    bind *:443 ssl crt /etc/letsencrypt/live/api.example.com/haproxy.pem
```

### TLS Security Settings

```bash
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/ \
        ciphers AES256+EECDH:AES256+EDH:!aNULL \
        no-sslv3 no-tlsv10 no-tlsv11 \
        prefer-client-ciphers \
        strict-sni

    # HSTS header
    http-response set-header Strict-Transport-Security max-age=31536000
```

## Advanced Configuration

Production deployments often require advanced features for reliability and control.

### ACL-Based Routing

Route traffic based on various conditions:

```bash
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/

    # Path-based routing
    acl api_path path_beg /api
    acl static_path path_beg /static /images
    acl websocket_conn hdr(Upgrade) -i websocket

    # Domain-based routing
    acl api_domain hdr(host) -i api.example.com
    acl admin_domain hdr(host) -i admin.example.com

    use_backend api_backend if api_path or api_domain
    use_backend static_backend if static_path
    use_backend admin_backend if admin_domain
    use_backend ws_backend if websocket_conn
    default_backend web_backend
```

### Rate Limiting

Protect backend servers from overload:

```bash
frontend http_front
    bind *:80

    # Limit connections per IP
    stick-table type ip size 100k expire 30s store conn_rate(30s)
    tcp-request connection track-sc1 src
    tcp-request connection reject if { src_conn_rate gt 50 }

    # Limit requests per minute
    stick-table type ip size 100k expire 1m store req_rate(1m)
    http-request deny if { src_req_rate gt 200 }

    default_backend web_backend
```

### Circuit Breaker

Prevent cascading failures:

```bash
backend web_backend
    mode http
    balance roundrobin
    server web1 10.0.0.10:80 check rise 2 fall 3
    server web2 10.0.0.11:80 check rise 2 fall 3
    
    # Enable slowstart
    option slowstart
    server web1 10.0.0.10:80 check slowstart 60000
```

## High Availability Patterns

Production deployments require redundancy beyond single HAProxy instances.

### Keepalived for Virtual IP

Create a floating IP that automatically fails over:

```bash
# /etc/keepalived/keepalived.conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass secure_password
    }
    virtual_ipaddress {
        10.0.0.100/24 dev eth0
    }
}
```

### Multiple HAProxy Instances

Run HAProxy on multiple servers with a load balancer in front or use DNS round-robin:

```bash
# DNS configuration
api.example.com.    IN A    10.0.0.10
api.example.com.    IN A    10.0.0.11

# Add health checks at DNS level
api.example.com.    IN A    10.0.0.100
```

## Monitoring and Logging

Visibility into HAProxy operation enables proactive management.

### Statistics Dashboard

Enable the built-in statistics interface:

```bash
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 5s
    stats show-node
    stats auth admin:secure_password
```

### Logging Configuration

```bash
# /etc/rsyslog.conf
$ModLoad imudp
$UDPServerRun 514

# /etc/rsyslog.d/haproxy.conf
if $programname == 'haproxy' then /var/log/haproxy.log
& stop

# Restart services
sudo systemctl restart rsyslog
sudo systemctl restart haproxy
```

### Log Analysis

```bash
# View recent logs
tail -f /var/log/haproxy.log

# Analyze response codes
cat /var/log/haproxy.log | awk '{print $12}' | sort | uniq -c | sort -rn

# Monitor active connections
echo "show sess" | sudo nc -U /run/haproxy/admin.sock | wc -l
```

## Troubleshooting Common Issues

Common HAProxy problems have straightforward solutions.

### Servers Not Receiving Traffic

```bash
# Verify backend servers are up
echo "show backend" | sudo nc -U /run/haproxy/admin.sock

# Check server status
echo "get weight web_backend/web1" | sudo nc -U /run/haproxy/admin.sock

# Verify firewall rules
sudo iptables -L -n | grep 10.0.0
```

### SSL Certificate Errors

```bash
# Verify certificate files
openssl x509 -in /etc/haproxy/certs/server.crt -text -noout

# Check certificate expiration
openssl x509 -enddate -noout -in /etc/haproxy/certs/server.crt

# Verify key matches certificate
openssl x509 -noout -modulus -in /etc/haproxy/certs/server.crt | openssl md5
openssl rsa -noout -modulus -in /etc/haproxy/certs/server.key | openssl md5
```

### Performance Issues

```bash
# Check connection limits
echo "show info" | sudo nc -U /run/haproxy/admin.sock | grep CurrConns

# View session rate
echo "show stat" | sudo nc -U /run/haproxy/admin.sock | grep web_backend

# Monitor system resources
htop
iotop
```

## Conclusion

HAProxy provides enterprise-grade load balancing with the flexibility to serve diverse infrastructure requirements. Start with basic round-robin balancing and SSL termination, add health checks for reliability, and implement ACL-based routing as your architecture grows. Monitor actively and configure rate limiting to protect your backends.

For critical production deployments, implement high availability through keepalived or cloud-native load balancing. Regular monitoring and capacity planning ensure your load balancer handles traffic growth without becoming a bottleneck.

---

**Related Guides:**
- [Nginx Reverse Proxy Configuration](/posts/nginx-reverse-proxy)
- [Docker Swarm vs Kubernetes](/posts/docker-swarm-vs-kubernetes)
- [CI/CD Pipeline Setup](/posts/cicd-pipeline-setup)