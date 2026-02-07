---
title: "Ubuntu 22.04 Server Setup: Complete Initial Configuration Guide"
description: "Step-by-step guide to configure a fresh Ubuntu 22.04 server with security hardening, user management, and essential tools installation."
pubDate: 2026-02-06
coverImage: "./cover.jpg"
coverImageAlt: "Ubuntu server terminal showing system configuration commands"
category: "linux"
tags: ["Ubuntu", "Linux", "Server Setup", "Security", "SSH"]
author: "ServerHi Editorial Team"
featured: true
draft: false
difficulty: "beginner"
estimatedTime: "30 minutes"
prerequisites:
  - "Fresh Ubuntu 22.04 installation"
  - "Root or sudo access"
  - "Basic command line knowledge"
osCompatibility: ["Ubuntu 22.04 LTS", "Ubuntu 23.10"]
---

## Introduction

Setting up a new Ubuntu server correctly from the start saves time and prevents security issues later. This guide covers essential configuration steps for Ubuntu 22.04 LTS, from initial login to a production-ready server.

## Initial Login

Connect to your server via SSH:

```bash
ssh root@your_server_ip
```

Or if using a non-root user:

```bash
ssh username@your_server_ip
```

## Update System Packages

Always start by updating the package list and upgrading installed packages:

```bash
sudo apt update
sudo apt upgrade -y
```

This ensures you have the latest security patches and bug fixes.

## Create a New User

Running everything as root is risky. Create a regular user:

```bash
adduser newusername
```

Follow the prompts to set a password and user information.

Add the user to the sudo group:

```bash
usermod -aG sudo newusername
```

Verify sudo access:

```bash
su - newusername
sudo whoami
```

You should see `root` as output.

## Configure SSH Access

### Copy SSH Keys

If you used SSH keys for root, copy them to your new user:

```bash
rsync --archive --chown=newusername:newusername ~/.ssh /home/newusername
```

### Disable Root Login

Edit the SSH configuration:

```bash
sudo nano /etc/ssh/sshd_config
```

Find and modify these lines:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH service:

```bash
sudo systemctl restart sshd
```

### Change Default SSH Port (Optional)

For added security, change the default port:

```bash
sudo nano /etc/ssh/sshd_config
```

Change:

```
Port 2222
```

Update firewall rules before restarting SSH:

```bash
sudo ufw allow 2222/tcp
sudo systemctl restart sshd
```

## Configure Firewall

Ubuntu uses UFW (Uncomplicated Firewall). Enable it:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

Check status:

```bash
sudo ufw status
```

Allow additional services as needed:

```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3306/tcp  # MySQL
```

## Set Up Timezone

Check current timezone:

```bash
timedatectl
```

List available timezones:

```bash
timedatectl list-timezones
```

Set your timezone:

```bash
sudo timedatectl set-timezone America/New_York
```

## Configure Hostname

Set a meaningful hostname:

```bash
sudo hostnamectl set-hostname your-server-name
```

Update `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add:

```
127.0.0.1 your-server-name
```

## Install Essential Tools

Install commonly needed packages:

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  net-tools \
  build-essential \
  software-properties-common
```

## Configure Automatic Security Updates

Install unattended-upgrades:

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Edit configuration:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Enable automatic updates:

```
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## Set Up Swap Space

Check existing swap:

```bash
sudo swapon --show
free -h
```

Create swap file (2GB example):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Make it permanent:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Adjust swappiness:

```bash
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## Configure Fail2Ban

Protect against brute-force attacks:

```bash
sudo apt install fail2ban -y
```

Create local configuration:

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Configure SSH protection:

```
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

Start and enable:

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

Check status:

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## Set Up Log Rotation

Ensure logs don't fill your disk:

```bash
sudo nano /etc/logrotate.d/custom
```

Add:

```
/var/log/custom/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

## Configure System Limits

Edit limits:

```bash
sudo nano /etc/security/limits.conf
```

Add:

```
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
```

## Install Monitoring Tools

### Install htop

Already installed in essential tools, but configure it:

```bash
htop
```

Press F2 for setup, customize as needed.

### Install netdata (Optional)

Real-time performance monitoring:

```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

Access at `http://your_server_ip:19999`

## Secure Shared Memory

Edit fstab:

```bash
sudo nano /etc/fstab
```

Add:

```
tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0
```

Remount:

```bash
sudo mount -o remount /run/shm
```

## Configure Kernel Parameters

Edit sysctl:

```bash
sudo nano /etc/sysctl.conf
```

Add security settings:

```
# IP Forwarding
net.ipv4.ip_forward = 0

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1
```

Apply changes:

```bash
sudo sysctl -p
```

## Set Up Backup User

Create a dedicated backup user:

```bash
sudo adduser --system --group --no-create-home backup
```

## Final Security Checklist

- [ ] Root login disabled
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled
- [ ] Firewall configured and enabled
- [ ] Fail2Ban installed and running
- [ ] Automatic security updates enabled
- [ ] Non-root user created with sudo access
- [ ] Timezone configured
- [ ] Hostname set
- [ ] Swap space configured
- [ ] System limits adjusted

## Verify Configuration

Run these commands to verify:

```bash
# Check SSH config
sudo sshd -t

# Check firewall
sudo ufw status verbose

# Check fail2ban
sudo fail2ban-client status

# Check system updates
sudo apt update && sudo apt list --upgradable

# Check disk space
df -h

# Check memory
free -h

# Check running services
sudo systemctl list-units --type=service --state=running
```

## Conclusion

Your Ubuntu 22.04 server is now configured with essential security measures and tools. This foundation provides a secure starting point for installing applications and services.

Remember to:

- Regularly update packages
- Monitor logs for suspicious activity
- Back up important data
- Document any changes you make

---

**Next Steps:**
- [Install and Configure Nginx](/posts/nginx-setup)
- [Set Up Docker on Ubuntu](/posts/docker-ubuntu-install)
- [MySQL Database Installation Guide](/posts/mysql-ubuntu-setup)
