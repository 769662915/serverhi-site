---
title: "SSH Certificate-Based Authentication: Moving Beyond Key Pairs for Enterprise Scale"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for ssh certificate-based authentication - moving beyond key pairs for enterprise scale."
pubDate: 2026-04-12
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for SSH Certificate-Based Authentication: Moving Beyond Key Pairs for Enterprise Scale"
category: "security"
tags: [SSH, Security, Authentication, Certificates]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why SSH Certificates Beat Key Pairs

Key-based SSH authentication is fine when you have 10 servers and 5 users. At 100 servers and 50 users, you have 5,000 authorized_keys entries to manage. When someone leaves, you need to remove their key from 100 servers. When a key is compromised, same problem.

SSH certificates solve this at scale. Instead of distributing public keys to every server, you issue short-lived certificates signed by a trusted CA. Servers only need the CA's public key. User access is controlled by certificate validity periods, principals, and extensions — all managed centrally.

## Setting Up the Certificate Authority

Generate the CA key (store this securely — it's your root of trust):

```bash
ssh-keygen -t ed25519 -f /etc/ssh/ca_user_key -C "User CA"
ssh-keygen -t ed25519 -f /etc/ssh/ca_host_key -C "Host CA"
```

**Critical security**: The CA private key should live on an air-gapped machine or HSM. For this guide, we use a regular server, but in production, protect the CA key like you'd protect your root password.

## Host Certificate Setup

Host certificates eliminate TOFU (Trust On First Use) warnings. Instead of users accepting unknown host keys, they verify the host certificate against the CA:

```bash
# On the CA server, sign the host's public key
ssh-keygen -s /etc/ssh/ca_host_key \
  -I "web-server-01" \
  -h \
  -n "web01.example.com,web01,10.0.1.10" \
  -V "+52w" \
  /etc/ssh/ssh_host_ed25519_key.pub

# This creates ssh_host_ed25519_key-cert.pub
```

Copy the certificate to the server and configure sshd:

```bash
# /etc/ssh/sshd_config on the server
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub
```

On client machines, trust the CA:

```bash
# /etc/ssh/ssh_known_hosts or ~/.ssh/known_hosts
@cert-authority *.example.com ssh-ed25519 AAAAC3...  # CA public key
```

Now users never see "authenticity of host can't be established" — the certificate verifies the host's identity.

## User Certificate Issuance

When a user needs access, issue a short-lived certificate:

```bash
ssh-keygen -s /etc/ssh/ca_user_key \
  -I "alice@example.com" \
  -n "alice,deployer" \
  -V "+24h" \
  ~/alice_id_ed25519.pub
```

The `-n` flag specifies "principals" — the usernames this certificate can log in as. `-V "+24h"` means the certificate expires in 24 hours. The user gets `alice_id_ed25519-cert.pub`.

On servers, trust the user CA:

```bash
# /etc/ssh/sshd_config
TrustedUserCAKeys /etc/ssh/ca_user_key.pub
```

The user places the certificate alongside their private key:

```bash
mv ~/alice_id_ed25519-cert.pub ~/.ssh/
chmod 644 ~/.ssh/alice_id_ed25519-cert.pub
```

Verify the certificate:

```bash
ssh-keygen -L -f ~/.ssh/alice_id_ed25519-cert.pub
```

## Certificate Extensions

Restrict what a certificate can do:

```bash
# Force a specific command (e.g., backup only)
ssh-keygen -s ca_user_key -O force-command="/usr/local/bin/backup.sh" ...

# Disable port forwarding
ssh-keygen -s ca_user_key -O no-port-forwarding ...

# Disable PTY allocation
ssh-keygen -s ca_user_key -O no-pty ...

# Source IP restriction
ssh-keygen -s ca_user_key -O source-address="10.0.0.0/8" ...
```

## Revocation

A compromised key pair means you revoke one key. A compromised certificate just needs its serial number added to the revocation list. And since certificates are short-lived, the blast radius is limited.

```bash
# Revoke a certificate by serial number
echo "serial: 123456" >> /etc/ssh/revoked_keys

# Configure servers to check the revocation list
# /etc/ssh/sshd_config
RevokedKeys /etc/ssh/revoked_keys
```

The advantage over key-based auth: even without revocation, the certificate expires in 24 hours.

## Automation with a CA Tool

For teams, automate certificate issuance. A simple approach using a script:

```bash
#!/bin/bash
# issue-cert.sh
USER=$1
VALIDITY=${2:-"+24h"}
PRINCIPALS=${3:-"$USER"}

ssh-keygen -s /etc/ssh/ca_user_key \
  -I "${USER}-$(date +%s)" \
  -n "$PRINCIPALS" \
  -V "$VALIDITY" \
  /tmp/${USER}_id_ed25519.pub

echo "Certificate issued. Expires in $VALIDITY"
```

For larger teams, use step-ca, HashiCorp Vault's SSH engine, or Teleport — they provide full lifecycle management with audit logging.

## Migration Path from Key-Based Auth

1. Set up a CA and sign host certificates for all servers
2. Distribute the CA public key to client machines (via config management)
3. Enable `TrustedUserCAKeys` on servers (alongside existing `AuthorizedKeysFile`)
4. Issue certificates to users as they renew access
5. Phase out authorized_keys entries over time

Servers can support both methods during migration:

```bash
# /etc/ssh/sshd_config
TrustedUserCAKeys /etc/ssh/ca_user_key.pub
AuthorizedKeysFile .ssh/authorized_keys
```

## Summary

SSH certificates trade the complexity of key distribution for the simplicity of a CA. One CA key per environment, short-lived certificates per user, and centralized revocation. The infrastructure scales linearly with users, not quadratically with users × servers.