---
title: "HAProxy Sticky Sessions: Session Persistence for Stateful Applications"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for haproxy sticky sessions - session persistence for stateful applications."
pubDate: 2026-04-08
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for HAProxy Sticky Sessions: Session Persistence for Stateful Applications"
category: "server-config"
tags: [HAProxy, Load Balancer, Sticky Sessions, Server Config]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why Sticky Sessions

When you scale horizontally behind a load balancer, the default behavior is to distribute requests across all backends. This works fine for stateless applications. But if your application stores session data in local memory or on disk, a user who hits server A on request 1 must hit server A on request 2, or their shopping cart vanishes.

HAProxy sticky sessions (session persistence) solve this by consistently routing a given client to the same backend server. This is sometimes called "session affinity."

## Cookie-Based Persistence

The most common approach is inserting a cookie that identifies the backend server:

```haproxy
frontend web_frontend
    bind :80
    default_backend web_backend

backend web_backend
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server web1 10.0.1.10:80 check cookie web1
    server web2 10.0.1.11:80 check cookie web2
    server web3 10.0.1.12:80 check cookie web3
```

How it works:
- First request: no cookie → HAProxy picks a server (roundrobin) → inserts `Set-Cookie: SERVERID=web1`
- Subsequent requests: browser sends `Cookie: SERVERID=web1` → HAProxy routes to web1

The `nocache` option prevents caches from storing the cookie. The `indirect` option removes the cookie from the response if the client already sent it.

## Source IP Affinity

If you can't use cookies (API clients, mobile apps), use source IP affinity:

```haproxy
backend api_backend
    balance source
    hash-type consistent
    server api1 10.0.1.20:8080 check
    server api2 10.0.1.21:8080 check
```

The `consistent` hash type minimizes redistribution when servers are added or removed. Without it, adding one server changes the hash for most clients.

## Stick Tables for Advanced Persistence

Stick tables give you more control by tracking client data in memory:

```haproxy
backend web_backend
    stick-table type ip size 200k expire 30m
    stick on src

    server web1 10.0.1.10:80 check
    server web2 10.0.1.11:80 check
```

This tracks up to 200,000 source IPs for 30 minutes. You can also stick on request headers, URL parameters, or SSL session IDs:

```haproxy
# Stick on a custom header
stick on hdr(X-User-ID)

# Stick on a URL parameter
stick on url_param(sessionid)

# Stick on SSL session ID
stick on ssl_fc_session_id
```

## Handling Backend Server Failure

When a backend fails, sticky sessions become a problem — clients stuck to a dead server get errors. HAProxy handles this with the `redispatch` option:

```haproxy
backend web_backend
    option redispatch
    cookie SERVERID insert indirect nocache
    server web1 10.0.1.10:80 check cookie web1
    server web2 10.0.1.11:80 check cookie web2
```

With `redispatch`, if a request targets a down server, HAProxy reassigns it to an available server and updates the cookie.

## Session Synchronization Between Servers

Sticky sessions are a workaround for stateful applications. The real solution is to externalize session state:

- **Redis**: Store sessions in Redis; all backends read from the same store
- **Database**: Store sessions in a shared database
- **JWT**: Use stateless tokens that don't require server-side storage

With externalized sessions, you can turn off sticky sessions entirely and use pure roundrobin:

```haproxy
backend stateless_backend
    balance leastconn
    server web1 10.0.1.10:80 check
    server web2 10.0.1.11:80 check
```

## Monitoring Stick Table Status

Check what's in your stick tables:

```bash
# Show stick table contents
echo "show table web_backend" | socat stdio /var/run/haproxy.sock

# Count entries
echo "show table web_backend" | socat stdio /var/run/haproxy.sock | wc -l

# Clear a specific entry
echo "clear table web_backend key 192.168.1.100" | socat stdio /var/run/haproxy.sock
```

## Health Check Tuning

Aggressive health checks prevent routing to dead backends:

```haproxy
backend web_backend
    option httpchk GET /health
    default-server inter 3s fall 3 rise 2
    server web1 10.0.1.10:80 check
    server web2 10.0.1.11:80 check
```

- `inter 3s`: Check every 3 seconds
- `fall 3`: Mark down after 3 failed checks
- `rise 2`: Mark up after 2 successful checks

## Summary

Sticky sessions keep stateful applications working behind a load balancer, but they come with trade-offs: uneven load distribution and fragility when backends fail. Use cookie-based persistence for web apps, source IP affinity for APIs, and external session storage as the long-term solution.