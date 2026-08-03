---
title: "Docker Security Hardening: 9 Steps to Lock Down Production Containers"
description: "Practical commands and configurations to harden Docker in production. From rootless mode to network segmentation, these steps reduce your attack surface."
pubDate: 2026-08-04
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration showing Docker security hardening commands with a padlock icon, dark background with green terminal text"
category: "security"
tags: ["Docker", "security", "production", "hardening", "containers", "DevSecOps"]
author: "ServerHi Editorial Team"
featured: false
difficulty: "intermediate"
estimatedTime: "30 minutes"
prerequisites:
  - "Docker installed on a Linux server"
  - "Root or sudo access"
  - "Basic Docker command familiarity"
osCompatibility: ["Ubuntu 22.04+", "Debian 12+", "RHEL 9+"]
---

Your Docker daemon runs as root. That means a container escape gives an attacker root on the host. The default Docker configuration prioritizes convenience over security, and most production deployments inherit those defaults without modification. This guide walks through nine concrete steps to harden Docker for production, with actual commands you can run today.

## 1. Enable rootless mode

Docker rootless mode runs the entire Docker daemon as a regular user, eliminating the need for root access. If an attacker escapes a container, they get a regular user account on the host, not root. This is one of the single most impactful security improvements you can make.

The rootless mode works by running the Docker daemon in a user namespace. The daemon itself runs as a regular user, and all containers are created within that user's namespace. This means container root (UID 0) maps to the user's UID on the host, not the actual system root.

Install the rootless dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install uidmap dbus-user-session

# RHEL/CentOS
sudo dnf install uidmap dbus-user-session
```

Enable user namespaces:

```bash
sudo sysctl user.max_user_namespaces=28633
```

Install rootless Docker:

```bash
dockerd-rootless-setuptool.sh install
```

Set the environment variables:

```bash
export PATH=/usr/bin:$PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
```

Add these to your shell profile for persistence. Verify with `docker info` and look for "Security Options" showing "rootless."

The trade-off is real: rootless mode does not support all Docker features. TCP socket binding requires additional configuration, and some storage drivers do not work. For most production workloads, the security benefit outweighs the limitation. If you are running a simple web application or API server, rootless mode is worth the small inconvenience.

One important caveat: rootless mode requires kernel 5.11 or later for optimal performance. Older kernels support it but with more limitations. Check your kernel version with `uname -r` before proceeding.

## 2. Remap user namespaces

If rootless mode is not feasible, enable user namespace remapping. This maps container root (UID 0) to an unprivileged UID on the host. It is not as secure as rootless mode, but it significantly reduces the damage a container escape can cause.

The concept is straightforward: when you enable user namespace remapping, Docker creates a mapping between UIDs inside the container and UIDs on the host. Container UID 0 (root) becomes something like UID 100000 on the host. This means even if an attacker escapes the container and gains root inside it, they only get UID 100000 on the host, which has no special privileges.

Edit `/etc/docker/daemon.json`:

```json
{
  "userns-remap": "default"
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

Docker creates a `dockremap` user and group automatically. Containers now run with their root mapped to UID 100000 on the host. A container escape gives the attacker UID 100000, not UID 0.

Check the mapping:

```bash
cat /proc/$(docker inspect --format '{{.State.Pid}}' <container_id>)/uid_map
```

One thing to keep in mind: user namespace remapping changes how Docker manages image layers and container storage. Existing images and containers may not work correctly after enabling remapping. You will need to re-pull or rebuild your images. Plan this change carefully in production environments, and test it thoroughly in staging first.

The remapping also affects how you handle file permissions. If your application writes files that need to be read by other services on the host, you will need to adjust the ownership to match the remapped UIDs. This is a common source of confusion, so document the UID mapping for your team.

## 3. Run containers with read-only filesystems

Most containers do not need write access to the filesystem. A read-only root filesystem prevents attackers from modifying binaries, installing tools, or writing malicious scripts. This is a simple change with outsized security benefits.

When a container filesystem is read-only, any attempt to write to the root filesystem fails. This means an attacker who gains code execution inside the container cannot install tools, modify system binaries, or write persistent backdrops. The only writable locations are the ones you explicitly configure.

Add `--read-only` to your Docker run command:

```bash
docker run --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  --tmpfs /var/run:rw,noexec,nosuid \
  my-app
```

The `--tmpfs` flags provide writable locations for directories that genuinely need write access. The `noexec` and `nosuid` flags prevent execution of binaries and privilege escalation through setuid bits in those temporary directories. This combination gives your application the write access it needs while maintaining the security benefits of a read-only root.

For Docker Compose, add to your service definition:

```yaml
services:
  app:
    image: my-app
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid
      - /var/run:rw,noexec,nosuid
```

Test your application after enabling read-only mode. Some applications write to unexpected locations during startup or normal operation. If your container fails to start, check the error messages and add additional tmpfs mounts for the directories that need write access. Common ones include `/var/log`, `/var/cache`, and application-specific data directories.

## 4. Drop all capabilities and add only what you need

Docker containers run with a default set of Linux capabilities that most applications do not need. Dropping all capabilities and adding only the required ones reduces the attack surface dramatically. This is one of the most effective hardening steps, and it requires minimal effort.

Linux capabilities break down root privileges into distinct units. Instead of giving a process all of root's power, you can grant specific capabilities like network binding or file ownership changes. Docker's default set includes capabilities like `SYS_ADMIN` (which allows mounting filesystems), `NET_RAW` (which allows raw socket access), and `SYS_PTRACE` (which allows tracing other processes). Most web applications need none of these.

```bash
docker run \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --cap-add CHOWN \
  my-app
```

`NET_BIND_SERVICE` allows binding to ports below 1024. `CHOWN` is needed by some applications to change file ownership. Most web applications need only these two capabilities. Some applications may also need `SETUID` and `SETGID` if they switch user identities during startup.

Find out what capabilities your container actually uses:

```bash
docker run --rm --cap-drop ALL my-app
```

If the container fails, add capabilities back one at a time until it works. The error messages will tell you which capability is missing. This trial-and-error approach is faster than reading through capability documentation, and it gives you a precise list of what your application actually requires.

For a more systematic approach, use the `amicontained` tool to audit running containers:

```bash
docker run --rm -it --cap-drop ALL rastacioust/amicontained
```

This tool reports which capabilities a container is using and which syscalls it makes, helping you build a precise security profile.

## 5. Set resource limits

Unlimited resource consumption is both a reliability issue and a security risk. A compromised container consuming all host memory or CPU can take down the entire system.

```bash
docker run \
  --memory=512m \
  --memory-swap=512m \
  --cpus=1.5 \
  --pids-limit=100 \
  my-app
```

`--memory-swap=512m` prevents the container from using swap, which can mask memory issues. `--pids-limit=100` prevents fork bombs.

For Docker Compose:

```yaml
services:
  app:
    image: my-app
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.5'
    pids_limit: 100
```

## 6. Apply seccomp profiles

Seccomp (secure computing mode) filters the system calls a container can make. Docker includes a default profile that blocks dangerous syscalls, but you can tighten it further. This is one of the more advanced hardening steps, but it provides deep protection against kernel-level attacks.

Every program running on Linux makes system calls to interact with the kernel. These syscalls include operations like reading files, creating processes, and allocating memory. Some syscalls are dangerous in container contexts: `mount` can modify the filesystem, `ptrace` can inspect other processes, and `reboot` can shut down the host. Seccomp lets you block these while allowing the ones your application actually uses.

Export the default profile for reference:

```bash
docker info --format '{{.SecurityOptions}}'
```

Create a custom profile that blocks additional syscalls your application does not need. Save it as `custom-seccomp.json`:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "stat", "fstat", 
                "mmap", "mprotect", "munmap", "brk", "ioctl",
                "access", "pipe", "select", "sched_yield", "mremap",
                "msync", "mincore", "madvise", "dup", "dup2",
                "nanosleep", "getpid", "clone", "fork", "execve",
                "exit", "wait4", "kill", "uname", "fcntl", "flock",
                "fsync", "fdatasync", "getcwd", "chdir", "mkdir",
                "rmdir", "unlink", "readlink", "chmod", "chown",
                "arch_prctl", "gettimeofday", "getuid", "getgid",
                "geteuid", "getegid", "getppid", "getpgrp",
                "set_tid_address", "futex", "epoll_wait", "epoll_ctl",
                "clock_gettime", "exit_group", "openat", "newfstatat",
                "readlinkat", "set_robust_list", "get_robust_list"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Apply it:

```bash
docker run --security-opt seccomp=custom-seccomp.json my-app
```

The profile above allows only the syscalls a typical web application needs. Adjust based on your application's actual requirements. Start with the default Docker profile and progressively tighten it as you understand your application's syscall patterns. Tools like `strace` can help you identify which syscalls your application uses during normal operation.

## 7. Scan images for vulnerabilities

Do not deploy images you have not scanned. Use Docker Scout or Trivy to check for known vulnerabilities:

```bash
# Using Docker Scout
docker scout cves my-app:latest

# Using Trivy
trivy image my-app:latest
```

Integrate scanning into your CI/CD pipeline. Fail the build if critical vulnerabilities are found:

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 my-app:latest
```

Keep images updated. A vulnerability that was unknown last week may have a patch today. Schedule regular scans of your production images.

## 8. Segment container networks

Default Docker networking allows all containers to communicate with each other. In production, isolate containers that do not need to talk. Network segmentation limits lateral movement if one container is compromised, and it reduces the blast radius of security incidents.

When all containers share a single network, a compromised container can scan and attack every other container on that network. A web server exploit could lead to database access, which could lead to credential theft, which could lead to full infrastructure compromise. Network segmentation breaks this chain by restricting which containers can communicate.

Create separate networks:

```bash
docker network create --driver bridge frontend
docker network create --driver bridge backend
```

Assign containers to specific networks:

```bash
# Web server on frontend only
docker run --network frontend nginx

# Database on backend only
docker run --network backend postgres

# API on both
docker run --network frontend my-api
docker network connect backend my-api
```

Containers on different networks cannot communicate unless explicitly connected. This limits lateral movement if one container is compromised. The web server cannot reach the database directly. The database cannot reach the internet. Only the API container, which legitimately needs access to both, is connected to both networks.

For Docker Compose, define multiple networks:

```yaml
services:
  nginx:
    image: nginx
    networks:
      - frontend
  api:
    image: my-api
    networks:
      - frontend
      - backend
  db:
    image: postgres
    networks:
      - backend

networks:
  frontend:
  backend:
```

This creates a clear boundary between your public-facing services and your internal data stores. Even if an attacker compromises the nginx container, they cannot reach the database without first compromising the API container, which adds another layer of defense.

## 9. Manage secrets properly

Never hardcode secrets in Docker images or environment variables visible in `docker inspect`. Use Docker secrets or a dedicated secrets manager.

For Docker Swarm:

```bash
echo "my-database-password" | docker secret create db_password -
```

For Docker Compose with secrets:

```yaml
services:
  db:
    image: postgres
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

For production, use a secrets management tool like HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault. The key principle is: secrets should never appear in image layers, compose files, or environment variable dumps.

## 10. Enable Docker Content Trust

Docker Content Trust ensures you only pull and run images that have been signed by their publishers. This prevents supply chain attacks where malicious images replace legitimate ones.

Enable it:

```bash
export DOCKER_CONTENT_TRUST=1
```

Add to your shell profile for persistence. With DCT enabled, `docker pull` and `docker run` will only work with signed images. Unsigned images will fail with an error.

For your own images, sign them before pushing:

```bash
docker trust key generate my-signing-key
docker trust signer add --key my-signing-key.pub my-signer my-registry.com/my-image
docker trust sign my-registry.com/my-image:latest
```

## 11. Audit Docker daemon logs

Enable comprehensive logging to detect suspicious activity:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "labels": "environment,service",
    "tag": "{{.ImageName}}/{{.Name}}/{{.ID}}"
  }
}
```

Monitor container events:

```bash
docker events --since 1h --filter 'type=container' --filter 'event=start' --filter 'event=stop' --filter 'event=die'
```

Set up alerts for unusual patterns: containers starting at odd hours, unexpected network connections, or resource usage spikes that could indicate crypto mining.

## Verifying your hardening

After applying these steps, verify with Docker Bench Security:

```bash
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  docker/docker-bench-security
```

This runs the CIS Docker Benchmark and reports compliance issues. Address any findings before considering your Docker installation production-ready.

The goal is not perfection. It is making the attack surface small enough that an attacker needs multiple exploits to compromise your system, rather than one default configuration mistake.
