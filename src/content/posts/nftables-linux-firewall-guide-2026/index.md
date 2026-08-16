---
title: "How to Set Up nftables as Your Linux Firewall in 2026"
description: "nftables is replacing iptables as the standard Linux firewall. Here's how to install, configure, and migrate to nftables on modern Linux servers."
pubDate: 2026-08-17
coverImage: "./cover.webp"
coverImageAlt: "nftables firewall configuration terminal screenshot"
category: "security"
tags: ["nftables", "firewall", "Linux", "security", "iptables"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Basic Linux command line knowledge"
  - "Root or sudo access"
osCompatibility: ["Ubuntu 22.04+", "Debian 11+", "CentOS/RHEL 9+"]
---

iptables has been the default Linux firewall for over two decades. It's powerful, it's everywhere, and it's showing its age. The syntax is cryptic, the rule management is manual, and performance degrades as rule sets grow. nftables fixes all of that, and in 2026, it's the firewall you should be using on new Linux servers.

nftables is the official replacement for iptables, ip6tables, arptables, and ebtables. It provides a single framework for all packet filtering, with a cleaner syntax, better performance, and native support for features that iptables requires workarounds to achieve. Most modern Linux distributions ship with nftables as the default firewall tool, and the remaining holdouts are migrating.

This guide walks through installing nftables, configuring basic firewall rules, and migrating existing iptables rules to the new syntax.

## Why nftables Over iptables

The core problem with iptables is complexity. Every rule is evaluated sequentially, there's no native support for grouping rules, and the syntax varies between IPv4 and IPv6. Managing a complex firewall with iptables means maintaining two separate rule sets, one for each protocol, that often mirror each other almost exactly.

nftables solves this with a unified approach. A single rule set handles both IPv4 and IPv6. Rules are organized into tables and chains, and the syntax is consistent across all protocols. Performance is also significantly better. nftables uses a stateful rule evaluation engine that can skip rules that don't apply to the current packet, reducing processing time for large rule sets.

The practical benefits:

- **Unified IPv4/IPv6 handling**: One rule set for both protocols
- **Better syntax**: Readable and consistent command structure
- **Atomic rule updates**: Replace entire rule sets without dropping connections
- **Native set support**: Group IPs, ports, or protocols for efficient matching
- **Improved performance**: Faster evaluation for large rule sets
- **Active development**: iptables is in maintenance mode, nftables is where new features land

## Installation

On Ubuntu and Debian, nftables is available in the default repositories:

```bash
sudo apt update
sudo apt install nftables
```

On CentOS, RHEL, and Fedora:

```bash
sudo dnf install nftables
```

After installation, enable and start the service:

```bash
sudo systemctl enable nftables
sudo systemctl start nftables
```

Verify the installation:

```bash
sudo nft --version
```

The version number confirms nftables is installed and ready to configure.

## Understanding the Structure

nftables organizes rules into a hierarchy: tables contain chains, and chains contain rules. This is conceptually similar to iptables, but the implementation is cleaner.

**Tables** are containers for chains. They're grouped by protocol family (ip, ip6, inet, arp, bridge) and have a user-defined name. You typically have one table per protocol family.

**Chains** are sequences of rules. Each chain is attached to a hook point, which determines when packets are evaluated against the chain's rules. Common hooks include input (packets destined for the local machine), output (packets originating from the local machine), and forward (packets being routed through the machine).

**Rules** are the actual filtering logic. Each rule specifies a condition (match source IP, destination port, protocol) and an action (accept, drop, reject).

Here's the basic structure:

```
table inet filter {
    chain input {
        type filter hook input priority 0; policy accept;
        
        # Rules go here
    }
    
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

The `inet` family handles both IPv4 and IPv6 in a single table, which is one of nftables' key advantages.

## Basic Configuration

### Setting Up a Default Deny Policy

The most common starting point is a default deny policy with explicit allows for necessary services. Here's a basic configuration:

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add chain inet filter forward '{ type filter hook forward priority 0; policy drop; }'
sudo nft add chain inet filter output '{ type filter hook output priority 0; policy accept; }'
```

This sets up a firewall that drops all incoming and forwarded traffic while allowing all outgoing traffic. The default deny approach means you explicitly allow only what you need, rather than trying to block what you don't want.

### Allowing Established Connections

The first rule should allow packets that are part of existing connections. This is essential for stateful firewall behavior:

```bash
sudo nft add rule inet filter input ct state established,related accept
```

Without this rule, responses to outgoing connections would be blocked, breaking most network services.

### Allowing Loopback Traffic

Local processes communicate through the loopback interface. Blocking this breaks many applications:

```bash
sudo nft add rule inet filter input iif lo accept
```

### Allowing SSH Access

Without this rule, you'll lock yourself out of the server:

```bash
sudo nft add rule inet filter input tcp dport 22 accept
```

For better security, restrict SSH access to specific IP addresses:

```bash
sudo nft add rule inet filter input ip saddr 192.168.1.0/24 tcp dport 22 accept
```

### Allowing HTTP and HTTPS

For web servers, allow traffic on ports 80 and 443:

```bash
sudo nft add rule inet filter input tcp dport { 80, 443 } accept
```

Note the set syntax using curly braces. This is a nftables feature that iptables doesn't support natively. It allows you to match multiple values in a single rule.

### Allowing ICMP

Ping and other ICMP messages are useful for diagnostics:

```bash
sudo nft add rule inet filter input ip protocol icmp accept
sudo nft add rule inet filter input ip6 nexthdr icmpv6 accept
```

## Using Sets for Efficient Rule Management

One of nftables' best features is native set support. Instead of creating individual rules for each IP address or port, you can group them into sets:

```bash
# Create a set of allowed SSH sources
sudo nft add set inet filter ssh_allowed '{ type ipv4_addr; }'
sudo nft add element inet filter ssh_allowed '{ 192.168.1.0/24, 10.0.0.0/8 }'

# Use the set in a rule
sudo nft add rule inet filter input tcp dport 22 ip saddr @ssh_allowed accept
```

Sets are evaluated as a single operation, making them much faster than individual rules for large groups of addresses. You can dynamically add or remove elements from a set without recreating the rule:

```bash
# Add a new address
sudo nft add element inet filter ssh_allowed '{ 203.0.113.50 }'

# Remove an address
sudo nft delete element inet filter ssh_allowed '{ 203.0.113.50 }'
```

This dynamic management is particularly useful for environments where the set of allowed addresses changes frequently, such as development servers or cloud instances.

## Saving and Loading Rules

nftables rules are not persistent by default. They exist in memory until the service is restarted or the system is rebooted. To make rules persistent, save them to a file:

```bash
sudo nft list ruleset | sudo tee /etc/nftables.conf
```

On Ubuntu, you can enable automatic rule loading by editing `/etc/default/nftables.conf` and setting `NFT_TABLES_FILE="/etc/nftables.conf"`.

On systemd-based systems, the nftables service loads rules from `/etc/nftables.conf` on startup.

To reload rules without restarting the service:

```bash
sudo nft -f /etc/nftables.conf
```

## Migrating from iptables

If you have existing iptables rules, you can convert them to nftables format. The `iptables-translate` and `ip6tables-translate` tools help with this:

```bash
# Translate a single rule
sudo iptables-translate -A INPUT -p tcp --dport 80 -j ACCEPT
# Output: nft add rule ip filter input tcp dport 80 accept

# Translate an entire ruleset
sudo iptables-save | sudo iptables-restore --translate
```

For a complete migration:

1. Export your current iptables rules: `sudo iptables-save > iptables-backup.txt`
2. Translate the rules to nftables format
3. Load the translated rules into nftables
4. Test the new rules thoroughly
5. Disable iptables and enable nftables

Be careful during migration. Test the new rules before removing the old ones. A mistake in the new ruleset could lock you out of the server.

## Verifying Your Configuration

After setting up your firewall, verify the rules are loaded correctly:

```bash
sudo nft list ruleset
```

This displays all tables, chains, and rules currently active. Check that:

- The default policies are set correctly
- Required services are allowed
- The loopback interface is not blocked
- Established connections are allowed

You can also test connectivity from another machine:

```bash
# Test SSH
ssh user@your-server-ip

# Test HTTP
curl -I http://your-server-ip
```

If you get disconnected during testing, wait a few minutes and try again. The connection timeout will eventually let you back in, or you can access the server through your hosting provider's console.

## Common Patterns

### Rate Limiting SSH Connections

Prevent brute force attacks by limiting connection attempts:

```bash
sudo nft add set inet filter ssh_ratelimit '{ type ipv4_addr; flags dynamic, timeout; timeout 60s; }'
sudo nft add rule inet filter input tcp dport 22 add @ssh_ratelimit '{ ip saddr limit rate 3/minute burst 5 packets }' accept
```

This allows up to 3 new SSH connections per minute from each IP address, with a burst of 5. The dynamic set automatically cleans up entries after the timeout, so you don't need to manage them manually.

### Logging Dropped Packets

Add a log rule before the final drop to track what's being blocked:

```bash
sudo nft add rule inet filter input limit rate 5/minute log prefix "NFT-DROP: " drop
```

This logs up to 5 dropped packets per minute with a prefix that makes them easy to find in system logs. Without rate limiting, a flood of blocked packets could fill your logs quickly.

### Creating a Complete Server Firewall

Here's a complete firewall configuration for a typical web server:

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    set blocked_hosts {
        type ipv4_addr
    }
    
    chain input {
        type filter hook input priority 0; policy drop;
        
        # Allow established connections
        ct state established,related accept
        
        # Allow loopback
        iif lo accept
        
        # Allow SSH (restrict to your IP in production)
        tcp dport 22 accept
        
        # Allow HTTP/HTTPS
        tcp dport { 80, 443 } accept
        
        # Allow ICMP
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept
        
        # Log and drop everything else
        limit rate 5/minute log prefix "NFT-DROP: " drop
    }
    
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

Save this as `/etc/nftables.conf` and load it with `sudo nft -f /etc/nftables.conf`.

## Troubleshooting

If your firewall isn't working as expected, check these common issues:

**Rules not loading**: Verify the syntax with `sudo nft -c -f /etc/nftables.conf`. The `-c` flag checks for errors without applying the rules.

**Connection refused instead of timeout**: This usually means the service isn't running on the expected port, not a firewall issue.

**Rules disappearing after reboot**: Make sure the nftables service is enabled and the rules file path is configured correctly.

**Performance issues with large rule sets**: Use sets instead of individual rules. Sets are evaluated in O(1) time, while individual rules are evaluated sequentially.

## Advanced Features

### Connection Tracking

nftables includes built-in connection tracking, which is essential for stateful firewalling. The `ct` (connection tracking) keyword lets you match packets based on their connection state:

```bash
# Allow packets belonging to established connections
sudo nft add rule inet filter input ct state established,related accept

# Drop invalid packets
sudo nft add rule inet filter input ct state invalid drop
```

Connection tracking maintains a table of active connections, allowing the firewall to make decisions based on the state of each connection rather than just the individual packet. This is more secure and more efficient than stateless filtering.

### NAT and Port Forwarding

nftables handles NAT (Network Address Translation) and port forwarding natively. Here's how to set up port forwarding for a web server behind a NAT:

```bash
# Create a NAT table
sudo nft add table ip nat

# Add a prerouting chain for port forwarding
sudo nft add chain ip nat prerouting '{ type nat hook prerouting priority -100; }'

# Forward port 8080 to internal web server
sudo nft add rule ip nat prerouting tcp dport 8080 dnat to 192.168.1.100:80

# Add a postrouting chain for masquerading
sudo nft add chain ip nat postrouting '{ type nat hook postrouting priority 100; }'

# Masquerade outgoing traffic
sudo nft add rule ip nat postrouting oif eth0 masquerade
```

This configuration forwards traffic arriving on port 8080 to an internal web server at 192.168.1.100 on port 80, and masquerades outgoing traffic so internal hosts can access the internet.

### IPv6 Considerations

With the `inet` family, you handle both IPv4 and IPv6 in a single table. However, there are some IPv6-specific considerations:

```bash
# Allow ICMPv6 neighbor discovery (essential for IPv6 to work)
sudo nft add rule inet filter input icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert } accept

# Allow ICMPv6 path MTU discovery
sudo nft add rule inet filter input icmpv6 type packet-too-big accept
```

IPv6 relies heavily on ICMPv6 for basic network functionality. Blocking all ICMPv6 will break IPv6 connectivity.

### Rate Limiting

Rate limiting helps prevent abuse and denial-of-service attacks:

```bash
# Rate limit new SSH connections
sudo nft add rule inet filter input tcp dport 22 ct state new limit rate 3/minute accept

# Rate limit HTTP requests per source IP
sudo nft add rule inet filter input tcp dport 80 ct state new limit rate 60/second accept
```

The `ct state new` match ensures the rate limit only applies to new connections, not established ones.

## Performance Tuning

For high-traffic servers, nftables performance can be optimized:

- **Use sets for IP addresses**: Sets use hash tables for O(1) lookup instead of O(n) sequential matching
- **Order rules by frequency**: Put the most-matched rules first to minimize average evaluation time
- **Use concatenations**: Match multiple fields (IP + port) in a single rule instead of separate rules
- **Disable connection tracking when not needed**: If you don't need stateful filtering, disabling ct improves performance

```bash
# Example: efficient rule using sets and concatenations
sudo nft add set inet filter web_servers '{ type ipv4_addr . inet_service; flags interval; }'
sudo nft add element inet filter web_servers '{ 192.168.1.10 . 80, 192.168.1.11 . 443 }'
sudo nft add rule inet filter input ip daddr . tcp dport @web_servers accept
```

This single rule matches both IP address and port using a concatenated set, which is significantly faster than two separate rules.

## Monitoring and Logging

nftables includes built-in logging capabilities that help you monitor firewall activity:

```bash
# Log dropped packets with a prefix
sudo nft add rule inet filter input limit rate 10/minute log prefix "NFT-DROP: " drop

# Log accepted SSH connections
sudo nft add rule inet filter input tcp dport 22 log prefix "SSH-ALLOW: " accept
```

Logs are written to the kernel ring buffer and can be viewed with `dmesg` or forwarded to a log file using `syslog-ng` or `rsyslog`.

For more detailed monitoring, consider using nftables' built-in counters:

```bash
# Add a counter to a rule
sudo nft add rule inet filter input tcp dport 80 counter accept

# View the counter
sudo nft list chain inet filter input
```

Counters show the number of packets and bytes matched by each rule, which is useful for identifying which rules are being triggered most frequently.

## Conclusion

nftables is the present and future of Linux firewalling. The syntax is cleaner, the performance is better, and the feature set is more complete than iptables. For new servers, there's no reason to start with iptables. For existing servers, migration is straightforward with the translation tools.

The investment in learning nftables pays off quickly. Once you're comfortable with the syntax and the table/chain/rule structure, managing firewalls becomes significantly easier. The native set support alone is worth the switch for anyone managing non-trivial rule sets.