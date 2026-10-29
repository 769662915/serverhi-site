---
title: "USN-8955-1 Fixes 5 Nginx CVEs. 24.04 Stays on 1.24.0."
description: "USN-8955-1 patches five Nginx security flaws across Ubuntu releases. Here is how to audit configs, apply package updates, and verify server stability."
pubDate: 2026-10-29
coverImage: "./cover.webp"
coverImageAlt: "A small rack server rests on a sunlit wooden desk alongside a mechanical keyboard, a coiled patch cable, and a face-down printed sheet of paper."
category: "troubleshooting"
tags: ["Nginx", "troubleshooting", "Ubuntu", "security", "Linux"]
author: "ServerHi Editorial Team"
draft: false
---

Canonical issued [Ubuntu Security Notice USN-8955-1](https://ubuntu.com/security/notices/USN-8955-1) on October 26, 2026, delivering security updates for five vulnerabilities in the Nginx web server packages. The update addresses CVE-2026-15176, CVE-2026-93479, CVE-2026-95101, CVE-2026-97205, and CVE-2026-97629. Administrators upgrading production fleets encounter a package matrix spanning four separate Ubuntu releases. Each distribution maintains its baseline upstream branch while backporting the fixes released by F5 in Nginx stable version 1.30.6 and mainline version 1.31.7. If your fleet runs Ubuntu 24.04 LTS (Noble Numbat), your patched package is `nginx 1.24.0-2ubuntu7.19`. Ubuntu 24.04 remains on the 1.24 release branch, while Ubuntu 26.10 packages upstream 1.30. Ubuntu 22.04 LTS (Jammy Jellyfish) receives `nginx 1.18.0-6ubuntu14.22`, Ubuntu 26.04 LTS (Resolute) receives `nginx 1.28.3-2ubuntu1.12`, and Ubuntu 26.10 (Stonking) receives `nginx 1.30.4-7ubuntu1.1`.

Applying these packages without auditing your existing configuration files can lead to authentication bypasses or sudden worker process restarts. When upgrading Nginx binaries in place, servers can experience connection drops mirroring the symptoms described in [diagnosing 502 Bad Gateway responses](/posts/nginx-502-bad-gateway-troubleshooting) if worker processes drop active client sockets before new worker processes take over. In addition, previous maintenance cycles show that third-party dynamic modules built against earlier package releases can fail to load on daemon reload, identical to the behavior documented during [dynamic module ABI mismatches](/posts/nginx-module-abi-mismatch-apt-2026). This guide reviews the documented conditions for all five CVEs, the directives that trigger them, methods to test whether your configurations match vulnerable patterns, and the procedure to swap binaries in memory without dropping client connections.

## Distribution package matrix and version verification

The official update covers the primary source package `nginx` alongside its flavor variants: `nginx-core`, `nginx-full`, `nginx-light`, and `nginx-extras`. Because Canonical maintains stable package baselines across Long Term Support releases, the version strings differ between releases. Administrators monitoring vulnerability scanners often question why version 1.24 is reported on Noble systems. This behavior is standard for Debian and Ubuntu packaging: security patches are backported directly into the distribution package version string while retaining the stable base version.

Not all five CVEs apply to every Ubuntu release. According to [USN-8955-1](https://ubuntu.com/security/notices/USN-8955-1), CVE-2026-95101 only affected Ubuntu 26.04 LTS and Ubuntu 26.10, while CVE-2026-97629 only affected Ubuntu 24.04 LTS, Ubuntu 26.04 LTS, and Ubuntu 26.10. Consequently, Ubuntu 22.04 LTS is not affected by CVE-2026-95101 or CVE-2026-97629. The remaining three issues (CVE-2026-15176, CVE-2026-93479, and CVE-2026-97205) apply across all four releases.

| Ubuntu Release | Code Name | Installed Upstream Base | Patched Distribution Version | Applicable CVEs in USN-8955-1 | Release Impact Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Ubuntu 22.04 LTS | Jammy Jellyfish | 1.18.0 | `1.18.0-6ubuntu14.22` | CVE-2026-15176, CVE-2026-93479, CVE-2026-97205 | Not affected by CVE-2026-95101 or CVE-2026-97629 |
| Ubuntu 24.04 LTS | Noble Numbat | 1.24.0 | `1.24.0-2ubuntu7.19` | CVE-2026-15176, CVE-2026-93479, CVE-2026-97205, CVE-2026-97629 | Not affected by CVE-2026-95101 |
| Ubuntu 26.04 LTS | Resolute | 1.28.3 | `1.28.3-2ubuntu1.12` | All 5 CVEs | Affected by all five vulnerabilities |
| Ubuntu 26.10 | Stonking | 1.30.4 | `1.30.4-7ubuntu1.1` | All 5 CVEs | Affected by all five vulnerabilities |

You can check the exact version of the package currently installed on your server using standard package tools against the local dpkg database:

```bash
dpkg -l | grep -E "nginx-(core|full|light|extras|common)"
```

To compare the installed package version against what your configured Ubuntu security mirrors offer before executing an upgrade, check the apt cache policy:

```bash
apt-cache policy nginx
```

If the installed version matches or exceeds the table above, the backported patches are present on disk. However, having the updated package installed on disk does not mean running Nginx worker processes are executing the new binary image. If systemd reloads configuration without executing the new binary, worker processes continue serving traffic with the previous code.

## Vendor severity ratings compared to NVD CVSS scores

There is a distinct gap between how the upstream vendor rates these issues and how external vulnerability databases score them. On the official [NGINX Security Advisories page](https://nginx.org/en/security_advisories.html), F5 rates all five vulnerabilities as "Severity: medium", with fixes delivered in upstream versions 1.31.7 and 1.30.6. In contrast, the National Vulnerability Database assigns CVSS v4.0 scores of 9.2 to three of the issues, reflecting theoretical worst-case impact if remote memory corruption leads to code execution.

Presenting both metrics allows infrastructure teams to prioritize their remediation schedules accurately:

| CVE Identifier | Flaw Summary | Upstream Vulnerable Range | Fixed Upstream | Upstream Vendor Severity | NVD CVSS v4.0 Base | NVD CVSS v3.1 Base |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [CVE-2026-15176](https://nvd.nist.gov/vuln/detail/CVE-2026-15176) | Buffer overflow when using alias with rewrite | 0.1.29–1.31.6 | 1.31.7+, 1.30.6+ | Medium | 9.2 (Critical) | 8.1 (High) |
| [CVE-2026-93479](https://nvd.nist.gov/vuln/detail/CVE-2026-93479) | Buffer overflow in script evaluation | 1.31.2–1.31.6, 1.30.0–1.30.5 | 1.31.7+, 1.30.6+ | Medium | 9.2 (Critical) | 8.1 (High) |
| [CVE-2026-95101](https://nvd.nist.gov/vuln/detail/CVE-2026-95101) | Request body injection in HTTP/3 | 1.25.0–1.31.6 | 1.31.7+, 1.30.6+ | Medium | 6.9 (Medium) | 5.3 (Medium) |
| [CVE-2026-97629](https://nvd.nist.gov/vuln/detail/CVE-2026-97629) | Session forgery when using TLS session tickets | 1.23.2–1.31.6 | 1.31.7+, 1.30.6+ | Medium | 8.3 (High) | 6.5 (Medium) |
| [CVE-2026-97205](https://nvd.nist.gov/vuln/detail/CVE-2026-97205) | Use-after-free when using asynchronous file I/O (AIO) | 0.8.11–1.31.6 | 1.31.7+, 1.30.6+ | Medium | 9.2 (Critical) | 8.1 (High) |

Upstream NGINX rates them medium because each flaw requires specific configuration directives and modules to be enabled before any attack vector opens. Understanding these prerequisites allows teams to determine whether their servers are exposed while scheduling package upgrades.

## Auditing server configurations for USN-8955-1 vulnerabilities

All five CVEs in this security advisory depend on specific configuration directives and feature selections. Before rolling out package updates across web tiers, administrators should run configuration audits to identify virtual hosts containing the vulnerable directive combinations.

The first issue, [CVE-2026-15176](https://nvd.nist.gov/vuln/detail/CVE-2026-15176), affects upstream NGINX from 0.1.29 through 1.31.6. According to NVD and the advisory details, this flaw exists in `ngx_http_core_module` when a `location` is configured that uses the `alias` directive together with `rewrite` rules and a `set` or `return` directive referencing the `$request_filename` variable. The same vulnerability occurs when `$request_filename` is used in an `access_log` format directive. An unauthenticated attacker sending crafted HTTP requests can trigger a heap buffer overflow in the worker process, leading to a process restart or potential code execution.

To search your `/etc/nginx` configuration files for combinations of `alias` and rewrite rules, run this command:

```bash
grep -rnE "(alias|rewrite|\$request_filename)" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/
```

If your configuration contains server blocks matching this pattern, the server requires updating or reconfiguration:

```nginx
location /media/ {
    alias /srv/storage/media/;
    rewrite ^/media/(.*)$ /media/v2/$1 break;
    set $audit_file $request_filename;
}
```

The second issue, [CVE-2026-93479](https://nvd.nist.gov/vuln/detail/CVE-2026-93479), is titled "Buffer overflow in script evaluation" by NGINX and affects upstream versions 1.31.2–1.31.6 and 1.30.0–1.30.5. NVD documentation specifies that this flaw occurs when a `map` directive uses regular expression matching and the `root` directive or access log format references the map's regex capture variables before referencing the map output variable. It can also occur when using a non-cacheable variable in a string expression under certain conditions. Crafted HTTP requests can trigger a heap buffer overflow in the worker process.

Scan your virtual host configurations for regular expression mapping patterns:

```bash
grep -rnE "map\s+\$.*~" /etc/nginx/
```

If maintenance windows prevent immediate package deployment, you can mitigate CVE-2026-15176 by removing direct references to `$request_filename` from rewrite blocks, and you can mitigate CVE-2026-93479 by restructuring map blocks to avoid referencing capture variables before the output variable is evaluated.

## HTTP/3 request body injection in CVE-2026-95101

The third issue, [CVE-2026-95101](https://nvd.nist.gov/vuln/detail/CVE-2026-95101), is titled "Request body injection in HTTP/3" by NGINX and affects upstream versions 1.25.0 through 1.31.6. In the National Vulnerability Database record, the flaw is located in `ngx_http_v3_module`. When NGINX is configured to serve HTTP/3 and reverse proxy requests with `proxy_request_buffering on;` (the default setting), an unauthenticated remote attacker can inject data into proxied upstream requests.

In [USN-8955-1](https://ubuntu.com/security/notices/USN-8955-1), Canonical clarifies the distribution impact: "This issue only affected Ubuntu 26.04 LTS and Ubuntu 26.10." Ubuntu 22.04 LTS and Ubuntu 24.04 LTS repositories do not include this vulnerability. Organizations managing Ubuntu 26.04 LTS, Ubuntu 26.10, or custom builds with HTTP/3 enabled must verify their proxy buffering configurations.

To verify whether your server is listening for HTTP/3 QUIC traffic over UDP, run:

```bash
ss -ulpn | grep -E "(:443|nginx)"
```

Next, search your configuration files for QUIC listen statements:

```bash
grep -rn "quic" /etc/nginx/
```

If your configuration serves HTTP/3 traffic and acts as a reverse proxy, inspect whether request buffering is explicitly configured:

```bash
grep -rn "proxy_request_buffering" /etc/nginx/
```

Because `proxy_request_buffering` defaults to `on` when omitted, unpatched servers running HTTP/3 reverse proxies are exposed. To mitigate CVE-2026-95101 prior to package installation, configure `proxy_request_buffering off;` within affected `http`, `server`, or `location` blocks and reload the daemon:

```nginx
location /api/ {
    proxy_pass http://backend_upstream;
    proxy_request_buffering off;
}
```

Disabling request buffering passes incoming payload chunks directly to the backend application as they arrive from the client. When planning this workaround, verify that backend application servers handle unbuffered streaming request bodies before applying it fleet-wide.

## TLS session ticket authentication bypass in CVE-2026-97629

The fourth vulnerability, [CVE-2026-97629](https://nvd.nist.gov/vuln/detail/CVE-2026-97629), titled "Session forgery when using TLS session tickets", affects upstream NGINX from 1.23.2 through 1.31.6. The flaw resides in `ngx_http_ssl_module`. According to the NVD advisory text, when NGINX is configured with `ssl_session_cache shared:name:size` without an explicit `ssl_session_ticket_key` file directive to automatically rotate SSL session ticket keys, a remote unauthenticated attacker can forge client SSL sessions in a non-deterministic manner that is beyond the attacker's control. An attacker can leverage this issue to bypass verification of client certificates (`ssl_verify_client`).

Canonical notes in [USN-8955-1](https://ubuntu.com/security/notices/USN-8955-1) that CVE-2026-97629 only affected Ubuntu 24.04 LTS, Ubuntu 26.04 LTS, and Ubuntu 26.10. Ubuntu 22.04 LTS is not affected. For organizations running mutual TLS (mTLS) gateways on Ubuntu 24.04, this advisory requires attention because forged resumed sessions could bypass client certificate access controls.

To identify whether your virtual hosts enforce client certificate authentication, search for the verification directive:

```bash
grep -rn "ssl_verify_client" /etc/nginx/
```

If `ssl_verify_client` is set to `on` or `optional`, check whether explicit session ticket key files are defined:

```bash
grep -rn "ssl_session_ticket_key" /etc/nginx/
```

If your configuration enables a shared session cache but omits `ssl_session_ticket_key`, the server is subject to session forgery. You can test SSL session resumption behavior from the command line using OpenSSL:

```bash
openssl s_client -connect 127.0.0.1:443 -reconnect -tls1_2
```

To eliminate exposure on unpatched systems, disable TLS session tickets in your SSL configuration:

```nginx
ssl_session_tickets off;
```

Disabling session tickets requires clients to perform full handshakes or use server-side session IDs via `ssl_session_cache`, removing the session ticket parsing path.

## Worker process crashes from AIO SSI subrequests in CVE-2026-97205

The fifth vulnerability in USN-8955-1 is [CVE-2026-97205](https://nvd.nist.gov/vuln/detail/CVE-2026-97205), titled "Use-after-free when using asynchronous file I/O (AIO)" by NGINX. It affects upstream versions from 0.8.11 through 1.31.6.

According to NVD documentation, this vulnerability exists in `ngx_http_core_module`. When asynchronous file I/O (`aio`) is enabled in certain configurations, processing a Server Side Includes (SSI) page containing `include virtual` commands may trigger a Use-After-Free (UAF) condition in the NGINX worker process. NVD notes that this flaw may allow remote attackers to cause memory corruption or a worker process crash, resulting in a denial of service or potential code execution.

When an unpatched server encounters this flaw, worker processes terminate abruptly, generating 502 Bad Gateway responses for active client connections. To check whether worker processes have crashed on your server, query the system journal and kernel ring buffer:

```bash
journalctl -u nginx --since "24 hours ago" | grep -i "segfault"
dmesg -T | grep nginx
```

Search your configuration tree to locate blocks that combine asynchronous I/O with Server Side Includes:

```bash
grep -rnE "(aio\s+on|aio\s+threads|ssi\s+on)" /etc/nginx/
```

If updating the package must wait for a scheduled maintenance window, disable asynchronous I/O in location blocks that process SSI documents by specifying `aio off;`. If your sites do not utilize Server Side Includes, ensure `ssi off;` is set across your virtual hosts.

## Step-by-step upgrade procedure without dropping connections

Deploying security updates to high-traffic web servers requires a deliberate approach to avoid dropping active connections. Running `systemctl restart nginx` stops the master process and closes listening sockets, causing connection resets for clients mid-request. If a syntax mistake prevents the daemon from starting up again, the site experiences total downtime, requiring emergency troubleshooting for [systemd service startup failures](/posts/systemd-failed-service-troubleshooting).

The official NGINX documentation on [Controlling nginx](https://nginx.org/en/docs/control.html) outlines an online binary upgrade procedure using POSIX signals (`USR2`, `WINCH`, and `QUIT`) that replaces the executable in memory without dropping client sockets.

### Step 1: Update package repositories and verify candidate versions

Refresh the local apt package repository cache:

```bash
sudo apt update
```

Inspect the candidate version offered by Ubuntu security mirrors:

```bash
apt-cache policy nginx
```

Verify that the candidate version matches the patched release for your distribution: `1.24.0-2ubuntu7.19` on Ubuntu 24.04 LTS, `1.18.0-6ubuntu14.22` on Ubuntu 22.04 LTS, `1.28.3-2ubuntu1.12` on Ubuntu 26.04 LTS, or `1.30.4-7ubuntu1.1` on Ubuntu 26.10.

### Step 2: Validate existing configuration syntax

Before updating or reloading any package files, test your current configuration files for syntax errors:

```bash
sudo nginx -t
```

Proceed only when the output confirms that the syntax is acceptable and the test is successful.

### Step 3: Upgrade the distribution packages

Install the updated packages using `--only-upgrade` to prevent unintended updates to other system packages:

```bash
sudo apt install --only-upgrade nginx nginx-common
```

If your installation uses flavor packages such as `nginx-core`, `nginx-full`, or `nginx-extras`, specify them explicitly:

```bash
sudo apt install --only-upgrade nginx-core nginx-common
```

When apt completes installation, the new executable is written to disk at `/usr/sbin/nginx`. However, as documented in [Controlling nginx](https://nginx.org/en/docs/control.html), the running master process and worker processes continue executing the previous binary image until explicitly instructed to reload the executable.

### Step 4: Perform a zero-downtime binary swap

To switch running processes to the new binary without dropping TCP connections, execute the online upgrade sequence described in [Controlling nginx](https://nginx.org/en/docs/control.html).

First, read the master process PID:

```bash
cat /run/nginx.pid
```

Send the `USR2` signal to the active master process:

```bash
sudo kill -USR2 $(cat /run/nginx.pid)
```

As documented by NGINX, the master process renames its process ID file by adding the `.oldbin` suffix (creating `/run/nginx.pid.oldbin`), then executes the new binary file from disk. The new master process starts new worker processes while keeping the original listening sockets open.

Verify that both the old and new master processes are running:

```bash
ps aux | grep nginx
```

Both sets of worker processes now accept incoming requests concurrently. Next, send the `WINCH` signal to the old master process:

```bash
sudo kill -WINCH $(cat /run/nginx.pid.oldbin)
```

The `WINCH` signal instructs the old master process to notify its worker processes to shut down gracefully. Old workers stop accepting new connections and terminate after finishing their in-flight requests.

Send test requests to confirm that the new worker processes are handling traffic properly:

```bash
curl -I -k https://127.0.0.1/
```

If the new binary encounters issues, [Controlling nginx](https://nginx.org/en/docs/control.html) documents rollback: sending `HUP` to the old master process restarts its worker processes without re-reading configuration, after which sending `QUIT` to the new master process shuts down the new binary cleanly.

If the new binary operates normally, send the `QUIT` signal to the old master process to finish the upgrade:

```bash
sudo kill -QUIT $(cat /run/nginx.pid.oldbin)
```

The old master process exits, leaving the updated binary handling all server traffic.

## Post-patch verification and service hardening

After the binary upgrade finishes, verify that running processes match the updated package and inspect for unlinked file descriptors.

Check the compiled version string of the active Nginx executable:

```bash
nginx -V
```

Verify that systemd reports the active service status without errors:

```bash
systemctl status nginx
```

Check the proc filesystem to ensure no deleted executable or library handles remain open by lingering worker processes:

```bash
sudo lsof -n | grep nginx | grep -i "deleted"
```

If this command produces output referencing `/usr/sbin/nginx (deleted)` or old shared library versions, specific worker processes were not terminated during the signal cycle and must be stopped by PID.

Finally, review transport layer security settings in `/etc/nginx/nginx.conf`. To avoid session ticket forgery vectors while maintaining TLS performance, configure dedicated session ticket key files with key rotation, or disable session tickets if full handshakes are acceptable:

```nginx
http {
    ssl_session_cache shared:SSL:20m;
    ssl_session_timeout 4h;
    ssl_session_tickets off;
    
    client_max_body_size 50m;
}
```

Confirm the active binary hash against package metadata using `dpkg --verify nginx` to ensure file integrity on disk.
