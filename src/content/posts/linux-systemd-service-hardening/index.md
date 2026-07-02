---
title: "systemd Service Hardening: Sandboxing with ProtectSystem, PrivateTmp, and CapabilityBoundingSet"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for systemd service hardening: sandboxing with protectsystem, privatetmp, and capabilityboundingset."
pubDate: 2026-04-22
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for systemd Service Hardening: Sandboxing with ProtectSystem, PrivateTmp, and CapabilityBoundingSet"
category: "linux"
tags: [Linux, Systemd, Hardening, Security]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Defense in Depth for Services

A compromised service should not become a compromised server. Systemd provides built-in sandboxing that works with any service — no code changes needed.

Apply hardening via drop-in:

```bash
sudo systemctl edit my-service.service
```

## Core Directives

**Filesystem isolation:**

```ini
[Service]
ProtectHome=yes
ProtectSystem=strict
PrivateTmp=yes
ReadWritePaths=/var/lib/my-service /var/log/my-service
```

**Network restrictions:**

```ini
PrivateNetwork=yes  # No network at all
# Or: RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
```

**Capability and syscall filtering:**

```ini
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=yes
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources
```

**Kernel protection:**

```ini
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectKernelLogs=yes
```

**Memory hardening:**

```ini
MemoryDenyWriteExecute=yes
```

## Full Example: Hardened Nginx

```ini
[Service]
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/var/log/nginx /var/cache/nginx /var/run
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=yes
PrivateDevices=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources
MemoryDenyWriteExecute=yes
```

## Auditing

```bash
systemd-analyze security nginx.service
```

Aim for a score above 8.0. Start with `ProtectSystem=strict` and `NoNewPrivileges=yes` — they provide the most benefit with the fewest breakages. Add directives incrementally, testing after each change.

## Common Breakages

Nginx can't write logs → add `/var/log/nginx` to `ReadWritePaths`. Docker needs `CAP_NET_ADMIN`. Database needs data directory in `ReadWritePaths`. Test with `ausearch -m AVC -ts recent` to see denials.