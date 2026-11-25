---
title: "Nginx request limits: see which requests a burst allows"
description: "Configure a loopback test route, distinguish dry-run observations from enforcement, and verify a chosen HTTP 429 response and its log entry."
pubDate: 2026-04-05
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Configuring Nginx Rate Limiting: Protect Your Server from Abuse"
category: "server-config"
tags: [Nginx, Rate Limiting, Server Config, Security]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Consider an expensive search endpoint that should accept a brief burst from one client. In Nginx the zone stores state per key, the rate controls how quickly excess requests drain, and the location decides whether to delay or reject them. A limit applied to the wrong key can throttle an entire office or proxy.

## Configure a local test route

On a disposable host with the standard HTTP limit-request module, create a file included **inside the `http` context**, such as `/etc/nginx/conf.d/serverhi-rate-lab.conf` on Ubuntu. The backend block returns a short response. The frontend proxies to it so the rate limit runs in the request-processing path.

```nginx
limit_req_zone $binary_remote_addr zone=serverhi_search:1m rate=1r/s;
log_format serverhi_rate '$remote_addr $status $limit_req_status';

server {
    listen 127.0.0.1:18081;
    location / { return 200 "ok\n"; }
}
server {
    listen 127.0.0.1:18080;
    access_log /var/log/nginx/serverhi-rate-lab.log serverhi_rate;
    location /search {
        limit_req zone=serverhi_search burst=2 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:18081;
    }
}
```

Run `sudo nginx -t` and, after it succeeds, `sudo systemctl reload nginx`. One request after an idle period should return 200. In a quick series from the same loopback address, the first request and the allowed burst can pass immediately; excess requests get 429. Timing affects the exact counts.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/search
sleep 4
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/search
done
sudo tail /var/log/nginx/serverhi-rate-lab.log
```

Look for `PASSED` and `REJECTED` in the log. For a staged rollout, `limit_req_dry_run on;` records excess requests without enforcing the rejection. Behind a load balancer, verify the effective client address and trusted proxy configuration before enabling enforcement. To roll back the lab, remove only this lab configuration, validate and reload. [Nginx limit request module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

## Verification on November 25, 2026

On Nginx 1.24.0, spaced loopback requests reached the backend with HTTP 200. During the short burst, rejected requests returned 429 and the access log contained `REJECTED`. The limit was scoped to the test location and the single client address.
