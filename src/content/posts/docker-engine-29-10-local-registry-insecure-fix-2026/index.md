---
title: "Docker Engine 29.10 Broke Your Local Registry Push"
description: "Docker Engine 29.10.0 stops treating loopback addresses as insecure registries once you set insecure-registries. Diagnose the failure and fix it three ways."
pubDate: 2026-11-28
coverImage: "./cover.webp"
coverImageAlt: "A server rack with a small local registry node glowing beside larger container hosts in a dim data room"
category: docker
tags: ["Docker", "Docker Engine", "Troubleshooting", "Security", "DevOps"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A Linux host running Docker Engine 29.10.0 or later, or one you plan to upgrade"
  - "A local registry on the same host, for example a registry:3 container on port 5000"
  - "Read access to /etc/docker/daemon.json and permission to reload the daemon"
osCompatibility:
  - "Linux hosts running Docker Engine 29.10.0 or later"
  - "Docker Engine 29.9.3 or earlier, for the before-and-after comparison"
---

A routine upgrade can break a push that worked the day before. Docker Engine 29.10.0, released on 16 November 2026, changed how the daemon treats loopback addresses when you configure an insecure registry list. If your host pushes test images to a registry on localhost and also lists another registry in `/etc/docker/daemon.json`, the push to localhost now fails with an HTTP error. Nothing about the registry changed. The daemon stopped trusting loopback on its own.

The follow-up release, [Docker Engine 29.10.1](https://docs.docker.com/engine/release-notes/29#29100), arrived on 24 November 2026 with security fixes, and it keeps the new behavior. This guide explains what changed, how to confirm the change is the cause on your host, and three ways to fix it, from the smallest edit to the one Docker recommends for the long term.

## How to tell if this is your problem

The symptom is specific. A push or pull to a local registry that used plain HTTP starts failing right after the engine upgrade, while pushes to the other registries in your configuration keep working. The error names HTTPS even though the registry only speaks HTTP:

```text
failed to do request: Head "https://localhost:5000/v2/lab/busybox/blobs/sha256:68fe...":
http: server gave HTTP response to HTTPS client
```

A pull fails the same way, wrapped in a daemon response:

```text
Error response from daemon: failed to resolve reference "localhost:5000/lab/busybox:1":
failed to do request: Head "https://localhost:5000/v2/lab/busybox/manifests/1":
http: server gave HTTP response to HTTPS client
```

If the local registry uses a self-signed certificate instead of plain HTTP, the message is different. The daemon now checks the certificate, so the push fails with `tls: failed to verify certificate: x509: certificate signed by unknown authority`. Both errors point at the same change.

Check the engine version first. Anything from 29.10.0 onward has the new rule, and 29.9.3 and earlier do not:

```bash
docker version --format '{{.Server.Version}}'
```

Then look at the insecure registry list the daemon is actually using:

```bash
docker info 2>/dev/null | sed -n '/Insecure Registries:/,/^ [A-Z]/p'
```

On 29.9.3, a host with `{"insecure-registries": ["reg.lab:5000"]}` in `daemon.json` shows three entries: `reg.lab:5000`, `127.0.0.0/8`, and `::1/128`. On 29.10.0, the same file shows only `reg.lab:5000`. The loopback ranges are gone. The machine-readable form shows the same gap:

```bash
docker info --format '{{json .RegistryConfig.InsecureRegistryCIDRs}}'
```

That command prints `["127.0.0.0/8","::1/128"]` on 29.9.3 and `null` on 29.10.0 with the same configuration file. When the list has no loopback entry, the daemon treats localhost as a normal secure registry, tries HTTPS first, and a registry that only speaks HTTP answers with a plain HTTP response. That response is the error message.

One more check narrows it down. If your `daemon.json` has no `insecure-registries` key at all, this change does not affect you. Loopback stays insecure by default in that case, and a plain HTTP registry on localhost keeps working. The breakage only hits hosts that set the key, which is exactly the hosts that also run a private registry or a company mirror.

## What changed in Docker Engine 29.10.0

Before 29.10.0, the daemon added the loopback ranges to its insecure registry list unconditionally. It did this even when you configured your own list, so a host with a LAN registry in `daemon.json` still pushed to `localhost:5000` over HTTP with no extra configuration. The [Docker Engine 29 release notes](https://docs.docker.com/engine/release-notes/29#29100) describe the new rule in one sentence: if you explicitly configure `insecure-registries` in `daemon.json` or use `--insecure-registry`, Docker Engine no longer automatically treats loopback addresses (`127.0.0.0/8` and `::1/128`) as insecure registries.

The change comes from [moby/moby#53868](https://github.com/moby/moby/pull/53868), and the release notes carry a warning with it. After upgrading, pulls and pushes to local registries that use HTTP or untrusted TLS certificates may fail unless those registries are explicitly included in the insecure registry configuration. The notes point to two remedies: configure TLS with a trusted certificate, or add only the required local registry addresses, such as `localhost:5000`, to the existing configuration.

The same release gave the empty list a real meaning. Setting `"insecure-registries": []` in `daemon.json` now disables all default insecure registries. On 29.9.3 that empty list changed nothing, because the daemon added the loopback ranges back anyway. On 29.10.0 the empty list does what it says, and localhost stops accepting HTTP. The command line flag cannot express the same thing, because `--insecure-registry` does not accept an empty value.

The practical scope is wider than a developer laptop. The affected host is usually a CI runner or a build machine: it has a LAN registry configured as insecure, and it also pushes to a registry on localhost, often a `registry:2` or `registry:3` container used by a kind or k3d cluster. Teams that run a self-hosted mirror such as Harbor or Nexus already have an `insecure-registries` entry for it, and the same machine is often where test images get built and pushed locally. That combination is common, which is why this change has produced a steady stream of confused upgrade reports since 16 November.

The release notes for 29.10.0 also record that Docker Engine packages are now available for AlmaLinux, Oracle Linux, and Rocky Linux. That detail matters here for a different reason. More distributions can now install the engine from Docker's own packages, so more hosts will pick up 29.10 on their next routine update, including hosts whose local registry setup nobody has looked at in months.

## How this guide was put together

No claim in this guide comes from a run on the author's own machine. The behavior change, the dates, and the version numbers come from Docker's official release notes for Engine 29, read on 28 November 2026. The before-and-after outputs come from an independent lab reproduction published on 24 November 2026, which ran `docker:29.9.3-dind` and `docker:29.10.0-dind` side by side against two `registry:3` containers, one on plain HTTP at port 5000 and one with a self-signed certificate at port 5443. That reproduction is the second source linked below, and the error strings and command outputs quoted in this guide are the ones it recorded.

Readers can repeat the check on their own hosts with the commands in the previous section. The `docker info` output shows whether the loopback ranges are in the daemon's insecure list, and a tag and push of a small image such as `busybox:1.37` to the local registry shows whether the push actually works. If the push fails on 29.10.0 and worked on 29.9.3 with the same `daemon.json`, the version change is the cause, and the fixes below apply directly.

## Fix 1: add the local registry by name

The smallest change is to list the exact address you push to alongside the entries you already have:

```json
{
  "insecure-registries": ["reg.lab:5000", "localhost:5000"]
}
```

After a daemon restart, `localhost:5000` appears as its own index entry with `"Secure": false`, and the push works. The lab reproduction confirmed this on 29.10.0: the same tag and push that failed before the edit returned exit code 0 after it.

This is also the option the release notes recommend, which is to add only the local registry addresses you need. It keeps the insecure list as short as possible, and every entry in it is a registry you can name and justify.

The limit of this fix is that a name entry matches only that name and port. If your scripts, Compose files, or cluster manifests mix `localhost` and `127.0.0.1`, the `127.0.0.1:5000` spelling still fails with the same HTTP error, and so does a different port such as `localhost:5443`. You have to list each spelling you actually use, or use the next fix instead.

## Fix 2: restore the loopback ranges

To get the old behavior back exactly, add the two ranges Docker used to insert for you:

```json
{
  "insecure-registries": ["reg.lab:5000", "127.0.0.0/8", "::1/128"]
}
```

The daemon reference describes the CIDR form: every registry whose name resolves to an address inside the range counts as insecure. One entry therefore covers `localhost`, `127.0.0.1`, and any other loopback spelling, on any port, including the self-signed registry on port 5443. In the lab reproduction, 29.10.0 showed the CIDRs again after this edit, and every local push worked, including the self-signed one.

This is the quickest way to unblock a CI runner after the upgrade, and it is the right choice when several tools and manifests address the local registry in different ways. The tradeoff is scope. It marks any port on the loopback address as insecure, including the self-signed registry, which Docker then stops verifying. That is acceptable on a build host where loopback traffic never leaves the machine, and it is the wrong choice on a host where the loopback registry is reachable from anywhere else. Keep the list short when you can, and use this form when the list of spellings is too long to enumerate by hand.

## Fix 3: trust the registry certificate

For a registry that already serves TLS with a private or self-signed certificate, there is a cleaner answer. You do not need an insecure registry entry at all. Docker reads extra CA certificates from `/etc/docker/certs.d/<host:port>/`, and the certificate check then passes on its own. In the lab reproduction, the certificate was created with a subject alternative name covering both `localhost` and `127.0.0.1`, and the file went into a folder named after the registry:

```bash
ls /etc/docker/certs.d/localhost:5443/
ca.crt
```

With that file in place, the push to `localhost:5443` worked on 29.10.0 even though the daemon configuration still listed only `reg.lab:5000` as insecure. For rootless Docker, the folder is `~/.config/docker/certs.d` instead of `/etc/docker/certs.d`. On Linux, the CA files in that folder are merged with the system roots.

The daemon reference says insecure mode creates security vulnerabilities and should only be enabled for testing, and it recommends adding your CA to the trusted CAs instead. That is the right default for a registry that lives longer than a test run. For a plain HTTP registry, this fix means adding TLS first, which is more work than the other two fixes. A short-lived test registry on a single host does not need it. A registry that other machines or other teams rely on does.

## Reload the daemon without restarting containers

The insecure registry list is one of the options the daemon can reload without a restart. On Linux, the reload is triggered by `SIGHUP`, and the `docker.service` unit ships with `ExecReload=/bin/kill -s HUP $MAINPID`, so `sudo systemctl reload docker` sends it. In the lab reproduction, the push failed, the file was edited, and one signal was enough: the daemon log recorded `Reloaded configuration`, and the same push then succeeded.

A reload keeps running containers up, including the registry container itself, which is useful on a shared build host. A full restart would stop every container on the host, and on a CI runner that means killing whatever jobs are running. Reload first. Restart only if the reload does not take effect, and check the daemon log for the reload line before assuming the new configuration is live.

Before either one, run `dockerd --validate`. It reads the configuration file and reports errors before the daemon tries to use it, which keeps a typo in `daemon.json` from taking the daemon down.

## Three mistakes that waste an afternoon

The first mistake is setting the same option in two places. If the systemd unit or `/etc/default/docker` already passes `--insecure-registry`, adding the key to `daemon.json` makes the daemon refuse to start. The validation error names both sources:

```text
unable to configure the Docker daemon with file /etc/docker/daemon.json:
the following directives are specified both as a flag and in the configuration file:
insecure-registries: (from flag: [reg.lab:5000], from file: [localhost:5000])
```

Keep the list in one place. On 29.10.0 the flag behaves like the file, so a host that passes `--insecure-registry reg.lab:5000` alone has the same localhost problem. Move the flag entries into `daemon.json` and remove the flag, then validate.

The second mistake is writing a string instead of a list. The value must be a JSON array, even for a single registry. A file with `{"insecure-registries": "localhost:5000"}` fails validation with `cannot unmarshal string into Go struct field Config.insecure-registries of type []string`. The error message is clear once you see it, and it is easy to miss when you edit the file by hand late in the day.

The third mistake is expecting `localhost` to cover `127.0.0.1`. A name entry is not a range, and the daemon treats the two spellings as different registries. The lab reproduction showed this directly: adding `localhost:5000` fixed the `localhost:5000` push and left the `127.0.0.1:5000` push failing with the same error. Use the name your image references contain, or use the CIDR form from Fix 2, which covers both.

## What else shipped in 29.10.0 and 29.10.1

The loopback change is the one that breaks upgrades, and the rest of the release is worth a short look because it sets up the next few upgrades. The Engine API moved to OpenAPI 3.2 as its source format, with a Swagger 2.0 copy still published for existing tooling and a pinned copy for API v1.57. Tooling that reads the Swagger files should plan the move to the OpenAPI 3.2 specifications, because future API versions will not get a per-version Swagger copy. The API version itself is now 1.57.

BuildKit moved to v0.35.0 in 29.10.0 and v0.35.1 in 29.10.1. The Go runtime moved to 1.27.4, and runc in the static binaries moved to v1.5.3. The daemon gained experimental support for jobs, which are one-shot and cron-scheduled workloads managed natively by the daemon instead of an external scheduler, enabled with the opt-in extension flag `--enable-extension org.mobyproject.jobs.v0`. The embedded containerd can now be customized with configuration files in `/etc/docker/containerd.d/`, and containerd image selection on ARM64 hosts now prefers the highest image variant the host CPU supports.

The 29.10.1 patch on 24 November 2026 is a security release, and it is the version most hosts should be running now. It fixes CVE-2026-135844, an unbounded read when parsing user, group, and ID mapping files, and CVE-2026-135124, where a process in a running container could make a read-only bind mount writable while `docker cp` copied files into the container, letting the copied files modify the host directory behind that mount. It also fixes the default AppArmor profile blocking processes in the same container from signaling or tracing each other on hosts with `kernel.apparmor_restrict_unprivileged_unconfined=1`, which includes recent Ubuntu releases. If your host is still on 29.9.3, upgrade to 29.10.1 for these fixes, and apply one of the registry fixes in this guide at the same time.

Docker Desktop has been moving in parallel, and the desktop releases carry the same engine underneath. The [Docker Desktop 4.98.0 release](/posts/docker-desktop-498-startup-disk-migration-wsl/) fixed engine startup freezes, disk image migration, and WSL 3.0 errors, and the later 4.100.0 release brought the new Docker brand and Docker Engine 29.10. Desktop users who upgrade will meet the same loopback rule, so the diagnosis in this guide applies to them too. The recent [Dokploy 0.31.0 security patch](/posts/dokploy-0-31-0-cve-2026-129316/) is a separate reminder that self-hosted panels around Docker need the same upgrade discipline as the engine itself.

## Before you upgrade the next host

Inventory the local registries before you deploy the upgrade. List every registry address the host pushes to or pulls from, note which ones use HTTP or a certificate the daemon does not trust, and add each one to the insecure list or give it a trusted certificate before the upgrade runs. The release notes say the same thing, and the lab reproduction shows why the order matters: the fix is a one-line edit, and the outage is the hour spent finding it.

For most hosts, Fix 1 is enough. List the exact registry addresses, reload the daemon, and confirm the push works. For a CI runner where manifests and scripts address the registry in several spellings, Fix 2 restores the old behavior in one edit. For a registry that other hosts depend on, Fix 3 is the durable answer, and the insecure entry can go away entirely. Whichever fix you choose, run the upgrade on one host first and check the insecure list with `docker info` before rolling it out to the rest.

## Sources

- [Docker Engine version 29 release notes](https://docs.docker.com/engine/release-notes/29#29100) (Docker Docs, 29.10.0 on 16 November 2026, 29.10.1 on 24 November 2026)
- [Insecure Registry Error After Docker 29.10: 3 Proven Fixes](https://www.devopsroles.com/docker-insecure-registry-localhost/) (DevOps Roles, 24 November 2026, lab reproduction on docker:29.9.3-dind and docker:29.10.0-dind)
- [Docker Engine 29.10 breaks local registries without TLS](https://ettayeb.fr/en/devops/docker-engine-29-10-loopback-insecure-registries-en/) (Walid Ettayeb, 16 November 2026)
- [Docker Engine lifecycle](https://endoflife.date/docker-engine) (endoflife.date, latest 29.10.1 on 24 November 2026)

Contact the editorial team at mybuke.com@gmail.com with corrections or follow-up questions about this guide.
