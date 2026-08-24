---
title: "Linux LUKS Disk Encryption: A Complete Guide for Servers and Workstations"
description: "Encrypt your data at rest with LUKS on Linux. This guide covers setup, key management, automated unlocking, and performance tuning for production systems."
pubDate: 2026-08-25
category: "security"
coverImage: "./cover.webp"
coverImageAlt: "Terminal showing LUKS encryption setup commands on a Linux server"
tags: [LUKS, disk encryption, Linux security, dm-crypt, data protection, server security]
author: "ServerHi Editorial Team"
difficulty: "intermediate"
estimatedTime: "45 minutes"
prerequisites:
  - "A Linux server or workstation with root access"
  - "Familiarity with disk partitioning and mount points"
  - "A backup of any data on the target partition"
osCompatibility: ["Ubuntu 22.04+", "Debian 12+", "RHEL 9+", "Arch Linux"]
---

If your server gets compromised — whether through a stolen drive, a rogue employee, or a cloud provider breach — the data on that disk is only as safe as its encryption. LUKS (Linux Unified Key Setup) is the standard way to encrypt disks on Linux. It wraps dm-crypt with a consistent key management format that works across distributions and tools.

Disk encryption protects data at rest. It doesn't protect data in transit (that's TLS) or data in use (that's a separate problem entirely). But for servers that store sensitive data — customer records, financial information, API keys, configuration files — encryption at rest is a baseline security requirement that most compliance frameworks now mandate.

The practical impact is straightforward: if someone pulls the hard drive out of your server or gains access to the raw disk image in a cloud environment, they get nothing usable. The data is encrypted with AES-256, and without the correct key, it's computationally infeasible to decrypt.

This guide covers encrypting a partition with LUKS2, managing keys, setting up automated unlocking for servers, and tuning performance. Everything here uses commands you can run on any modern Linux distribution.

## What LUKS actually does

LUKS encrypts the block device layer. When you encrypt a partition with LUKS, the data on that partition is unreadable without the correct passphrase or keyfile. The encryption happens transparently — once you unlock the volume, applications read and write to it normally through a mapped device in `/dev/mapper/`.

Under the hood, LUKS uses dm-crypt, which sits between the filesystem and the physical disk. The encryption cipher is configured when you create the LUKS volume. The default and recommended option is AES-256-XTS, which provides strong encryption with minimal performance overhead on hardware that supports AES-NI instructions (most modern CPUs).

LUKS also provides a key management framework. A LUKS volume can hold up to 32 key slots (in LUKS2 format), meaning you can assign multiple passphrases or keyfiles to the same encrypted volume. If one key is compromised, you can revoke it without re-encrypting the entire disk.

The LUKS header, which stores the key slots and encryption parameters, lives at the beginning of the partition. This is important because the header itself can become corrupted, and if it does, the data is inaccessible even with the correct key. Always back up the LUKS header after creating a volume — we'll cover this in the emergency recovery section.

LUKS2, the current format, improves on LUKS1 in several ways. It supports larger key files (up to 8192 bytes), uses a more robust header format with built-in integrity checks, and allows parallel PBKDF operations for faster unlocking on multi-core systems. If you're setting up encryption on a new system, always use LUKS2.

## Before you start

This process destroys all data on the target partition. Back up anything you need before proceeding.

Check that `cryptsetup` is installed:

```bash
sudo apt install cryptsetup    # Debian/Ubuntu
sudo dnf install cryptsetup    # RHEL/Fedora
sudo pacman -S cryptsetup      # Arch
```

Verify your version supports LUKS2:

```bash
cryptsetup --version
```

You should see version 2.0 or higher. LUKS2 is the recommended format for new installations.

## Encrypting a partition

### Step 1: Identify the target partition

Find the partition you want to encrypt:

```bash
lsblk
sudo fdisk -l
```

For this example, we'll use `/dev/sdb1`. Adjust to match your setup.

### Step 2: Create the LUKS volume

```bash
sudo cryptsetup luksFormat /dev/sdb1
```

You'll be prompted to confirm that this will overwrite existing data. Type `YES` (all caps) and press Enter. Then enter a strong passphrase when prompted.

To use specific encryption options:

```bash
sudo cryptsetup luksFormat \
  --type luks2 \
  --cipher aes-xts-plain64 \
  --key-size 512 \
  --hash sha256 \
  --iter-time 5000 \
  /dev/sdb1
```

The `--iter-time 5000` flag sets the PBKDF iteration time to 5 seconds, making brute-force attacks harder. You can increase this for more security at the cost of slower unlock times.

### Step 3: Open the encrypted volume

```bash
sudo cryptsetup open /dev/sdb1 myencrypted
```

Replace `myencrypted` with whatever name you want for the mapped device. This creates `/dev/mapper/myencrypted`.

### Step 4: Create a filesystem

```bash
sudo mkfs.ext4 /dev/mapper/myencrypted
```

Or for XFS:

```bash
sudo mkfs.xfs /dev/mapper/myencrypted
```

### Step 5: Mount and use

```bash
sudo mount /dev/mapper/myencrypted /mnt/encrypted
```

Your encrypted partition is now mounted at `/mnt/encrypted` and ready to use. Everything written to this mount point is encrypted on disk.

## Key management

### Adding a second passphrase

```bash
sudo cryptsetup luksAddKey /dev/sdb1
```

You'll enter an existing passphrase first, then the new one. This is useful for giving multiple administrators access without sharing a single passphrase.

### Adding a keyfile

For automated unlocking (servers), a keyfile is more practical than a passphrase:

```bash
# Generate a random keyfile
sudo dd if=/dev/urandom of=/root/encrypted.key bs=4096 count=1
sudo chmod 400 /root/encrypted.key

# Add it to the LUKS volume
sudo cryptsetup luksAddKey /dev/sdb1 /root/encrypted.key
```

Store the keyfile securely. If someone obtains it, they can unlock the volume without a passphrase. On a server, this typically means storing it on the root filesystem with restrictive permissions (0400, owned by root). On a workstation, you might store it on a USB drive that you keep physically secure.

The keyfile approach is standard for servers because it allows automated unlocking without human interaction. The tradeoff is that the security of the encrypted volume now depends on the security of the machine where the keyfile is stored. If someone gains root access to that machine, they can read the keyfile and unlock the volume. This is why full-disk encryption (where the root filesystem is also encrypted) combined with a secure boot process provides stronger protection than encrypting only data partitions.

### Removing a key

```bash
sudo cryptsetup luksRemoveKey /dev/sdb1
```

You'll be prompted for the passphrase you want to remove. This immediately invalidates that key — anyone who had it can no longer unlock the volume.

### Listing key slots

```bash
sudo cryptsetup luksDump /dev/sdb1
```

This shows all active key slots, the encryption parameters, and the LUKS version. Check this after making changes to verify the expected keys are present.

## Automated unlocking for servers

Servers need to unlock encrypted volumes at boot without manual intervention. The standard approach is a keyfile stored on the root filesystem (which itself should be encrypted or on a secure boot device).

### Step 1: Store the keyfile

```bash
sudo mkdir -0700 /etc/keys
sudo cp /root/encrypted.key /etc/keys/encrypted.key
sudo chmod 400 /etc/keys/encrypted.key
```

### Step 2: Add to /etc/crypttab

```bash
# Format: name  device  keyfile  options
myencrypted  /dev/sdb1  /etc/keys/encrypted.key  luks
```

### Step 3: Add to /etc/fstab

```bash
/dev/mapper/myencrypted  /mnt/encrypted  ext4  defaults  0  2
```

### Step 4: Test the configuration

```bash
sudo systemctl daemon-reload
sudo umount /mnt/encrypted
sudo cryptsetup close myencrypted
sudo systemctl restart systemd-cryptsetup@myencrypted.service
sudo mount /mnt/encrypted
```

If this works, the volume will unlock automatically on the next reboot.

## Enabling the swap partition

If you need an encrypted swap partition, the process is similar but you should use a random key each boot (since swap data doesn't need to persist):

```bash
# Format the swap partition as LUKS
sudo cryptsetup luksFormat /dev/sdb2

# Open it with a random key
sudo dd if=/dev/urandom bs=32 count=1 of=/tmp/swap-key
sudo cryptsetup open --key-file /tmp/swap-key /dev/sdb2 encrypted-swap
sudo mkswap /dev/mapper/encrypted-swap
```

Add to `/etc/crypttab`:

```bash
encrypted-swap  /dev/sdb2  /dev/urandom  swap,cipher=aes-xts-plain64,size=256
```

This generates a new key on every boot, which is fine for swap since the data is ephemeral. The tradeoff is that you can't hibernate a system with encrypted swap using a random key, because the encryption key changes on each boot and the hibernation image won't be decryptable. If you need hibernation support, use a persistent keyfile for swap instead.

For most servers, swap encryption is a good security practice but not strictly necessary. The data in swap is typically transient process memory that an attacker would have difficulty exploiting. However, if your threat model includes physical access to the server (shared hosting, colocation, laptop theft), encrypting swap prevents forensic recovery of sensitive data from the disk.

## Performance tuning

### Check for hardware acceleration

```bash
grep -m1 'flags' /proc/cpuinfo | grep -o 'aes'
```

If `aes` appears, your CPU supports AES-NI and encryption overhead will be minimal — typically less than 5% on modern hardware.

### Benchmark your setup

```bash
sudo cryptsetup benchmark
```

This tests all supported ciphers and shows throughput. For most servers, AES-XTS with a 512-bit key provides the best balance of security and performance.

### Reduce CPU overhead

If you're seeing high CPU usage from encryption, check that the `aes` kernel module is loaded:

```bash
lsmod | grep aes
```

If it's not loaded:

```bash
sudo modprobe aes
```

Add `aes` to `/etc/modules-load.d/` to make it persistent.

### Use a hardware security module (HSM)

For production environments with strict key management requirements, consider using a TPM 2.0 chip or a dedicated HSM to store the LUKS volume key. This removes the keyfile from the filesystem entirely.

```bash
# Check for TPM
sudo systemctl status systemd-tpm2-setup.service

# Bind LUKS to TPM
sudo systemd-cryptenroll --tpm2-device=auto /dev/sdb1
```

This ties the encryption key to the specific hardware, so the volume can only be unlocked on that machine.

## Emergency recovery

If you lose your passphrase and keyfile, the data is gone. There's no backdoor. This is the point of encryption.

Before you encrypt anything, create a recovery key and store it somewhere physically secure:

```bash
# Generate a recovery key
sudo systemd-cryptenroll --recovery-key /dev/sdb1
```

Print this key and store it in a safe. It's your last resort.

### Recovering from a corrupted header

If the LUKS header gets corrupted, the volume is unreadable. If you created a header backup (which you should), restore it:

```bash
sudo cryptsetup luksHeaderRestore /dev/sdb1 --header-backup-file /path/to/header-backup.img
```

Always back up the LUKS header when you create the volume:

```bash
sudo cryptsetup luksHeaderBackup /dev/sdb1 --header-backup-file /path/to/header-backup.img
```

Store this backup separately from the encrypted volume.

## Verifying encryption is active

After setup, confirm the volume is encrypted:

```bash
sudo cryptsetup status myencrypted
```

You should see output like:

```
/dev/mapper/myencrypted is active and is in use.
  type:    LUKS2
  cipher:  aes-xts-plain64
  keysize: 512 bits
  key location: dm-crypt
  device:  /dev/sdb1
  sector size:  512
  offset:  32768 sectors
  size:    2064384 sectors
  mode:    read/write
  flags:   discards
```

Also check that raw disk reads return garbage:

```bash
sudo dd if=/dev/sdb1 bs=512 count=4 | xxd | head -4
```

The output should look like random data, not recognizable filesystem structures.

## Conclusion

LUKS encryption protects data at rest without significant performance penalties on modern hardware. The key management features — multiple passphrases, keyfiles, TPM binding — make it practical for both workstations and servers.

The most important step isn't the encryption itself. It's the key management. Store keyfiles securely, back up the LUKS header, keep a recovery key in a safe, and test your unlock process before you need it. A locked volume you can't open is just as bad as an unencrypted one.

## Encrypting an existing partition

If you already have data on a partition and want to encrypt it without losing that data, the process is more involved. You can't encrypt a mounted filesystem, and you can't encrypt a partition that already has data on it without first backing up that data.

The workflow is: back up the data, encrypt the partition, restore the data. There's no safe way to encrypt in place on a live system. Some tools claim to do this, but they carry significant risk of data loss and are not recommended for production systems.

For servers with critical data, the practical approach is to provision a new encrypted volume, migrate the data, and then repurpose the old unencrypted partition. This adds downtime, but it's the only reliable method.

## Network-bound encryption

For environments where you want the encrypted volume to unlock only when connected to a specific network, Clevis and Tang provide network-bound disk encryption (NBDE). Tang is a server that acts as a network escrow for LUKS keys, and Clevis is a client that binds LUKS volumes to Tang servers.

When the system boots and can reach the Tang server on the network, it automatically unlocks the encrypted volume. When it can't (for example, if the server is stolen and taken off the network), it falls back to a manual passphrase.

This is particularly useful for diskless systems and cloud environments where you want automatic unlocking during normal operation but protection against physical theft.
