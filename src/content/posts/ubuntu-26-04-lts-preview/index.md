---
title: "Upgrading Ubuntu Server to 26.04 LTS from 22.04 or 24.04"
description: "Choose the supported LTS upgrade path, check an image or package dependency, and rehearse the service checks and recovery steps before scheduling downtime."
pubDate: 2026-03-07
updatedDate: 2026-11-25
author: "ServerHi Editorial Team"
category: "linux"
coverImage: "./cover.webp"
coverImageAlt: "Ubuntu 26.04 LTS desktop preview showing new interface and system settings"
tags: ["Ubuntu", "Linux", "Server", "Upgrade", "LTS"]
---

**Correction, November 25, 2026.** Ubuntu 26.04 LTS is **Resolute Raccoon**, released April 23, 2026. The March preview used the 24.04 codename and gave an unsupported direct upgrade path from 22.04. Its performance figures had no reproducible test conditions and have been withdrawn. [Ubuntu release announcement](https://lists.ubuntu.com/archives/ubuntu-announce/2026-April/000323.html) · [26.04 release notes](https://documentation.ubuntu.com/release-notes/26.04/)

## Pick the route from the release actually running

Read `/etc/os-release` on the machine that runs the service. A container's release string describes its userspace; check the host separately before planning a host upgrade.

| Current host | Supported LTS in-place route | What to schedule |
|---|---|---|
| 24.04 LTS | 24.04 → 26.04 | One release upgrade and a service acceptance check after reboot. |
| 22.04 LTS | 22.04 → 24.04 → 26.04 | Two release upgrades. Finish the 24.04 reboot and validation before starting the second hop. |
| Rebuilding onto a fresh host | Provision 26.04 separately, then migrate the application and its data | Test restore, traffic cutover and the rollback window. This is a fresh deployment rather than an in-place upgrade. |

Ubuntu supports consecutive LTS upgrades. The release upgrader checks whether an upgrade is currently offered. If none is offered, check your current release, package health, LTS release policy and Ubuntu's release notes before revising the window. [Ubuntu Server upgrade guide](https://ubuntu.com/server/docs/how-to/software/upgrade-your-release/)

## Rehearse one hop

1. Restore a recent backup to an isolated clone. Prove you can read an application record and reach the console without SSH. Record how long recovery takes.
2. Inventory external repositories, pinned packages, storage drivers and database major versions. Check their suppliers' support for the **next** release. For example, a database package managed by an external repository may require a separate upgrade path.
3. On the clone, record the starting state, available space and failed units. Fully update the current release using the supported Ubuntu procedure and reboot if required.

```bash
cat /etc/os-release
df -h / /boot
dpkg --audit
apt-mark showhold
systemctl --failed
do-release-upgrade -c
```

4. When the target is offered, schedule the service interruption and run `sudo do-release-upgrade` from a reliable console. Read the package-removal and configuration-file prompts. Preserve the current configuration and its backup before accepting a change. For the two-hop route, repeat this inventory on 24.04.
5. After reboot, check the OS release and running kernel, service health, mounted volumes, backup agent, and a real request through the normal application path. Compare failed units with the baseline. A working SSH login verifies only one part of the service.

## Budget the change window

Measure a representative operation on the clone using the same dataset, CPU and memory limits on both releases. Record error rate, latency and elapsed restore time. A CPU or throughput figure from a different host cannot budget your outage. Reserve time for application checks and for reverting to the known-good host or restored backup. For a staged migration, decide how you will reconcile new writes before directing clients back. [Server backup and restore drill](/posts/backup-strategies/)
