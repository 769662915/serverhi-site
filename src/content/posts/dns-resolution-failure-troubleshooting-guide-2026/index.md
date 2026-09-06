---title: "DNS Resolution Failures: A Systematic Guide to Diagnosing and Fixing DNS Issues on Linux"
description: "Your server can't reach the internet but the network is fine? DNS is probably the problem. Here's a methodical approach to diagnosing and fixing DNS resolution failures."
pubDate: 2026-08-31
coverImage: "./cover.webp"
coverImageAlt: "Sysadmin desk with dual monitors showing DNS lookup terminals and a coiled network cable"
category: "troubleshooting"
tags: ["DNS", "Linux", "troubleshooting", "networking", "systemd-resolved"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Basic Linux command line knowledge"
  - "Understanding of networking fundamentals"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 24.04", "Debian 12", "Rocky Linux 9"]
---

## DNS Resolution Failures: A Systematic Guide to Diagnosing and Fixing DNS Issues on Linux

You SSH into your server, try to `apt update`, and get a wall of "Could not resolve" errors. The network interface is up, you can ping the gateway, and the IP configuration looks correct. But nothing resolves. This is one of the most common server issues, and it is almost always a DNS problem.

DNS failures are frustrating because the symptoms are vague. "Temporary failure in name resolution" tells you almost nothing about what is wrong. This guide walks through a systematic diagnostic workflow that narrows down the cause in minutes instead of hours. The approach is designed to be followed in order: each step eliminates a category of problems, so you do not waste time chasing the wrong cause.

The key insight behind this workflow is that DNS resolution involves a chain of components: your application asks the system resolver, the resolver checks local files, then queries configured nameservers, which may forward to other servers. A failure at any point in this chain produces the same vague error message. By testing each component independently, you can pinpoint exactly where the chain breaks.

Each step in this guide includes the specific commands to run, what the expected output looks like, and what to do when the output indicates a problem. Most DNS issues resolve within the first three steps. The later steps handle less common but equally frustrating scenarios like DNSSEC failures, firewall rules, and stale cache entries.

## Step 1: Confirm It Is Actually DNS

Before diving into DNS configuration, verify that the problem is DNS and not general network connectivity.

```bash
# Test direct IP connectivity (bypasses DNS entirely)
ping -c 3 8.8.8.8

# Test DNS resolution
ping -c 3 google.com
```

If the IP ping works but the hostname ping fails, you have confirmed a DNS issue. If both fail, the problem is network connectivity, not DNS, and you should look at your interface configuration, routing, and firewall rules first.

```bash
# Quick DNS resolution test
nslookup google.com

# More detailed DNS test
dig google.com
```

The `dig` command gives you the most information. If it returns an answer, DNS is working for that query. If it returns `SERVFAIL`, `NXDOMAIN`, or times out, something is wrong with the resolver chain. Pay attention to the `Query time` field in the dig output. A query time of 0ms usually means the result came from cache, while times above 200ms suggest the query had to travel to a remote server and back.

You can also test with `curl`, which is a practical way to verify DNS is working for real applications:

```bash
curl -v https://example.com 2>&1 | grep -i "resolved\|connected"
```

The verbose output will show which IP address curl resolved the hostname to, confirming that DNS is functioning for application-level requests.

## Step 2: Check Your DNS Configuration

DNS configuration on Linux lives in several places, and which one matters depends on your system setup.

```bash
# Check what DNS servers your system is using
cat /etc/resolv.conf

# Check if systemd-resolved is managing DNS
resolvectl status
```

The output of `cat /etc/resolv.conf` will tell you which nameservers your system is trying to use. If the file is empty, has no nameserver entries, or points to servers that do not exist, that is your problem.

On modern Ubuntu and Debian systems, `/etc/resolv.conf` is typically a symlink managed by systemd-resolved:

```bash
ls -la /etc/resolv.conf
# Output: /etc/resolv.conf -> ../run/systemd/resolve/stub-resolv.conf
```

If this symlink is broken or pointing to the wrong target, DNS will fail. Check the actual contents:

```bash
cat /run/systemd/resolve/stub-resolv.conf
```

The file should contain at least one `nameserver` line pointing to an IP address. If it points to `127.0.0.53`, that is the systemd-resolved stub resolver, which is normal. If it points to a non-existent server or is empty, you have found the problem. Multiple nameserver entries are fine and actually recommended for redundancy and reliability.

A common scenario is that the symlink gets overwritten by a DHCP client or a manual edit. When this happens, systemd-resolved stops managing DNS, and the system falls back to whatever is in the broken file. Checking the symlink target and restoring it to the stub resolver path usually fixes this immediately.

## Step 3: Test Direct Resolution

To isolate whether the problem is with your resolver configuration or with the DNS servers themselves, query a known-good public DNS server directly.

```bash
# Query Google's DNS directly (bypasses local resolver)
dig @8.8.8.8 google.com

# Query Cloudflare's DNS directly
dig @1.1.1.1 google.com
```

If direct queries work but your system's DNS resolution fails, the issue is in your resolver configuration, not in the DNS servers. If direct queries also fail, you may have a firewall issue blocking DNS traffic (UDP port 53, and sometimes TCP port 53).

```bash
# Check if DNS traffic is being blocked
sudo iptables -L -n | grep -E "53|dns"
sudo nft list ruleset | grep -E "53|dns"
```

Also test with the `host` command, which provides a simpler output format:

```bash
host google.com 8.8.8.8
```

If this works, your DNS servers are reachable. The problem is in how your system uses them.

## Step 4: Check systemd-resolved

On systems using systemd-resolved (Ubuntu 18.04+, most modern distros), the resolver service manages DNS caching and forwarding.

```bash
# Check if systemd-resolved is running
systemctl status systemd-resolved

# Check its DNS configuration
resolvectl status

# Flush the DNS cache (common fix for stale entries)
sudo resolvectl flush-caches

# Query through systemd-resolved directly
resolvectl query google.com
```

If `resolvectl status` shows no DNS servers configured, or the servers are listed as unreachable, the problem is in the upstream configuration. Check `/etc/systemd/resolved.conf`:

```bash
cat /etc/systemd/resolved.conf
```

The `[Resolve]` section should have at least one `DNS=` entry. If it does not, or if the entries point to servers that are not reachable from your network, add working nameservers:

```ini
[Resolve]
DNS=8.8.8.8 1.1.1.1
```

Then restart the service:

```bash
sudo systemctl restart systemd-resolved
```

If systemd-resolved is not installed at all, you are using the traditional resolver. In that case, edit `/etc/resolv.conf` directly to add nameservers.

Flushing the DNS cache is one of the most common fixes for intermittent DNS failures. When a DNS server returns a negative response (domain does not exist, or server timed out), systemd-resolved caches that negative response for a period. If the issue was temporary, the cached negative response will continue to cause failures until the cache expires. Flushing the cache forces a fresh lookup.

## Step 5: Check /etc/nsswitch.conf

The `/etc/nsswitch.conf` file controls the order in which your system resolves names. The `hosts:` line determines whether your system checks local files first, DNS first, or some combination.

```bash
grep hosts /etc/nsswitch.conf
# Typical output: hosts: files dns
```

The `files` entry means your system checks `/etc/hosts` first. The `dns` entry means it then queries DNS. If the order is reversed or `dns` is missing entirely, DNS resolution will not work as expected.

If someone has modified this file to remove `dns`, add it back:

```bash
sudo sed -i 's/^hosts:.*/hosts: files dns/' /etc/nsswitch.conf
```

## Step 6: Check /etc/hosts

While `/etc/hosts` is usually used to override DNS for specific hostnames, a malformed entry can sometimes interfere with resolution.

```bash
cat /etc/hosts
```

Look for lines that might be overriding common domains, or entries with incorrect formatting. A missing newline at the end of the file can also cause parsing issues on some systems.

## Step 7: Check Firewall Rules

DNS uses UDP port 53 for standard queries and TCP port 53 for large responses or zone transfers. If your firewall blocks these ports, DNS resolution will fail.

```bash
# Check iptables
sudo iptables -L -n -v | grep -E "^[0-9].*53"

# Check if firewalld is active
sudo firewall-cmd --list-all 2>/dev/null

# Check UFW status
sudo ufw status verbose 2>/dev/null
```

If you find rules blocking port 53, you need to allow DNS traffic:

```bash
# For iptables
sudo iptables -I INPUT -p udp --dport 53 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 53 -j ACCEPT

# For firewalld
sudo firewall-cmd --permanent --add-port=53/udp
sudo firewall-cmd --permanent --add-port=53/tcp
sudo firewall-cmd --reload
```

## Step 8: Check for DNS Timeout and Retry Issues

Sometimes DNS works but is slow, and the default timeout settings cause applications to give up before getting a response.

```bash
# Test DNS resolution time
dig google.com | grep "Query time"
```

If query times are consistently above 500ms or returning timeouts, the DNS servers might be overloaded or unreachable. Try switching to different nameservers:

```bash
# Temporarily test with Google DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Test resolution
dig google.com
```

If this fixes the issue, update your DNS configuration permanently to use the working nameservers.

## Step 9: Check for DNSSEC Issues

DNSSEC validation failures can cause domains to appear unreachable even though DNS is technically working.

```bash
# Test DNSSEC validation
dig google.com +dnssec

# Check if systemd-resolved has DNSSEC issues
resolvectl status | grep -i dnssec
```

If DNSSEC is causing problems, you can temporarily disable it in systemd-resolved:

```bash
sudo sed -i 's/^#DNSSEC=.*/DNSSEC=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

This is a temporary fix. The proper solution is to identify and fix the DNSSEC configuration issue.

## Step 10: Check Log Files

When all else fails, check the system logs for DNS-related errors.

```bash
# Check systemd-resolved logs
journalctl -u systemd-resolved --since "1 hour ago"

# Check for general networking issues
journalctl -u networking --since "1 hour ago"

# Check syslog for DNS errors
grep -i "dns\|resolv\|name.*resolution" /var/log/syslog | tail -20
```

Log entries often reveal the specific error that command-line tools obscure. Look for timeout errors, SERVFAIL responses, or connection refused messages that indicate specific failure modes. The journalctl output is particularly useful because it shows timestamps, which help you correlate DNS failures with other events on the system, such as network reconnections or service restarts.

## Quick Reference: Common DNS Fixes

| Problem | Fix |
|---------|-----|
| `/etc/resolv.conf` is empty | Add `nameserver 8.8.8.8` |
| systemd-resolved not running | `sudo systemctl start systemd-resolved` |
| DNS cache stale | `sudo resolvectl flush-caches` |
| Firewall blocking port 53 | Allow UDP/TCP 53 in firewall rules |
| DNSSEC validation failing | Temporarily set `DNSSEC=no` in resolved.conf |
| `/etc/nsswitch.conf` missing dns | Add `dns` to the hosts line |
| Wrong resolver order | Ensure `hosts: files dns` in nsswitch.conf |

## Preventing DNS Issues

A few configuration habits prevent most DNS problems:

1. **Always have at least two nameservers.** If your primary DNS server goes down, the secondary keeps things running. Configure at least two in `/etc/resolv.conf` or `resolved.conf`.

2. **Use reliable public DNS as fallback.** Google (8.8.8.8), Cloudflare (1.1.1.1), and Quad9 (9.9.9.9) are good secondary options.

3. **Monitor DNS resolution.** A simple cron job that runs `dig google.com` and alerts on failure can catch DNS issues before users notice.

4. **Document your DNS setup.** If you use custom DNS servers, internal resolvers, or split-horizon DNS, document the configuration so troubleshooting does not start from scratch every time.

5. **Back up your DNS configuration.** Before making changes to `/etc/resolv.conf`, `resolved.conf`, or `nsswitch.conf`, save a copy. DNS misconfigurations are easy to make and hard to diagnose without knowing what the working state was.
