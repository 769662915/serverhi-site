---
title: "Linux Network Troubleshooting: From ping to tcpdump — A Systematic Diagnostic Workflow"
description: "A step-by-step troubleshooting guide covering the full diagnostic workflow for Linux network issues, from interface checks to deep packet inspection with tcpdump."
pubDate: 2026-07-12
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux Network Troubleshooting — a systematic diagnostic workflow from ping to tcpdump"
category: "troubleshooting"
tags: [Linux, Networking, Troubleshooting, tcpdump, DNS]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "20 minutes"
prerequisites:
  - "Basic Linux command-line familiarity"
  - "Root or sudo access"
osCompatibility: ["Ubuntu 22.04+", "Debian 11+", "RHEL 9+"]
---

## Why a Systematic Approach Matters

When a production service goes down, the instinct is to SSH in and start running random commands. This wastes time and often misses the root cause. Network issues sit at a frustrating intersection: they could be your server, your cloud provider, a DNS resolver, or something in between.

A systematic, layer-by-layer approach eliminates guesswork. Start at the bottom and work up: is the interface up? Is the route correct? Is the port listening? Is DNS resolving? Answer these in order and you'll find the problem fast.

## Step 1: Is the Interface Up?

Before anything else, confirm the network interface exists and has a link.

```bash
ip link show
```

Look for `state UP` and `LOWER_UP`. If you see `state DOWN`, the interface is administratively disabled. If `NO-CARRIER`, there's no physical link.

Bring it up:

```bash
sudo ip link set eth0 up
```

For deeper link diagnostics, use `ethtool`:

```bash
sudo ethtool eth0
```

Key fields: `Speed`, `Duplex`, `Link detected`. A duplex mismatch (half vs full) or a link negotiated at 100Mb/s instead of 1Gb/s explains mysterious slowness. If `Link detected: no`, check cables, switch ports, or virtual NIC attachments.

```bash
# Check all interfaces at once
ip -br link show
```

For bonded interfaces, verify all slaves are active:

```bash
cat /proc/net/bonding/bond0
```

## Step 2: Does the Interface Have an IP?

An interface can be up but unaddressed. Check IP assignments:

```bash
ip addr show
```

If the interface lacks an IPv4 address, DHCP may have failed:

```bash
# Request a lease manually
sudo dhclient -v eth0

# Or with systemd-networkd
networkctl status eth0
```

For static IPs, verify the configuration file. On Ubuntu with netplan:

```bash
cat /etc/netplan/00-installer-config.yaml
sudo netplan apply
```

Multiple IPs on the same subnet? Check for conflicts:

```bash
arping -I eth0 192.168.1.100
```

A duplicate IP causes intermittent connectivity — packets alternate between two hosts with the same address.

## Step 3: Is the Route Correct?

You can reach the local network but not the internet. Check the routing table:

```bash
ip route show
```

The default route should point to your gateway:

```bash
default via 192.168.1.1 dev eth0
```

Missing default route? Add it:

```bash
sudo ip route add default via 192.168.1.1 dev eth0
```

For asymmetric routing issues, trace the actual path:

```bash
traceroute 8.8.8.8
mtr -r -c 10 8.8.8.8
```

`mtr` combines ping and traceroute into a live view. Look for hops where packet loss jumps sharply — that's your bottleneck. Loss at hop 1 means a local issue (cable, switch port). Loss deep in the path is usually the ISP.

Policy routing can silently hijack traffic. Check for additional routing tables:

```bash
ip rule list
ip route show table all
```

If you see rules that don't match your expectations, a VPN client or container runtime may have inserted them.

## Step 4: Is the Port Listening?

You can reach the host but the service returns "connection refused" or hangs. Check what's listening:

```bash
ss -tlnp
```

The flags: `-t` TCP, `-l` listening, `-n` numeric (no DNS reverse lookups — faster), `-p` show process.

A service bound to `127.0.0.1:8080` only accepts local connections. Bound to `0.0.0.0:8080` or a specific public IP, it's reachable remotely. This is one of the most common causes of "works locally, fails remotely."

Fix the bind address in the application config, or use a reverse proxy.

Check socket state distribution:

```bash
ss -s
```

A high count of `TIME-WAIT` sockets means many short-lived connections are closing. This isn't a crisis on modern kernels, but thousands of them can exhaust the local port range:

```bash
cat /proc/sys/net/ipv4/ip_local_port_range
# Default: 32768  60999
```

Increase if needed:

```bash
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

For connection tracking issues (common on NAT gateways and Docker hosts):

```bash
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

If `conntrack_count` approaches `conntrack_max`, new connections are dropped silently. Raise the limit:

```bash
sudo sysctl -w net.netfilter.nf_conntrack_max=262144
```

## Step 5: Is DNS Working?

DNS failures masquerade as connectivity problems. Test resolution directly:

```bash
dig +short serverhi.com
nslookup serverhi.com
```

If `dig` succeeds but your application fails, the app may use a different resolver path. Check what's configured:

```bash
cat /etc/resolv.conf
```

On systemd systems, this is often a symlink to systemd-resolved's stub resolver at `127.0.0.53`:

```bash
ls -la /etc/resolv.conf
resolvectl status
```

systemd-resolved caches aggressively. If DNS records changed recently, flush the cache:

```bash
sudo resolvectl flush-caches
```

For split-DNS setups (different resolvers per domain):

```bash
resolvectl domain eth0
```

A query timeout could mean the resolver is unreachable, or the DNS server is rate-limiting you. Test each nameserver:

```bash
dig @1.1.1.1 serverhi.com
dig @8.8.8.8 serverhi.com
```

Speed matters too. A resolver 200ms away adds up across multiple lookups:

```bash
dig @1.1.1.1 serverhi.com | grep "Query time"
```

For persistent DNS caching across reboots, consider running a local resolver like `unbound` or `dnsmasq` in front of your upstreams.

## Step 6: What's on the Wire?

When everything above checks out but traffic still misbehaves, capture packets:

```bash
sudo tcpdump -i eth0 -nn port 443
```

Flags: `-nn` disables name resolution for both hosts and ports — faster and cleaner output. Add `-v` or `-vv` for protocol details.

Capture to a file for later analysis:

```bash
sudo tcpdump -i eth0 -w /tmp/capture.pcap -s 0 host 10.0.1.50
```

The `-s 0` captures full packets (not just headers). Open the pcap in Wireshark or analyze with tshark:

```bash
tshark -r /tmp/capture.pcap -Y "tcp.flags.reset==1"
```

This filters for TCP RST packets — often a firewall or load balancer killing connections.

Common packet-level findings:

**TCP retransmissions** — packet loss on the path:

```bash
tshark -r /tmp/capture.pcap -Y "tcp.analysis.retransmission"
```

**TCP Zero Window** — the receiver can't keep up, telling the sender to pause:

```bash
tshark -r /tmp/capture.pcap -Y "tcp.window_size==0"
```

**MTU issues** — packets too large for a hop, causing fragmentation failures. Look for ICMP "fragmentation needed" messages:

```bash
sudo tcpdump -i eth0 -nn icmp
```

Test MTU with ping, setting the DF (Don't Fragment) bit:

```bash
ping -M do -s 1472 8.8.8.8
# 1472 bytes payload + 28 bytes headers = 1500 MTU
```

Reduce the payload size if it fails. The largest payload that succeeds plus 28 is your path MTU.

## Step 7: Kernel-Level Network Stats

The kernel tracks extensive networking counters in `/proc/net/`. These reveal patterns invisible to packet captures.

TCP segment stats:

```bash
nstat -az | grep -E "TcpRetrans|TcpExtTCP"
# or
cat /proc/net/netstat | column -t
```

Key metrics:
- `TcpRetransSegs` — total retransmitted segments. Spikes correlate with packet loss.
- `TcpExtTCPLossProbes` — loss probes (proactive, not from timeout). High values suggest unreliable links.
- `TcpExtTCPTimeouts` — connection-level timeouts. Indicates dead peers or firewalls dropping keepalives.

Interface-level drop counters:

```bash
ip -s link show eth0
```

RX/TX errors and dropped packets at the interface level point to hardware or driver problems, not application issues.

Softnet stats (per-CPU packet processing):

```bash
cat /proc/net/softnet_stat
```

The third column is per-CPU drops. Non-zero values mean the kernel can't process packets fast enough — increase the netdev budget:

```bash
sudo sysctl -w net.core.netdev_budget=600
```

For high-throughput servers, also tune the backlog:

```bash
sudo sysctl -w net.core.netdev_max_backlog=5000
```

### ARP Table Issues

On large Layer 2 networks, a full ARP table causes neighbor discovery failures:

```bash
ip neigh show | wc -l
cat /proc/sys/net/ipv4/neigh/default/gc_thresh3
```

If the neighbor table hits `gc_thresh3`, new entries are rejected. Bump the thresholds:

```bash
sudo sysctl -w net.ipv4.neigh.default.gc_thresh1=1024
sudo sysctl -w net.ipv4.neigh.default.gc_thresh2=2048
sudo sysctl -w net.ipv4.neigh.default.gc_thresh3=4096
```

Stale ARP entries with `reachable` state but no traffic can also cause blackholes. Flush them:

```bash
sudo ip neigh flush dev eth0
```

### Reverse Path Filtering

A silently dropped packet with no error log is often rp_filter. The kernel drops packets where the source IP doesn't match the interface it arrived on:

```bash
cat /proc/sys/net/ipv4/conf/all/rp_filter
# 1 = strict mode (drops asymmetric traffic)
# 2 = loose mode (accepts if any route exists)
```

On multi-homed servers or load balancers, strict rp_filter breaks legitimate asymmetric routing. Set to loose:

```bash
sudo sysctl -w net.ipv4.conf.all.rp_filter=2
sudo sysctl -w net.ipv4.conf.default.rp_filter=2
```

## Real-World Scenarios

### Scenario 1: Intermittent SSH Timeouts

Symptom: SSH sessions freeze for 10-30 seconds then recover.

Diagnosis:

```bash
sudo tcpdump -i eth0 -nn tcp port 22
```

If you see retransmissions during the freeze, check for duplex mismatch:

```bash
sudo ethtool eth0 | grep Duplex
```

Half-duplex on one side and full-duplex on the other causes collisions under load. Force both sides:

```bash
sudo ethtool -s eth0 speed 1000 duplex full autoneg off
```

### Scenario 2: Application Hangs on Startup

Symptom: A Java or Node.js app takes 60+ seconds to start, then works fine.

Diagnosis: DNS timeouts. The JVM or runtime tries to resolve a hostname, the first nameserver in `/etc/resolv.conf` is unreachable, and the resolver waits for the full timeout (often 5 seconds) before trying the next one. Multiple lookups multiply the delay.

```bash
strace -e trace=connect -p $(pgrep java) 2>&1 | grep ":53"
```

Fix: Remove dead nameservers from `/etc/resolv.conf`, or set a shorter timeout:

```bash
# In /etc/systemd/resolved.conf
[Resolve]
DNS=1.1.1.1 8.8.8.8
FallbackDNS=
DNSOverTLS=no
```

### Scenario 3: Port Exhaustion Under Load

Symptom: `Cannot assign requested address` errors under high concurrency.

Diagnosis:

```bash
ss -s | grep TCP
```

Tens of thousands of TIME-WAIT sockets. The local port range is exhausted:

```bash
sudo sysctl net.ipv4.ip_local_port_range
```

Fix:

```bash
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
```

For permanent changes, add to `/etc/sysctl.d/99-network.conf`:

```ini
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
```

## Prevention and Monitoring

Don't wait for the outage. Monitor these proactively:

**Prometheus alerts:**

```promql
# Interface errors
rate(node_network_receive_errors_total[5m]) > 0

# TCP retransmissions
rate(node_netstat_Tcp_RetransSegs[5m]) > 10

# Connection tracking table near limit
node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.8
```

**Smoke-test connectivity from cron:**

```bash
#!/bin/bash
# /etc/cron.d/network-smoke
*/5 * * * * root /usr/local/bin/smoke-test.sh
```

```bash
#!/bin/bash
# /usr/local/bin/smoke-test.sh
TARGETS=("serverhi.com" "1.1.1.1" "your-upstream-api.internal")
for t in "${TARGETS[@]}"; do
    if ! timeout 5 curl -sf "https://$t/health" > /dev/null 2>&1; then
        logger -t smoke-test "FAIL: $t unreachable"
    fi
done
```

## Quick Reference Card

| Symptom | First Command | Likely Cause |
|---------|--------------|--------------|
| Host unreachable | `ip link show` | Interface down, no IP |
| Connection refused | `ss -tlnp` | Service not listening, wrong bind |
| Connection timeout | `sudo tcpdump -i eth0 -nn host X` | Firewall drop, routing loop |
| Slow responses | `mtr -r -c 10 HOST` | Packet loss, DNS latency |
| DNS failures | `dig HOST` | Wrong resolver, systemd-resolved stale |
| Port exhaustion | `ss -s` | Too many TIME-WAIT, low port range |
| Intermittent drops | `sudo ethtool eth0` | Duplex mismatch, cable |

## Summary

Network troubleshooting rewards discipline. Run commands in order — link, address, route, port, DNS, packets, kernel stats — and you'll isolate the problem in minutes instead of hours. The layered approach doesn't just find the issue faster; it prevents you from fixing the wrong thing and declaring victory prematurely.

Bookmark the commands above. When the next alert fires at 3 AM, you'll have a checklist, not a panic.`
