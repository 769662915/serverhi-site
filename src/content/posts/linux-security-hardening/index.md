---
title: "Linux Security Hardening: Essential Practices for Production Servers"
description: "Protect your Linux servers from common threats with this comprehensive security hardening guide. Covers firewall configuration, SSH hardening, intrusion detection, and proactive security measures."
pubDate: 2026-02-08
coverImage: "./cover.jpg"
coverImageAlt: "Linux security shield with lock icon representing server protection"
category: "security"
tags: ["Linux security", "server hardening", "SSH", "firewall", "sysadmin"]
---

## Introduction

Linux servers face constant threats from automated attacks, targeted exploits, and human adversaries. While Linux's permission model provides strong foundations, default configurations leave significant gaps that attackers routinely exploit. Security hardening addresses these gaps through layered defenses that protect systems without sacrificing usability.

This guide presents practical hardening measures for production Linux servers. Each recommendation includes implementation steps and explanations of the security improvements they provide. The focus remains on measures with meaningful security returns rather than theater that creates complexity without protection.

Effective security requires balancing protection against operational requirements. Overly restrictive configurations impede legitimate work and may lead administrators to disable protections. The recommendations here aim for reasonable security while maintaining server functionality.

## Network-Level Protections

Network defenses form the first layer of protection, filtering malicious traffic before it reaches your applications. Properly configured firewalls and network settings prevent many attacks entirely.

### Firewall Configuration

Modern Linux servers benefit from nftables, the successor to iptables, which provides more expressive syntax and better performance. Configure a restrictive firewall that permits only necessary traffic.

```bash
# Install nftables (Ubuntu/Debian)
sudo apt install nftables -y

# Enable and start the service
sudo systemctl enable nftables
sudo systemctl start nftables

# View current ruleset
sudo nft list ruleset
```

Create a firewall configuration file that implements the principle of least privilege:

```bash
# /etc/nftables.conf
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0;
        
        # Allow established connections
        ct state established,related accept
        
        # Allow loopback traffic
        iif lo accept
        
        # Drop invalid packets immediately
        ct state invalid drop
        
        # Allow SSH (change port if modified)
        tcp dport 2222 accept
        
        # Allow HTTP/HTTPS for web servers
        tcp dport {80, 443} accept
        
        # Allow ping (rate-limited)
        limit rate 4/second accept
        drop
        
        # Default: drop everything else
        drop
    }
    
    chain forward {
        type filter hook forward priority 0;
        drop
    }
    
    chain output {
        type filter hook output priority 0;
        accept
    }
}
```

Apply the configuration and verify it loads correctly:

```bash
# Load the configuration
sudo nft -f /etc/nftables.conf

# Verify rules are loaded
sudo nft list ruleset

# Save current rules (Ubuntu)
sudo netfilter-persistent save

# Test connectivity before logging out
# Open a new SSH session and verify it works
```

The configuration permits established connections to maintain existing sessions. New connections require explicit allowance based on port number. Rate-limited ping prevents ping floods while maintaining diagnostic capability. All other traffic drops silently, providing no information to scanners.

### Kernel Network Hardening

Beyond firewall rules, kernel parameters control how the network stack handles various conditions. Configure these settings in sysctl for improved security:

```bash
# Create a configuration file
sudo nano /etc/sysctl.d/99-network-hardening.conf
```

```bash
# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Disable packet forwarding (unless acting as router)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Ignore broadcast ICMP requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IPv6 if not required
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Enable TCP SYN cookies
net.ipv4.tcp_syncookies = 1
```

Apply these settings and verify they take effect:

```bash
# Apply configuration
sudo sysctl --system

# Verify settings
sysctl net.ipv4.tcp_syncookies
sysctl net.ipv4.conf.all.rp_filter
```

These kernel parameters harden the network stack against common attack vectors. SYN cookies prevent SYN flood attacks. Source route disabling prevents attackers from routing packets through unexpected paths. The rp_filter setting validates that packets arrive on expected interfaces.

## Authentication Security

Authentication systems determine who can access your server. Weak authentication enables unauthorized access regardless of other security measures. Implement strong authentication that resists common attack techniques.

### SSH Hardening

SSH provides remote server access, making its configuration critical for security. Disable password authentication entirely and enforce key-based access.

```bash
# Create SSH directory for specific user
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH key pair (on your local machine)
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/server_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/server_key.pub admin@your_server

# Test key-based login before disabling password auth
ssh -i ~/.ssh/server_key admin@your_server
```

Configure the SSH server with security-focused settings:

```bash
# Edit SSH daemon configuration
sudo nano /etc/ssh/sshd_config
```

```bash
# Authentication settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
MaxSessions 10

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
TCPKeepAlive no

# Protocol and algorithms
Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Disable dangerous features
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no

# Banner for unauthorized access warning
Banner /etc/ssh/banner

# Restrict to specific users (optional)
AllowUsers admin username
```

Create a warning banner to deter unauthorized access:

```bash
sudo nano /etc/ssh/banner
```

```
UNAUTHORIZED ACCESS TO THIS SYSTEM IS PROHIBITED
All activity may be monitored and logged.
```

Restart SSH and verify configuration:

```bash
# Test configuration before restarting
sudo sshd -t

# Restart SSH service
sudo systemctl restart sshd

# Keep your current session open while testing
# Open a new terminal to verify key-based login works
```

### Password Policy

For accounts that must use passwords, enforce strength requirements through PAM:

```bash
# Install password quality library
sudo apt install libpam-pwquality -y

# Configure password requirements
sudo nano /etc/security/pwquality.conf
```

```bash
# Minimum password length
minlen = 12

# Require characters from different classes
minclass = 4

# Maximum consecutive identical characters
maxclassrepeat = 3

# Check against common passwords
diccheck = 1

# Check for palindromes
palindrome = 0

# Check user name in password
usercheck = 1

# Configure retry limits
retry = 3
```

## System Hardening

Beyond network and authentication security, harden the operating system itself against privilege escalation and information disclosure.

### User and Permission Controls

Configure user limits and permissions that prevent resource exhaustion and unauthorized access:

```bash
# Create limits configuration
sudo nano /etc/security/limits.conf
```

```bash
# Hard limits for all users
*               soft    core            0
*               hard    nofile          65535
*               hard    nproc           4096
*               hard    fsize           unlimited

# Specific limits for web services
www-data        hard    nproc           100
www-data        hard    nofile          65535
```

Configure sudo to require passwords and log all commands:

```bash
# Create sudoers configuration for logging
sudo nano /etc/sudoers.d/00-logging
```

```bash
Defaults logfile=/var/log/sudo.log
Defaults!wheel log_input,log_output
Defaults!wheel requiretty
```

### File System Protections

Mount options provide additional protection for sensitive directories:

```bash
# /etc/fstab configuration
# Protect /tmp from potentially dangerous executables
/dev/sda1    /tmp    tmpfs    nosuid,noexec,nodev,size=1G    0    0

# Protect /var/tmp
/dev/sda1    /var/tmp    tmpfs    nosuid,noexec,nodev,size=1G    0    0
```

The `noexec` flag prevents execution of binaries from these directories, blocking common attack techniques that upload and execute malicious code in temporary locations.

### Rootkit Detection

Install tools that detect known rootkits and unauthorized system modifications:

```bash
# Install rkhunter
sudo apt install rkhunter -y

# Configure rkhunter
sudo nano /etc/rkhunter.conf
```

```bash
# Enable all checks
ALLOWHIDDENDIR=/dev/.udev
ALLOWHIDDENFILE=/dev/.initramfs
SCRIPTWHITELIST=/usr/bin/mail
SCRIPTWHITELIST=/usr/bin/lsof
SCRIPTWHITELIST=/bin/df

# Set root mail recipient
ROOTMAIL=root@localhost
```

Run regular scans and set up automatic updates:

```bash
# Update rkhunter database
sudo rkhunter --update
sudo rkhunter --propupd

# Run a manual scan
sudo rkhunter --check --sk

# Add to cron for regular scans
echo "0 3 * * * /usr/bin/rkhunter --check --cronjob --report-warnings-only" | sudo tee /etc/cron.d/rkhunter-scan
```

## Logging and Monitoring

Effective logging enables detection of attacks and forensic analysis after incidents. Configure comprehensive logging that captures relevant events without overwhelming storage.

### Audit Logging

The Linux audit subsystem tracks system calls and file access, providing detailed records of security-relevant events:

```bash
# Install auditd
sudo apt install auditd -y

# Configure audit rules
sudo nano /etc/audit/rules.d/audit.rules
```

```bash
# Monitor configuration changes
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k identity
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Monitor privileged commands
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/sudo -k privileged

# Monitor root actions
-a always,exit -F arch=b64 -F euid=0 -S execve -k root_actions

# Monitor file deletions
-a always,exit -F arch=b64 -S unlink -S unlinkat -k delete

# Monitor configuration directories
-w /etc/nginx/ -p wa -k nginx_config
-w /etc/apache2/ -p wa -k apache_config
```

Enable and start the audit service:

```bash
sudo systemctl enable auditd
sudo systemctl start auditd

# View audit logs
sudo ausearch -k sshd_config

# Generate summary reports
sudo aureport --summary
```

### Log Management

Configure log rotation and central logging to prevent disk exhaustion while maintaining historical records:

```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/server-logs
```

```
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

/var/log/auth.log {
    daily
    rotate 90
    compress
    delaycompress
    notifempty
    create 0640 root adm
}
```

Consider forwarding logs to a centralized logging system for production environments. Services like the ELK stack (Elasticsearch, Logstash, Kibana) or cloud logging services provide search capabilities and alerting across multiple servers.

## Conclusion

Linux server security requires attention to multiple layers, from network filters to authentication systems to monitoring. The measures in this guide address common attack vectors while maintaining server functionality.

Security hardening is an ongoing process rather than a one-time configuration. Regularly review logs for suspicious activity, apply security patches promptly, and update configurations as threats evolve. Maintain documentation of your security posture and review it periodically.

The time invested in security hardening pays dividends through reduced incident risk and improved incident response capability. Well-configured servers resist attacks that compromise poorly secured alternatives, protecting both your infrastructure and your users.

---

**Related Posts:**
- [Ubuntu 22.04 Server Setup](/posts/ubuntu-22-04-server-setup)
- [Systemd Service Management](/posts/systemd-service-management)
- [Docker Security Best Practices](/posts/docker-security-guide)
