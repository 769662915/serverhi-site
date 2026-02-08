---
title: "UFW Firewall Configuration: Securing Linux Servers"
description: "Master UFW (Uncomplicated Firewall) for Linux server security. Learn rules configuration, rate limiting, application profiles, and integration with Docker networks for production environments."
pubDate: 2026-02-08
coverImage: "./cover.webp"
coverImageAlt: "UFW firewall configuration terminal showing rules management and status"
category: "security"
tags: ["firewall", "UFW", "Linux", "security", "server hardening"]
---

## Introduction

Linux servers require firewall configuration as foundational security measures. UFW (Uncomplicated Firewall) provides user-friendly interface to iptables while maintaining powerful security capabilities. This guide covers UFW installation, configuration, and integration with server applications.

Default-deny policies block all traffic except explicitly permitted connections. This approach minimizes attack surface while requiring deliberate configuration for legitimate traffic. UFW simplifies policy management while providing audit trail for security reviews.

Production servers face constant connection attempts from scanners, bots, and attackers. UFW rate limiting and fail2ban integration automate defense against connection attacks. Application profiles simplify configuration for common services like SSH, Nginx, and PostgreSQL.

## Installing and Configuring UFW

UFW comes pre-installed on Ubuntu and most Debian derivatives. RHEL-based systems require EPEL repository installation.

### Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ufw

# RHEL/CentOS (requires EPEL)
sudo yum install epel-release
sudo yum install ufw

# Fedora
sudo dnf install ufw

# Enable and start UFW
sudo systemctl enable ufw
sudo systemctl start ufw
```

Verify UFW status before configuring rules:

```bash
# Check UFW status
sudo ufw status

# View verbose status
sudo ufw status verbose

# View numbered rules
sudo ufw status numbered
```

### Default Policies

Establish default policies before adding specific rules:

```bash
# Default deny incoming connections
sudo ufw default deny incoming

# Default allow outgoing connections
sudo ufw default allow outgoing

# Default deny routed connections (for gateways)
sudo ufw default deny routed
```

Default policies provide baseline security. Specific rules override defaults for permitted traffic. This approach ensures any missed rules default to secure behavior.

### Enabling UFW

Enable UFW carefully to avoid locking yourself out:

```bash
# Enable with logging
sudo ufw logging medium

# Enable UFW (establishes firewall rules)
sudo ufw enable

# Verify enabled status
sudo ufw status
```

SSH access must be permitted before enabling UFW on remote servers. Rule ordering matters; UFW processes rules sequentially until a match occurs.

## Managing Firewall Rules

UFW provides intuitive syntax for rule management while supporting advanced configurations.

### Basic Rule Syntax

Add rules using simple service names or explicit port numbers:

```bash
# Allow SSH (port 22)
sudo ufw allow ssh
sudo ufw allow 22

# Allow specific port
sudo ufw allow 8080

# Allow port range
sudo ufw allow 8000:8100/tcp

# Deny specific port
sudo ufw deny 23

# Delete rule by port
sudo ufw delete allow 22

# Delete rule by number
sudo ufw delete 3
```

Service-based rules automatically map to correct ports through `/etc/services`. Port numbers work universally regardless of service names.

### TCP and UDP Specific Rules

```bash
# Allow TCP only
sudo ufw allow 443/tcp

# Allow UDP only
sudo ufw allow 53/udp

# Allow specific UDP port range
sudo ufw allow 5000:5100/udp
```

Some protocols require specific transport layer configuration. HTTP/HTTPS typically use TCP. DNS uses both UDP and TCP for different query sizes.

### Source and Destination Configuration

Restrict rules to specific source addresses or interfaces:

```bash
# Allow from specific IP
sudo ufw allow from 192.168.1.100

# Allow from IP subnet
sudo ufw allow from 192.168.1.0/24

# Allow to specific port from subnet
sudo ufw allow from 192.168.1.0/24 to any port 22

# Allow on specific interface
sudo ufw allow in on eth0 to any port 22

# Allow from specific IP to specific interface and port
sudo ufw allow in on eth0 from 10.0.0.0/8 to any port 5432
```

Interface-specific rules enable different policies for different network interfaces. Internal networks may permit more traffic than external interfaces.

### Application Profiles

UFW supports application profiles that bundle related rules:

```bash
# List available profiles
sudo ufw app list

# Show profile details
sudo ufw app info 'Nginx Full'

# Allow using profile
sudo ufw allow 'Nginx Full'

# Create custom profile
cat > /etc/ufw/applications.d/custom-app <<EOF
[Custom App]
title=Custom Application
description=My custom application ports
ports=9000,9001/tcp
EOF

# Reload application profiles
sudo ufw app update custom-app
sudo ufw app list
```

Application profiles simplify common service configurations. Official profiles exist for Nginx, Apache, PostgreSQL, MySQL, and many other services.

## Rate Limiting and Attack Prevention

UFW includes rate limiting capabilities for brute force protection:

```bash
# Rate limit SSH (100 connections per 30 seconds)
sudo ufw limit 22/tcp

# Rate limit with log level
sudo ufw limit 22/tcp log

# Rate limit on specific interface
sudo ufw limit in on eth0 to any port 22

# Rate limit from subnet
sudo ufw limit from 192.168.1.0/24 to any port 22
```

Rate limiting permits initial connections while blocking sources exceeding thresholds. Legitimate traffic rarely triggers limits while brute force attacks face immediate blocking.

### Integration with Fail2Ban

Fail2ban provides more sophisticated attack detection than basic rate limiting:

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure UFW for fail2ban
sudo ufw raw add table inet f2b-chain insert 1 jump drop [0:0]

# Create fail2ban jail for UFW
cat > /etc/fail2ban/jail.local <<EOF
[ufw]
enabled = true
filter = ufw
action = ufw[type=reject_with_port]
port = ufw
logpath = /var/log/ufw.log
maxretry = 5
findtime = 600
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

Fail2ban monitors logs for attack patterns, dynamically updating firewall rules. Combining UFW rate limiting with Fail2ban provides layered protection.

## UFW with Docker

Docker and UFW require careful configuration to avoid conflicts.

### Docker Network Configuration

Docker bypasses UFW by default, exposing containers directly on the host network:

```bash
# Prevent Docker from modifying iptables
# Add to /etc/docker/daemon.json
{
  "iptables": false
}

# Restart Docker
sudo systemctl restart docker

# Now UFW controls container exposure
sudo ufw allow from 192.168.1.0/24 to any port 32768:65535
```

Disabling Docker's iptables requires UFW configuration for container ports. This approach centralizes firewall management but increases configuration complexity.

### Alternative Docker Network Isolation

Create dedicated Docker networks with UFW rules on bridge interfaces:

```bash
# Create isolated Docker network
docker network create --driver bridge isolated_network

# Allow traffic only on specific interface
sudo ufw allow in on docker0 to any port 80
sudo ufw allow in on docker0 to any port 443

# Deny inter-container traffic by default
sudo ufw deny in on docker0 to any
sudo ufw allow in on docker0 from 172.18.0.0/16 to any port 5432
```

Bridge network isolation limits container communication while permitting necessary traffic.

## Logging and Monitoring

UFW logging provides visibility into connection attempts and blocked traffic.

### Configuring Log Levels

```bash
# Disable logging
sudo ufw logging off

# Log blocked connections (basic)
sudo ufw logging low

# Log allowed connections (medium)
sudo ufw logging medium

# High logging (all packets)
sudo ufw logging high
```

Production environments typically use medium logging, capturing blocked connections without overwhelming logs with allowed traffic.

### Viewing Logs

```bash
# UFW logs via journalctl
sudo journalctl -u ufw -f

# Traditional syslog location
sudo tail -f /var/log/ufw.log

# Filter logs for blocked connections
sudo journalctl -u ufw | grep BLOCK
```

Log analysis reveals attack patterns and validates firewall behavior. Unexpected blocked connections may indicate misconfiguration or network issues.

## IPv6 Configuration

Enable IPv6 support for dual-stack servers:

```bash
# Edit UFW configuration
sudo nano /etc/default/ufw

# Set IPv6 to yes
IPV6=yes

# Apply changes
sudo ufw disable
sudo ufw enable

# Verify IPv6 rules
sudo ufw status verbose
```

IPv6 rules operate independently from IPv4. Verify both protocols have appropriate policies.

## Common Production Configurations

Example configurations for common server types.

### Web Server

```bash
# Basic web server configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw limit 22/tcp

# HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Rate limit application ports
sudo ufw limit 80/tcp
sudo ufw limit 443/tcp

# Enable firewall
sudo ufw enable
```

### Database Server

```bash
# Database server configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw limit 22/tcp

# PostgreSQL from application servers
sudo ufw allow from 10.0.0.0/8 to any port 5432

# MySQL
sudo ufw allow from 10.0.0.0/8 to any port 3306

# Redis
sudo ufw allow from 10.0.0.0/8 to any port 6379

sudo ufw enable
```

### Docker Host

```bash
# Docker host with container isolation
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw limit 22/tcp

# Docker API (restrict to management network)
sudo ufw allow from 192.168.1.0/24 to any port 2375
sudo ufw allow from 192.168.1.0/24 to any port 2376

# Container ports (controlled separately)
# Do NOT expose container ports via UFW directly

sudo ufw enable
```

## Troubleshooting UFW

Diagnose and resolve common UFW issues.

### Common Issues

```bash
# Locked out from server
# Access via console and run:
sudo ufw disable
# Fix rules, then re-enable

# Cannot connect after reboot
# Verify UFW is enabled and running
sudo systemctl status ufw
sudo ufw status

# Rules not applying
sudo ufw disable
sudo ufw enable

# Conflicting rules
# Delete and recreate rules
sudo ufw delete allow 22
sudo ufw allow 22/tcp

# Check rule order
sudo ufw status numbered
```

### Reset and Rebuild

```bash
# Reset UFW to defaults
sudo ufw reset

# Rebuild configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
# Add required rules
sudo ufw enable
```

Resetting provides clean slate for rebuilding firewall configuration.

## Conclusion

UFW provides accessible firewall management suitable for production Linux servers. Default-deny policies establish secure baselines while explicit rules permit legitimate traffic. Rate limiting and fail2ban integration add automated attack protection.

Regular firewall audits verify that rules match current requirements. Remove obsolete rules and update source addresses as infrastructure changes. Log monitoring reveals attack patterns and configuration problems.

---

**Related Posts:**
- [SSH Server Hardening](/posts/ssh-server-hardening)
- [Linux Security Hardening](/posts/linux-security-hardening)
- [Docker Security Best Practices](/posts/docker-security-guide)
