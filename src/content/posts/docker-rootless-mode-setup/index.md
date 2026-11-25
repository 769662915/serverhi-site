---
title: "Set up Rootless Docker and check which daemon handles your commands"
description: "Check subordinate user IDs and the user service, switch Docker contexts deliberately, and verify that your test workload ran on the rootless daemon."
pubDate: 2026-04-14
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Docker Rootless Mode: Running Containers Without Root Privileges for Better Security"
category: "docker"
tags: [Docker, Rootless, Security, Containers]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Rootless Docker runs the daemon and containers inside a user namespace. Adding a login to the `docker` group of the system daemon grants access to that daemon; it does not create a rootless engine. Start with a disposable Linux host and a normal login that owns a user systemd session.

## Check the account and prerequisites

Run as the intended **non-root** user. You need `newuidmap` and `newgidmap` (provided by `uidmap` on Ubuntu) and an assigned range of at least 65,536 subordinate UIDs and GIDs. An administrator should allocate non-overlapping ranges when several users share a host.

```bash
id
command -v newuidmap newgidmap
grep "^$(id -un):" /etc/subuid /etc/subgid
systemctl --user status --no-pager
docker context ls
```

On an Ubuntu host using Docker's official packages, install the rootless extras matching the engine version. The extras supply `dockerd-rootless-setuptool.sh`. Ubuntu 24.04 and later can restrict creation of unprivileged user namespaces with AppArmor. Use Docker's documented package and RootlessKit profile for that distribution. A missing user session or an unsupported kernel needs attention before install. [Docker rootless prerequisites](https://docs.docker.com/engine/security/rootless/) · [Distribution-specific notes](https://docs.docker.com/engine/security/rootless/tips/)

## Install and verify on a dedicated test host

Use a host without an active system-wide Docker installation for this setup. Record the original CLI context. Run the installer **as the login user** and verify both the service and the API it serves:

```bash
original_context=$(docker context show)
dockerd-rootless-setuptool.sh install
systemctl --user is-active docker
docker context inspect rootless --format '{{.Endpoints.docker.Host}}'
docker --context rootless info --format '{{json .SecurityOptions}}'
docker --context rootless run --rm alpine:3.22 id
```

The endpoint should be a socket belonging to the user's runtime directory. The server's security options should include `rootless`. A container process can report UID 0 **inside** its namespace. Verify the daemon's host owner separately with `ps -o user,pid,args -C dockerd`. Specifying `--context rootless` avoids confusing the two image stores or volume sets. If the API connection fails, inspect `journalctl --user -u docker -b` and the socket owner before retrying.

## Decide how the service should start

A user service can stop when its login session disappears. For a server that must keep it running after logout, have the administrator evaluate `loginctl enable-linger` for that account. Check low-port binding, cgroup delegation, storage drivers and the application's file ownership on the target host. Use a high unprivileged port for the first service. Before leaving the rehearsal, select `docker context use "$original_context"` if the installer changed your default. The rootless data directory and any volumes it contains belong to that user.

## Verification on November 25, 2026

On Ubuntu 24.04.5, the first prerequisite check found no subordinate range for the test account. After assigning unused UID and GID ranges, the user daemon’s security options included `name=rootless`. The test Alpine process reported UID 0 within its namespace. A separate rootful daemon was present for other labs; both client contexts were specified explicitly.
