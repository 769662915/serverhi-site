---
title: "The Ted Backdoor Was Built Into HAProxy. Verify the Binary."
description: "Rapid7 found a DPRK toolkit compiled into HAProxy 2.8.12, not exploited through it. Here is how to checksum your reverse proxy, catch /tmp pipes, and stop building load balancers on the edge box."
pubDate: 2026-09-08
coverImage: "./cover.webp"
coverImageAlt: "A rack-mounted server with a highlighted network cable and a printed checksum sheet on the desk"
category: server-config
tags: ["HAProxy", "Linux", "supply chain", "reverse proxy", "binary integrity"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "35 minutes"
prerequisites:
  - "Root or sudo on the load-balancer host"
  - "HAProxy installed from packages or a known git tag"
osCompatibility:
  - "Ubuntu 24.04"
  - "Debian 12"
  - "RHEL 9"
---

A load balancer that still answers health checks is not therefore clean.

[Rapid7's writeup, via The Hacker News on September 4](https://thehackernews.com/2026/09/new-ted-backdoor-hides-inside-victims.html), describes a Linux toolkit compiled into the victims' own HAProxy 2.8.12 builds. Two South Korean organizations, automotive and media. The implant name is sitting in debug strings: ted. Rapid7's confidence on a North Korean attribution is medium. SecurityWeek's follow-up on [September 7](https://www.securityweek.com/north-korean-hackers-deploy-new-linux-espionage-toolkit) adds the boring part that should scare operators more than the flag: this is not a HAProxy CVE. Someone already had code execution, then they replaced the binary.

If you run HAProxy in front of anything you care about, the job this week is integrity, not a panic patch of a CVSS score that does not exist.

## What ted actually does

The backdoor is a custom filter built with HAProxy's own API, memory pools, and scheduler. Legitimate traffic keeps balancing. Selected clients get a different page.

[The Hacker News summary of Rapid7](https://thehackernews.com/2026/09/new-ted-backdoor-hides-inside-victims.html) is specific about the handshake. Operator traffic comes back on a raw socket under a normal-looking HTTP/1.0 200 header. Beacon, file transfer, shell, config replace. A page is rewritten only when several checks pass: a User-Agent, URL and referer patterns, then either a client IP on a whitelist (exact and /24) or an operator key in Accept-Language that skips the address filter. Your ordinary synthetic probe from a monitoring POP will not trip it.

To stay off dashboards, ted decrements HAProxy's own counters. [Rapid7](https://www.rapid7.com/blog/post/tr-dprk-apts-ted-backdoor-curlrat-target-south-korean-media-automotive-sectors) describes hardcoded offsets for 2.8.12: backend and frontend connection counts, global actconn, 64-bit byte and request counters with underflow guards, peak metrics only when they equal 1. Then it builds FIFOs under `/tmp` named like `/tmp/t[ID]_w.pipe`, keyed on the connection ID. Master-worker mode gets extra pipe handling.

That is why "haproxy -vv still says 2.8.12" is not a health check. A trojan rebuild prints the same version string.

## The rest of the toolkit on the same host

Ted is the noisy-clever piece. The rest is classic host takeover.

The stager fires only if HAProxy or cron is already running, and only after it confirms root. It overwrites `crond` and stamps the new file with the birth time of `/usr/bin/ssh`. It then strips the strings `tmp`, `wget`, `cron`, and `crond` from root's bash history and from logs including `auth.log` and `audit/audit.log`. Rapid7 also found the same code in trojanized `sshd`, `agetty`, `atd`, and `polkitd`. A companion RAT, curlRAT, beacons every 12 hours by default, 30 seconds if an operator flag is set, and refuses to run unless it finds a marker file that says the host is virtualized.

SecurityWeek says initial access on the documented victims was a Groupware login portal on an edge box, with a trojanized SSH daemon harvesting passwords for the next hop. If your HAProxy host is also your jump box, you already lost twice.

HAProxy 2.8.12 shipped November 8, 2024. The 2.8 branch was at 2.8.28 on August 27, 2026, with 529 fixes on that interval including one critical and 16 major. Upgrade anyway. Then understand the limit: upgrading packages does not restore a binary an attacker already replaced. You are not closing a vulnerability in 2.8.12. You are asking whether the file on disk is the file you think it is.

The IoC domains Rapid7 published were NXDOMAIN when The Hacker News checked them on September 4. Useful for old logs. Useless as a block list you can feel smug about.

## Verify the binary, not the version string

Do this on every HAProxy host, including "temporary" ones.

**1. Find the running file.**

```bash
pid=$(pidof haproxy | awk '{print $1}')
ls -l /proc/$pid/exe
readlink -f /proc/$pid/exe
```

If `exe` does not point at the package path you expect (`/usr/sbin/haproxy` on Debian, `/usr/sbin/haproxy` on RHEL), stop and treat the box as hostile.

**2. Ask the package manager.**

Debian/Ubuntu:

```bash
dpkg -V haproxy
```

RHEL family:

```bash
rpm -V haproxy
```

A modified binary, changed size, or vanished config file is the whole point of this command. Empty output is the happy path for package installs.

**3. Compare a hash to a known-good build.**

If you build from source, you should already have a SHA-256 recorded in the change ticket. If you do not, that is the process bug ted is counting on. Pull 2.8.28 (or whatever you intend to run) on a clean builder that is not the edge host:

```bash
sha256sum /usr/sbin/haproxy
```

Copy that digest into whatever you use for host inventory. Re-check on a cron that is *not* the system `crond` if you cannot yet prove `crond` is clean. A systemd timer running from a signed unit on a separate management network is boring and sufficient.

**4. Look for the cheap filesystem tells.**

```bash
ls -l /tmp/t*_w.pipe /tmp/t*_r.pipe 2>/dev/null
stat /usr/sbin/crond /usr/bin/crond /usr/sbin/sshd
```

Pipes keyed on HAProxy connection IDs do not belong in `/tmp` on a stock proxy. A `crond` whose timestamp matches `ssh` is a Rapid7 detail, not a proof, but it is a reason to restore from known-good packages.

**5. Do not trust `haproxy -vv` alone.**

Same string, different inode. If you compile with `USE_OBLIGATORY_PROFILING` jokes or extra modules, record that in the hash note so next year's on-call does not "fix" a mismatch by recompiling on the server.

## Stop compiling the edge on the edge

The operational failure here is not "forgot to patch HAProxy." It is "the reverse proxy host was a compiler, a git client, and a place you debug with wget."

Build HAProxy in CI. Pin a git tag. Sign the artifact. Deploy with the same mechanism you use for nginx, which we already treated as [a config surface, not a pet](/posts/nginx-security-hardening-guide-2026). The HAProxy host should not have a compiler, should not have a world-writable build directory, and should not be the box your Groupware portal shares with the internet.

If a developer "just needed to test a Lua filter" on prod, that is how you get a 2.8.12 with a custom filter you did not write. Ted's authors used the filter API because it was there.

Rootless and socket discipline still apply. Last week's note on [not handing AI agents the host Docker socket](/posts/docker-socket-ai-agent-isolation-2026) is the same instinct: the process that touches raw traffic should not also be able to rewrite `/usr/sbin`. Kernel issues like [CVE-2026-53362](/posts/linux-cve-2026-53362-ipv6-privilege-escalation) are a different ticket. Close them. They are not a substitute for knowing the bytes in `haproxy`.

## Logs that still help when the binary lies

Ted hides inside HAProxy counters. It does not hide your upstream app logs or your packet capture.

Correlate:

- Edge 200s whose `bytes_out` is larger than the origin response, especially for clients that never hit application access logs.
- Requests with odd `Accept-Language` values that are not locales (operator key override, per Rapid7).
- Long-lived connections to the proxy that are not WebSockets you know about.
- Outbound DNS or HTTP from the proxy host itself. A load balancer should not browse.

A 24-hour `tcpdump` on the frontend VIP is loud and still cheaper than a year of a patient implant. Filter for HTTP/1.0 200s that are not your normal stack (most modern origins speak 1.1 or 2). Rapid7 says operator output rides a raw socket under that header. That is a hunt query, not a guarantee.

Memory is the other channel Rapid7 named. If you have an EDR that can dump the HAProxy process, look for filter modules that are not in your compile list. If you do not have EDR, you still have `/proc/$pid/maps`. Unknown `.so` mappings in the proxy process are a stop-the-line event.

curlRAT's 12-hour default is slow on purpose. A one-hour netstat snapshot will miss it. A week of outbound connection accounting will not. The VM marker file is a tell on cloud guests: attackers assumed virtualized hosts. Bare metal is not immune; it just was not the sample Rapid7 published.

Do not copy IoC domain lists into production block sets and call it done. THN found those names NXDOMAIN. Historical SIEM search, yes. Tomorrow's firewall policy, no.

## Package pinning so the next rebuild is yours

On Debian, pin `haproxy` to the version you hashed:

```bash
printf 'Package: haproxy\nPin: version 2.8.28*\nPin-Priority: 1001\n' > /etc/apt/preferences.d/haproxy
```

On RHEL, versionlock the RPM. Unattended upgrades that pull a random rebuild from a PPA you forgot about are how a clean hash becomes a mystery on Friday.

Config belongs in git. Binary belongs in the package. Lua filters belong in CI. The Groupware portal that SecurityWeek says started this chain belongs on a different VLAN than the proxy, with a different identity provider, and without a compiler. That sentence is architecture, not a HAProxy flag.

If you cannot explain who last built `/usr/sbin/haproxy` on this host, you are the target shape Rapid7 described: a 2.8.12 from November 2024, still running, custom enough that a filter did not look weird.

## A sane baseline for the next 24 hours

- Inventory every process listening on 80/443/4433. Confirm the binary path.
- `dpkg -V` / `rpm -V` on haproxy, cron, openssh-server, polkit.
- Hash compare against a builder, not against another prod peer. Peers can share the infection.
- Grep old proxy logs for Accept-Language oddities and for clients that got 200s your app never logged.
- Restore any mismatched binary from a signed package, then rotate credentials that ever traversed that box. Trojaned sshd was in the same kit.

If the hash matches and the pipes are absent, you are not "proven clean." You are current. Put the hash in inventory, turn on a systemd timer that diffs it weekly, and keep compilers off the VIP host. The Rapid7 sample lived in 2.8.12 long enough for offsets to be hardcoded. That is months of looking like a healthy proxy.

Two more operator notes. First, master-worker HAProxy (MODE_MWORKER) got extra pipe handling in the Rapid7 notes. If you run that mode, `/tmp` hygiene is part of the proxy, not a developer laptop habit. Second, a trojaned crond that clones ssh timestamps will survive a package upgrade of haproxy. Verify cron and sshd in the same pass, every time, or you will clean the balancer and leave the stager. If this host also terminates TLS, treat certificate keys as burned until you know sshd was clean. A keylogger on the same box as the proxy is how "just HTTP inspection" becomes full credential loss. Take a disk image before you start swapping binaries if the host looks wrong. You only get one first copy.

Ted is a reminder that load balancers are code execution with a privileged view of HTTP. If you only patch CVEs, you will keep running a polite, well-balanced implant.
