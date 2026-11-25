---
title: "Apache or Nginx for a reverse proxy? Compare the same route"
description: "Forward the same loopback application through Apache 2.4 and Nginx, check the path mapping, and choose based on existing modules and operations."
pubDate: 2026-04-19
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Apache as Reverse Proxy: Configuration, Performance, and Comparison with Nginx"
category: "server-config"
tags: [Apache, Reverse Proxy, Server Config, Web Server]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Suppose clients request `/app/health` while your service exposes `/health`. Both Apache HTTP Server and Nginx can translate the path. The useful comparison is which configuration your team can validate and maintain alongside its existing authentication, certificates and logging.

## Use one small upstream

On a lab host, create a fresh directory with a file named `health` containing `available`, and serve it only on loopback. Check the upstream directly before adding a proxy.

```bash
lab=$(mktemp -d)
printf 'available\n' > "$lab/health"
python3 -m http.server 19000 --bind 127.0.0.1 --directory "$lab"
```

In another terminal, `curl -fsS http://127.0.0.1:19000/health` should return `available`. Use separate test hosts or distinct listen ports for the frontend servers.

### An Apache 2.4 virtual host

On Debian/Ubuntu enable the `proxy` and `proxy_http` modules (for example with `a2enmod`). In an enabled test site, use an unused loopback port. Define the `Listen` directive only once across all included files.

```apache
Listen 127.0.0.1:19001
<VirtualHost 127.0.0.1:19001>
    ServerName proxy.example.test
    ProxyRequests Off
    ProxyPass        "/app/" "http://127.0.0.1:19000/"
    ProxyPassReverse "/app/" "http://127.0.0.1:19000/"
</VirtualHost>
```

The matched prefix is replaced for forwarding. `ProxyPassReverse` adjusts relevant upstream redirect headers for clients. Validate with `apachectl configtest`, reload the lab server and fetch `http://127.0.0.1:19001/app/health`. [Apache reverse proxy guide](https://httpd.apache.org/docs/2.4/howto/reverse_proxy.html)

### An Nginx server block

Place this in the lab instance's `http` context. The URI `/` at the end of `proxy_pass` replaces the matching `/app/` prefix. Omitting that URI in this simple location passes the original path through, which our sample backend does not serve.

```nginx
server {
    listen 127.0.0.1:19002;
    location /app/ {
        proxy_pass http://127.0.0.1:19000/;
    }
}
```

Run `nginx -t`, reload and fetch `http://127.0.0.1:19002/app/health`. Both public paths should return the same body as the direct request. If the backend access log contains `/app/health`, the path mapping differs from the intended one. [Nginx proxy_pass URI rules](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)

## Pick the smaller operational change

An existing Apache deployment that relies on an authentication module can often add this mapping inside its current virtual host. Verify the protected path and a rejected anonymous request after the change. A team already deploying Nginx server blocks and monitoring its upstream errors can use the same release and rollback process for a new service. For an HTTP-to-HTTPS backend redirect, test the client's final Location as well as the 200 path.

These examples compare routing behavior. To compare throughput on your system, hold TLS, request mix, backend and connection reuse constant, then record errors and tail latency at the same concurrency. A static file served by a local Python process gives no general performance ranking.

## Verification on November 25, 2026

Apache 2.4.58 and Nginx 1.24.0 forwarded the same `/app/health` request to one backend and both returned `available`. When the backend stopped, the Nginx route returned 502. Restarting just the backend restored the original Nginx route to HTTP 200.
