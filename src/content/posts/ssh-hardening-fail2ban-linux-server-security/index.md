---
title: "SSH Hardening and Fail2Ban: The Complete Guide to Locking Down Your Linux Server"
description: "Every internet-facing Linux server gets scanned within minutes of coming online. This guide walks through SSH hardening, key-based authentication, and Fail2Ban configuration to stop brute-force attacks before they reach your auth logs."
pubDate: 2026-07-10
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration showing a shield protecting an SSH server from brute-force attacks, with Fail2Ban jail bars blocking malicious IPs in green-on-black terminal aesthetic"
category: security
tags: [SSH, Fail2Ban, server security, Linux, brute force protection, hardening, UFW, key authentication]
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "A Linux server with SSH access"
  - "Basic familiarity with the command line"
  - "sudo or root privileges"
osCompatibility: [Ubuntu 24.04, Ubuntu 22.04, Debian 12, RHEL 9]
---

A freshly provisioned Linux VPS starts receiving SSH brute-force attempts within minutes — sometimes seconds — of getting a public IP. Automated scanners sweep entire IP ranges looking for port 22, and once they find it, the dictionary attacks begin. Most of them are noise. But noise that never stops becomes a problem when a weak password or an unpatched service creates an opening.

The goal of SSH hardening isn't to build an impenetrable fortress. It's to make your server so inconvenient to attack that the bots move on to the next target. Here's the full workflow — from key-based authentication to automated banning — that turns SSH from your biggest exposure surface into a locked-down access point you can trust.

## Step 1: Switch to Key-Based Authentication

Passwords are the weakest link in SSH security. Even a strong password can be guessed, leaked, or phished. SSH keys use 2048-bit (or higher) asymmetric cryptography — brute-forcing one is computationally infeasible.

First, generate a key pair on your **local machine** (not the server):

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

The `ed25519` algorithm is faster and more secure than RSA. It produces a compact key that's resistant to side-channel attacks. When prompted, set a passphrase — it adds a second factor without adding complexity.

Now copy the public key to your server:

```bash
ssh-copy-id user@your-server-ip
```

This appends your public key to `~/.ssh/authorized_keys` on the server with the correct permissions. Test the connection before you disable passwords:

```bash
ssh -i ~/.ssh/id_ed25519 user@your-server-ip
```

If you can log in without a password prompt, the key is working. **Do not disable password authentication until you've confirmed this.**

## Step 2: Harden sshd_config

The SSH daemon configuration lives at `/etc/ssh/sshd_config`. Every change here reduces your attack surface. Make a backup first:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

Now open the file and apply these changes. Each one addresses a specific attack vector:

```bash
sudo nano /etc/ssh/sshd_config
```

The critical settings:

```
# Disable root login entirely — always SSH as a regular user, then sudo
PermitRootLogin no

# Disable password authentication — keys only from this point forward
PasswordAuthentication no
ChallengeResponseAuthentication no

# Only allow key-based authentication
PubkeyAuthentication yes

# Limit authentication attempts before the connection drops
MaxAuthTries 3

# Disconnect idle sessions after 5 minutes of inactivity
ClientAliveInterval 300
ClientAliveCountMax 0

# Restrict which users can SSH in (whitelist approach)
AllowUsers yourusername

# Disable empty passwords and .rhosts files
PermitEmptyPasswords no
IgnoreRhosts yes

# Disable X11 forwarding unless you explicitly need it
X11Forwarding no

# Use a non-standard port to reduce automated scanner noise
Port 2222
```

The port change deserves a word of caution: it doesn't add cryptographic security, but it eliminates roughly 90% of automated SSH scan traffic simply because most bots only check port 22. On a server with key-only auth and Fail2Ban running, that remaining 10% is handled automatically.

After editing, validate the configuration before restarting:

```bash
sudo sshd -t
```

If the syntax check passes, apply the changes:

```bash
sudo systemctl restart sshd
```

**Critical**: Keep your current SSH session open in a separate terminal while testing. If you made a configuration error and get locked out, you can revert from the still-active session without needing console access.

## Step 3: Install and Configure Fail2Ban

Fail2Ban monitors log files for patterns that indicate attack attempts — repeated failed logins, malformed requests, probe scans — and dynamically blocks the source IP using firewall rules. It's the difference between manually blacklisting IPs from your auth logs at 3 a.m. and never having to think about them.

Install Fail2Ban:

```bash
sudo apt update && sudo apt install fail2ban -y
```

Fail2Ban ships with a default configuration at `/etc/fail2ban/jail.conf`, but you should never edit that file directly — updates will overwrite your changes. Instead, create a local override:

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Now edit `jail.local` to tune the SSH protection:

```bash
sudo nano /etc/fail2ban/jail.local
```

The key parameters for the `[sshd]` jail:

```ini
[sshd]
enabled   = true
port      = 2222
filter    = sshd
logpath   = /var/log/auth.log
maxretry  = 3
findtime  = 10m
bantime   = 1h
```

Here's what each parameter does in practice:

- **maxretry = 3**: Three failed attempts within the findtime window triggers a ban. Aggressive enough to catch brute-force tools, lenient enough that a mistyped key passphrase won't lock you out.
- **findtime = 10m**: The sliding window. If failures are spaced more than 10 minutes apart, the counter resets. This prevents slow, distributed attacks from accumulating.
- **bantime = 1h**: A one-hour ban stops most automated scanners. Increase this to 24h or even 86400 seconds (24h) on production servers that don't need dynamic IP access.

If you changed the SSH port to 2222 as shown in Step 2, make sure the `port` parameter matches. Fail2Ban won't protect what it isn't watching.

## Step 4: Create Custom Jails for Aggressive Protection

The default sshd jail handles basic brute-force. But attackers get creative. Fail2Ban's real power comes from custom filters that catch more subtle attack patterns.

Create a custom jail file for SSH-specific protections:

```bash
sudo nano /etc/fail2ban/jail.d/ssh-custom.conf
```

Add these jails to catch additional attack patterns:

```ini
# Ban IPs attempting to connect as invalid users
[sshd-invalid]
enabled  = true
port     = 2222
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 2
findtime = 5m
bantime  = 24h

# Aggressive ban for root login attempts (root login is already disabled)
[sshd-root]
enabled  = true
port     = 2222
filter   = sshd[mode=aggressive]
logpath  = /var/log/auth.log
maxretry = 1
findtime = 5m
bantime  = 168h
```

The `sshd-root` jail with `maxretry = 1` and a 7-day ban is intentionally harsh. Since `PermitRootLogin` is already set to `no`, any attempt to authenticate as root is either a misconfigured script or an attack — either way, it doesn't belong on your server.

To catch protocol-level probes that don't even attempt authentication, add a filter for port scanning:

```bash
sudo nano /etc/fail2ban/filter.d/ssh-scan.conf
```

```ini
[Definition]
failregex = ^<HOST> .* Connection closed by authenticating user .* \[preauth\]$
            ^<HOST> .* Did not receive identification string from .*$
            ^<HOST> .* Bad protocol version identification .*$
ignoreregex =
```

Then enable it:

```ini
[ssh-scan]
enabled  = true
port     = 2222
filter   = ssh-scan
logpath  = /var/log/auth.log
maxretry = 5
findtime = 5m
bantime  = 12h
```

Restart Fail2Ban to apply all jail configurations:

```bash
sudo systemctl restart fail2ban
```

## Step 5: Wrap It with a Firewall

Fail2Ban modifies iptables/nftables rules dynamically, but having a baseline firewall policy provides defense in depth. UFW (Uncomplicated Firewall) is the simplest way to establish that baseline.

```bash
sudo apt install ufw -y
```

Set default policies — deny everything inbound, allow everything outbound:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

Allow your SSH port **before enabling the firewall** — this is the rule everyone learns the hard way:

```bash
sudo ufw allow 2222/tcp comment 'SSH'
```

If you're running a web server, allow those ports too:

```bash
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
```

Enable the firewall:

```bash
sudo ufw enable
```

Verify the rules are active:

```bash
sudo ufw status verbose
```

The output should show your SSH port allowed and everything else denied inbound. Fail2Ban will add and remove its own temporary rules on top of this baseline, and those rules will show up when you run `sudo ufw status numbered`.

## Step 6: Monitor and Maintain

Hardening isn't a one-time event. Servers drift, configs get tweaked, and new attack patterns emerge. Set up the monitoring commands you'll actually use.

**Check who's currently banned:**

```bash
sudo fail2ban-client status sshd
```

The output shows the total number of banned IPs and the list of currently banned addresses. On a typical internet-facing server, this list grows by dozens of IPs per day.

**View recent bans in the log:**

```bash
sudo tail -f /var/log/fail2ban.log
```

Patterns to watch for: repeated bans of IPs from the same subnet (might indicate a coordinated attack), or bans triggered on services you didn't know were exposed.

**Unban an IP if you accidentally lock yourself out:**

```bash
sudo fail2ban-client set sshd unbanip 192.168.1.100
```

**Check SSH authentication attempts in real time:**

```bash
sudo tail -f /var/log/auth.log | grep sshd
```

This is the raw feed that Fail2Ban is watching. If you see a spike in connection attempts, Fail2Ban is already responding — the bantime just needs a few failures to accumulate.

**Set up a weekly summary script:**

```bash
#!/bin/bash
echo "=== Fail2Ban Status $(date) ==="
sudo fail2ban-client status sshd
echo ""
echo "=== Top Banned IPs (last 7 days) ==="
sudo zgrep -h "Ban" /var/log/fail2ban.log* 2>/dev/null | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
```

Save this as `/usr/local/bin/fail2ban-report.sh`, make it executable, and you have a quick weekly health check.

## The Checklist

When you're done, verify each item:

- [ ] SSH key-based authentication is working and password login is disabled
- [ ] Root login is disabled; you SSH as a regular user and use `sudo`
- [ ] SSH listens on a non-standard port (not 22)
- [ ] `MaxAuthTries` is set to 3 or fewer
- [ ] Fail2Ban is installed and the sshd jail is active
- [ ] Custom jails catch invalid user and root login attempts
- [ ] UFW is enabled with only necessary ports open
- [ ] You've tested login from a second terminal before closing your session
- [ ] `fail2ban-client status sshd` shows the jail is running
- [ ] You know the unban command in case of accidental lockout

A server secured with these steps isn't invulnerable — nothing is. But it's no longer the low-hanging fruit that automated scanners are looking for. The bots that hit port 22 get no response. The ones that find your SSH port get three attempts before a one-hour ban. And anything trying to log in as root gets banned for a week on the first try.

That's the kind of deterrent that makes attackers move on to the next IP in their scan range — exactly where you want them.
