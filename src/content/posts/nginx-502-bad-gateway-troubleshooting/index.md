---
title: "Diagnosing an Nginx 502 from the upstream error log"
description: "Distinguish a refused upstream connection, an early close and a response timeout. Check the exact backend from the proxy and verify the same request after the fix."
pubDate: 2026-04-09
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Nginx 502 Bad Gateway: A Systematic Troubleshooting Guide"
category: "troubleshooting"
tags: [Nginx, Troubleshooting, 502 Error, Web Server]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A 502 at the front door does not tell you which process to restart. Start with the failing request's time, path and host header. Find the entry in the error log for the Nginx **instance that accepted that request**. If it runs in a container, a test from the host can reach a different listener.

## Read the upstream address and the phase

These abbreviated examples show what to look for in an Nginx error log. The final status also depends on upstream retries and error handling.

| Log fragment | What it establishes | Next check |
|---|---|---|
| `connect() failed (111: Connection refused) while connecting to upstream` | The TCP connection to the listed address was refused. A stopped service, wrong port or active rejection can cause this. | Compare the upstream address with the service's listening socket on that host. |
| `upstream prematurely closed connection while reading response header from upstream` | A connection was made, but the backend closed it before a usable response header arrived. | Check the application log for that request, a worker restart, memory pressure or an HTTP/HTTPS mismatch. |
| `upstream timed out ... while reading response header from upstream` | The proxy waited for the response header until its read timeout. This commonly produces **504** if no retry succeeds. | Measure backend latency and inspect the application's database or worker queue. Raising a timeout can hide the queue. |

On a Debian/Ubuntu package installation, inspect the error log location in the active configuration. If the backend is a local HTTP service expected on port 9000, use its actual health path and Host header:

```bash
sudo nginx -t
sudo tail -n 50 /var/log/nginx/error.log
ss -ltn 'sport = :9000'
curl -sS --max-time 3 -o /dev/null -w '%{http_code} %{time_starttransfer}\n' \
  -H 'Host: app.example.test' http://127.0.0.1:9000/health
```

For a Unix socket, inspect the configured path and its access permissions for the Nginx worker instead. In Compose, a backend in a different container usually has a service DNS name; loopback belongs to the proxy's container.

## Prove the repair on the original route

If the backend is on a different port, align the upstream with the intended deployment. If the backend is down, inspect its unit or container logs before restoring it. After a **proxy configuration change**, validate the full configuration, then reload Nginx. A running backend on the right address needs no proxy restart to become reachable.

Repeat the failing path through Nginx with the same host, scheme and relevant headers. A direct health probe returning 200 while the public path still returns 502 points back to the proxy's chosen server, location or next upstream. Record both responses and check that the next error-log entry did not move to a different backend. [Nginx proxy directives](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) · [Reading a failed systemd service](/posts/systemd-failed-service-troubleshooting/)

## Verification on November 25, 2026

We sent a loopback request through Nginx 1.24.0 to a disposable HTTP service. With the backend stopped the same path returned HTTP 502 and the Nginx error log showed `Connection refused` for the upstream port. Starting the backend again restored HTTP 200 and the expected body without a proxy configuration change.
