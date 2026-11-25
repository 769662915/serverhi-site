---
title: "Test a Fail2Ban filter against real log shapes before enabling a jail"
description: "Build a filter for an application-owned denial log, test positive and negative fixtures, and check a jail's effective configuration and recovery path."
pubDate: 2026-04-10
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Advanced Fail2ban Configuration: Custom Jails, Filters, and Actions"
category: "security"
tags: [Security, Fail2ban, Linux, Brute Force]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

Fail2Ban relies on a log producer, a matching filter and a jail action. If a log line does not match the filter, increasing the ban time will make no difference. If an untrusted client can choose the address the application logs as its peer, the filter may identify somebody else. Begin with a log field supplied by a trusted server or proxy.

## Write an offline fixture

These two example records use documentation addresses. Adjust the filter to a sample from your own application and keep success events alongside failures in the test file.

```text
2026-11-25 10:11:12 serverhi-login: denied user=alice peer=192.0.2.10
2026-11-25 10:12:13 serverhi-login: accepted user=bob peer=192.0.2.11
```

Save the records as `login-sample.log` and the following as `serverhi-login.conf`. The filter matches a bounded username and the server's terminal peer field. Fail2Ban's date detector consumes the timestamp before it evaluates the expression.

```ini
[Definition]
failregex = ^\s*serverhi-login: denied user=[A-Za-z0-9_-]+ peer=<HOST>\s*$
ignoreregex =
```

```bash
fail2ban-regex login-sample.log ./serverhi-login.conf --print-all-matched
```

Expect one match and one miss. Verify that the host extracted belongs to the denied record; the accepted address should never be selected. Add examples for the actual timestamp, IPv6 and service restart messages before pointing the filter at production. [fail2ban-regex manual](https://manpages.debian.org/bookworm/fail2ban/fail2ban-regex.1.en.html)

## Assemble a jail in a test VM

Install the filter in `/etc/fail2ban/filter.d/serverhi-login.conf`. The example below is for a real application writing that exact format to `/var/log/serverhi-login.log`. The file must exist and be readable. Start with the jail disabled, choose the correct firewall action for your distribution, and keep an independent console session. The values here represent five failures in ten minutes followed by a five-minute ban.

```ini
[serverhi-login]
enabled = false
filter = serverhi-login
backend = polling
logpath = /var/log/serverhi-login.log
port = https
findtime = 10m
maxretry = 5
bantime = 5m
```

Place that stanza in `/etc/fail2ban/jail.d/serverhi-login.local`. In a disposable VM with a valid log and an approved recovery address, set `enabled = true`, run `sudo fail2ban-client -t`, and reload the service only after the check succeeds. Confirm the jail is listed by `sudo fail2ban-client status serverhi-login`. For a mistaken ban use the verified console to run `sudo fail2ban-client set serverhi-login unbanip ADDRESS` with the actual address. Recheck the log and filter before re-enabling an overbroad rule. [Fail2Ban project's configuration reference](https://github.com/fail2ban/fail2ban/blob/master/man/jail.conf.5)

## Verification on November 25, 2026

On Ubuntu 24.04.5 the supplied two-line fixture produced one match and one miss. `fail2ban-client -t` validated the jail configuration. No firewall ban was applied to a real client.
