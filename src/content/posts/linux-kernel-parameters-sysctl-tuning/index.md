---
title: "Tuning a Linux listen backlog with sysctl and ss"
description: "Measure the effective TCP listen backlog, rehearse a reversible somaxconn change and verify the setting again after a service restart or reboot."
pubDate: 2026-04-15
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux sysctl Tuning: Kernel Parameters Every Server Admin Should Know"
category: "linux"
tags: [Linux, sysctl, Kernel, Performance]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A web worker falls behind while accepting connections. Check the listening socket before changing a system-wide limit. On Linux the effective completed-connection queue is capped by both the backlog requested by the application and `net.core.somaxconn`. A small application backlog remains small even if the kernel ceiling is raised. The SYN queue is a different part of the connection path.

## Observe a listener in a test VM

Record the current ceiling. In a second terminal, start this loopback listener with Python 3. The program accepts no connections during this short observation. Stop it with Ctrl-C when done.

```bash
sysctl net.core.somaxconn
python3 -c 'import socket,time; s=socket.socket(); s.bind(("127.0.0.1",18083)); s.listen(8192); time.sleep(300)'
```

In the first terminal run `ss -lnt 'sport = :18083'`. For the listening socket, `Send-Q` shows the backlog limit and `Recv-Q` shows connections waiting to be accepted. On a host starting at 4096, a request for 8192 is capped at 4096. A snapshot with an empty queue provides no evidence that the live application needs a larger setting.

## Distinguish a trial from a boot setting

On the isolated VM, save the initial value and try a temporary setting:

```bash
before=$(sysctl -n net.core.somaxconn)
sudo sysctl -w net.core.somaxconn=8192
sysctl -n net.core.somaxconn
```

Recreate the **test listener** so it calls `listen()` again. Inspect the new socket. If the value was already 8192, choose a different supported trial value and request a matching backlog. Record listener limits as well as latency or connection errors under a representative load. If the application cannot accept connections quickly enough, increasing the queue may just extend the wait.

Restore the runtime value with `sudo sysctl -w net.core.somaxconn="$before"`. For an accepted production change, use a dedicated file under `/etc/sysctl.d/` containing the chosen setting, apply that file and verify after reboot. Check existing configuration for an override before adding it. Removing a file alone does not undo a running value: restore the saved setting and recheck the listener. [Linux network sysctls](https://docs.kernel.org/networking/ip-sysctl.html) · [systemd sysctl.d](https://www.freedesktop.org/software/systemd/man/latest/sysctl.d.html)

## Verification on November 25, 2026

Linux 6.8.0-147 initially capped the listener at 4096. Recreating it after the temporary setting produced a Send-Q of 8192. A dedicated sysctl.d file also yielded 8192 after a VM reboot. Removing the test file and resetting the runtime value restored 4096.
