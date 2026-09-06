---title: "SSH Hardening with Fail2Ban: A Complete Guide to Blocking Brute Force Attacks"
description: "Stop SSH brute force attacks cold. This guide covers key-based auth, fail2ban configuration, firewall rules, and advanced hardening for production Linux servers."
pubDate: 2026-08-30
coverImage: "./cover.webp"
coverImageAlt: "Locked server-room door with a laptop showing an SSH terminal session"
category: "security"
tags: ["SSH", "fail2ban", "Linux security", "firewall", "server hardening"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "A Linux server with root or sudo access"
  - "SSH access to the server"
  - "Basic familiarity with the Linux command line"
osCompatibility: ["Ubuntu 22.04+", "Debian 12+", "CentOS/RHEL 9+"]
---

# SSH Hardening with Fail2Ban: A Complete Guide to Blocking Brute Force Attacks

If your Linux server is connected to the internet, someone is already trying to break into it. Automated bots scan every IP address looking for open SSH ports, and they start hammering away at default credentials within minutes of a server going online. The Verizon 2025 Data Breach Investigations Report found that SSH brute force attacks account for roughly 30% of all server intrusion attempts. That's not a theoretical risk — it's what's happening on every server with port 22 exposed.

This guide walks through a complete SSH hardening setup: switching to key-based authentication, installing and configuring fail2ban to automatically ban attacking IPs, setting up a firewall, and applying additional hardening measures. Each step builds on the previous one, and you can stop at any point for a meaningful improvement in security.

## Step 1: Switch to key-based authentication

Password authentication over SSH is the single biggest vulnerability on most servers. Even with a strong password, brute force attacks will eventually succeed given enough time. Key-based authentication eliminates this entirely — there's no password to guess, no dictionary to try, no lockout threshold to worry about.

The way key-based auth works is straightforward. Your local machine generates a mathematically linked pair of keys: a private key that stays on your machine and never leaves it, and a public key that you place on the server. When you connect, the server challenges your client to prove it holds the private key without actually transmitting the key itself. The math makes it impossible to derive the private key from the challenge response, so even if someone intercepts the entire SSH handshake, they can't steal your credentials.

Generate an SSH key pair on your local machine (not the server). Use Ed25519, which is faster and more secure than the older RSA algorithm for SSH purposes. The key generation takes less than a second and produces a 64-byte private key and a corresponding public key.

Copy the public key to your server using ssh-copy-id. This appends your public key to the authorized_keys file in your home directory on the server. The server's SSH daemon checks this file during authentication — if your public key is listed and you can prove you hold the corresponding private key, you're in.

Once you've confirmed key-based login works by opening a new SSH session, disable password authentication on the server. This is the critical step that actually eliminates the brute force vulnerability. Edit the SSH daemon configuration file and set PasswordAuthentication to no, PubkeyAuthentication to yes, and ChallengeResponseAuthentication to no. Then restart the SSH service.

**Important**: Before disabling password authentication, make absolutely sure your key-based login works. Keep a web console session open as a fallback. Locking yourself out of a remote server with no other access method is a common and painful mistake that usually requires a support ticket to your hosting provider to fix.

## Step 2: Install and configure fail2ban

Fail2Ban monitors log files for failed login attempts and automatically bans IP addresses that show malicious behavior. It's the standard tool for protecting SSH on Linux servers, and it's been battle-tested across millions of servers for over a decade.

The way fail2ban works is elegant. It runs as a daemon that periodically scans log files — in this case, the SSH authentication log — looking for patterns that indicate failed login attempts. When it finds an IP address that has exceeded the configured threshold of failures within a time window, it executes a ban action. For UFW-based setups, this means adding a rule that drops all traffic from that IP address. After the ban period expires, fail2ban removes the rule and the IP can try again.

Install fail2ban using your package manager. On Ubuntu and Debian, it's available in the default repositories. On CentOS and RHEL, you may need EPEL.

Create a local configuration file instead of editing the default jail.conf. This is important because jail.conf gets overwritten when fail2ban is updated, and your customizations would be lost. The jail.local file takes priority and persists across updates.

Configure the SSH jail with settings that balance security and usability. A ban time of 24 hours for SSH is aggressive but appropriate — legitimate users rarely fail SSH login three times in a row. The findtime of 600 seconds means fail2ban looks at failures within a 10-minute window. If three failures occur within 10 minutes, the IP is banned.

You can also configure email alerts so you're notified when an IP is banned. This is optional but useful for monitoring attack patterns on your server.

Start and enable fail2ban so it runs automatically on boot. Then verify it's working by checking the SSH jail status. You should see the currently banned IP count, the total number of failed attempts, and the active ban list.

## Step 3: Set up a firewall with UFW

UFW (Uncomplicated Firewall) provides a simple interface for managing the underlying packet filtering rules. Even if you're not using fail2ban's ban action, a basic firewall is essential for any internet-facing server.

The default UFW policy is to deny all incoming connections and allow all outgoing connections. This means only the ports you explicitly allow will be accessible from outside. It's a whitelist approach — everything is blocked unless you specifically open it.

Allow SSH first. If you're using the default port, just allow ssh. If you've changed to a custom port, allow that specific port with the TCP protocol. Then allow the other services your server needs — typically HTTP and HTTPS for web servers, or whatever ports your applications use.

Enable UFW and check the status. The verbose output shows your rules, default policies, and logging status. Make sure SSH is allowed before you enable the firewall — disabling your own access is an easy mistake to make.

For additional security, you can rate-limit SSH connections. UFW's rate limiting blocks an IP if it makes more than 6 connections within 30 seconds. This provides a lightweight form of brute force protection even without fail2ban.

## Step 4: Change the default SSH port

Changing the SSH port from 22 won't stop a determined attacker, but it eliminates the vast majority of automated bot traffic. Bots scan every IP address on port 22 — they're not looking for your specific server, they're looking for any server with an open port 22. Moving to a non-standard port makes your server invisible to these mass scans.

Edit the SSH daemon configuration to use a different port. Pick something above 1024 to avoid conflicts with well-known services, and avoid ports that other services on your server might use. Port 2222 is a common choice that's easy to remember.

Before restarting SSH, make sure your firewall allows the new port. Then restart the SSH service and test the connection on the new port from a separate terminal session. Only after you've confirmed the new port works should you remove the old port 22 rule from your firewall.

Update your SSH client configuration to use the new port by default. This saves you from having to specify the port manually every time you connect.

## Step 5: Additional hardening measures

### Disable root login

Running SSH as root is a security risk because root has unrestricted access to everything on the system. If an attacker compromises a root SSH session, they own the entire server immediately. Create a regular user account with sudo privileges instead, and configure SSH to reject root login attempts.

### Limit SSH access by user

If only certain users need SSH access, restrict it in the SSH configuration. This prevents compromised accounts that don't need SSH access from being used as an entry point.

### Set a shorter login grace time

The login grace time controls how long the server waits for a user to complete authentication before dropping the connection. Reducing this from the default 120 seconds to 30 seconds limits the window that attackers have to complete their attempts, and it also reduces resource consumption from half-open connections.

### Disable unnecessary forwarding

X11 forwarding, TCP forwarding, and agent forwarding are features that most servers don't need. Disabling them reduces the attack surface and prevents SSH from being used as a tunnel for unauthorized traffic.

### Use SSH certificates for large fleets

If you manage many servers, individual SSH keys become unwieldy. You end up distributing authorized_keys files across dozens or hundreds of machines, and revoking a compromised key means updating every server it's been placed on. SSH certificates solve this by having a central Certificate Authority sign user and host keys. Servers trust the CA, so you only need to distribute the CA's public key once. When a user's key is compromised, you revoke their certificate at the CA and the change propagates automatically.

## Step 6: Monitor and maintain

Security isn't a one-time setup — it requires ongoing monitoring and maintenance. Check fail2ban regularly to see what's being banned and adjust thresholds if you're seeing too many false positives or too few bans.

Monitor your authentication logs for patterns. If you see the same IP addresses failing repeatedly, they might be from a persistent attacker that fail2ban isn't catching due to a timing issue. If you see legitimate users getting banned, your fail2ban settings might be too aggressive.

Keep fail2ban updated. New versions include updated filters for emerging attack patterns. Attackers change their tools and techniques, and fail2ban's filters need to keep up.

Run periodic security audits with a tool like Lynis. It scans your system for misconfigurations, missing patches, and insecure settings, then provides a prioritized list of recommendations. Running this monthly catches configuration drift and reminds you of hardening steps you might have skipped.

## Common mistakes to avoid

The most common mistake is disabling password authentication without first verifying that key-based authentication works. Always keep a web console session open when making SSH configuration changes.

Setting fail2ban bantime too aggressively will eventually ban legitimate users. Start with 24 hours and adjust based on your threat profile. If you're running a server that gets scanned by thousands of bots daily, longer ban times make sense. If you're running an internal server with occasional access from changing IP addresses, shorter ban times with higher retry limits might be more appropriate.

Forgetting to update fail2ban filters is a quiet failure. If your log format changes — perhaps due to an SSH version upgrade — the existing filters might stop matching, and fail2ban will silently stop banning attackers. Periodically verify that fail2ban is actually processing log entries.

Not monitoring fail2ban at all is the worst mistake. If fail2ban stops working due to a configuration error or a log path change, you won't know until you check. Set up a simple monitoring alert or cron job that verifies fail2ban is running and the SSH jail is active.

Using password authentication alongside key-based authentication defeats the purpose. If both methods are enabled, attackers can still brute force the password. Pick one authentication method and disable the other completely.

## Quick reference

Here's a summary of the key files and commands for SSH hardening:

- **SSH config**: `/etc/ssh/sshd_config` — all SSH daemon settings
- **Fail2ban config**: `/etc/fail2ban/jail.local` — your custom jail settings
- **Fail2ban status**: `sudo fail2ban-client status sshd` — see banned IPs and stats
- **Unban IP**: `sudo fail2ban-client set sshd unbanip IP` — whitelist a legitimate IP
- **UFW status**: `sudo ufw status verbose` — check firewall rules
- **Auth logs**: `sudo tail -f /var/log/auth.log` — watch login attempts in real time
- **Security audit**: `sudo lynis audit system` — full system security scan

## Conclusion

SSH hardening isn't optional for any server exposed to the internet. The combination of key-based authentication, fail2ban, and a properly configured firewall blocks the vast majority of automated attacks. The additional hardening steps — changing the default port, disabling root login, limiting user access — add defense in depth that makes your server a harder target than the thousands of other servers running default configurations.

Start with key-based auth today. It's the single most impactful change you can make, and it takes five minutes. Then layer on fail2ban and UFW for defense in depth. Your server logs will get a lot quieter.
