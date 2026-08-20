---
title: "Docker Build Secrets: How to Stop Leaking Credentials Into Your Image Layers"
description: "A practical guide to using BuildKit's --secret flag to keep passwords, tokens, and keys out of your Docker images for good."
pubDate: 2026-08-20
coverImage: "./cover.webp"
coverImageAlt: "Terminal showing Docker build with secret mount"
category: "docker"
tags: ["Docker", "BuildKit", "Security", "DevOps", "Dockerfile"]
author: "ServerHi Editorial Team"
difficulty: "intermediate"
estimatedTime: "20 minutes"
prerequisites:
  - "Docker 23+ installed"
  - "Familiarity with multi-stage builds"
  - "Basic understanding of Dockerfile syntax"
osCompatibility: ["Ubuntu 22.04", "Debian 12", "macOS", "Windows"]
---

## Why Your Docker Images Are Leaking Secrets

Every Docker image carries a history. Run `docker history your-image` and you'll see every command that built it, including any secrets you passed through `ARG`, `ENV`, or `COPY`. If you built an image with a private npm token, a database password, or an SSH key baked into a layer, that secret is sitting in the image forever. Pull the image, inspect the layers, and anyone with access can extract it.

This is not theoretical. Scanning tools like Trivy and Grype flag leaked secrets in images daily. In production, these images end up on registries, shared across teams, and sometimes on public hubs. A leaked API key in an image layer is just as dangerous as a leaked key in a git commit, except there's no `git filter-branch` to clean it up.

BuildKit's `--secret` mount is the fix. It lets you pass sensitive data to a build without ever writing it to an image layer. Here's how it works and how to use it properly.

## A Quick Note on BuildKit Requirements

BuildKit has been the default builder since Docker Engine 23.0 (released in early 2023). If you're running Docker 20.x or older, you can still use it, just set the `DOCKER_BUILDKIT=1` environment variable or enable it in your daemon config. The `--secret` flag works identically across Linux, macOS, and Windows with Docker Desktop.

One important detail: the `--secret` flag only works with the `docker build` command, not with `docker-compose build`. If you're using Compose, you'll need to pass secrets through build arguments or use a wrapper script. Docker Compose v2.24+ added experimental support for build secrets via the `secrets` key in `compose.yaml`, but it's not universally available yet. For now, the most reliable approach is to use `docker build` directly for images that need secrets.

## Verifying That Your Images Are Clean

After building with `--secret`, you should confirm that no sensitive data leaked into the image. There are two key checks.

First, inspect the image history:

```bash
docker history my-app:latest
```

Look for any `ARG` or `ENV` commands that might contain secrets. With `--secret`, you'll only see the command that ran — not the data it used. If you see a long base64 string or a token in the history, something went wrong.

Second, scan the image with a tool like Trivy:

```bash
trivy image my-app:latest --severity HIGH,CRITICAL
```

Trivy checks for leaked secrets, vulnerable packages, and misconfigurations. It's a good safety net, especially in CI/CD pipelines where builds happen automatically.

You can also use `dive` to inspect individual layers:

```bash
dive my-app:latest
```

Dive shows you what each layer contains. If a layer has a file that looks like a credential, you'll spot it immediately.

## Handling Secrets in Docker Compose

If you're building images with Docker Compose and need to pass secrets, the options are more limited than with `docker build`. Here are the practical approaches.

The simplest method is to use a build argument that references a host file. In your `compose.yaml`:

```yaml
services:
  app:
    build:
      context: .
      args:
        - NPM_TOKEN=${NPM_TOKEN}
    environment:
      - NODE_ENV=production
```

But remember — `ARG` values leak into the build history. For production, you're better off building with `docker build --secret` directly and then referencing the built image in your Compose file.

Another option is to use Docker's `secrets` configuration (Compose v2.24+):

```yaml
services:
  app:
    build:
      context: .
      secrets:
        - npmrc
    image: my-app:latest

secrets:
  npmrc:
    file: ./.npmrc
```

This passes the secret to the build, but the exact behavior depends on your Docker version. Test it in your environment before relying on it in production.

## Real-World Scenario: Building a Production Node.js Application

You have a Node.js application that depends on packages from a private npm registry. You need to build a production image without leaking the registry token.

Create a `.npmrc` file on your host:

```bash
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
```

Write the Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t my-app:latest .
docker run -p 3000:3000 my-app:latest
```

The token is used during `npm ci` but never stored in any layer. The final image runs as a non-root user and contains only the built application and its dependencies.

Verify the image is clean:

```bash
docker history my-app:latest
trivy image my-app:latest
```

Both commands should show no traces of the npm token.
 
## The Problem with Traditional Secret Handling

Let's look at the three ways people typically pass secrets into Docker builds, and why each one is broken.

### ARG and ENV

```dockerfile
ARG NPM_TOKEN
RUN npm install --auth-token=$NPM_TOKEN
```

The `ARG` value is stored in the image metadata. Even though `ARG` values don't appear in the final image, they're visible in the build history. Anyone who pulls the image can run `docker history` and see the token in plain text.

`ENV` is worse. The variable persists in every subsequent layer.

### COPY with .env files

```dockerfile
COPY .env /app/.env
RUN source /app/.env && npm install --auth-token=$NPM_TOKEN
```

The `.env` file is now in the image. Even if you delete it in a later `RUN` command, it still exists in the previous layer. You'd need a multi-stage build to scrub it, and even then, the layer history might retain traces.

### Multi-Stage Build Workaround

```dockerfile
# Build stage
COPY .env /app/.env
RUN source /app/.env && npm install
# Final stage
FROM node:20-slim
COPY --from=builder /app/node_modules /app/node_modules
```

This works for keeping secrets out of the final image, but the builder image still has the secrets. If you push the builder stage or share it with a team, the secrets are exposed. It also doesn't help if someone runs the build locally and forgets to prune the builder.

## How BuildKit Secret Mounts Work

The `--secret` flag passes a file from your host into the build as a tmpfs mount. The file is only available during the specific `RUN` command that mounts it. It's never copied into any layer, never written to the filesystem, and never visible in `docker history`.

The syntax looks like this:

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install
```

And you invoke it with:

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc .
```

Here's what happens under the hood:

1. Docker reads the host file (`$HOME/.npmrc`) and passes it to BuildKit
2. BuildKit creates a temporary in-memory filesystem for the build
3. During the `RUN` command, the secret is mounted at the specified target path
4. After the command finishes, the mount is removed
5. The layer records only that `npm install` ran, not what was in the secret

The secret never touches the build context, never gets `COPY`ed, and never appears in any layer.

## Practical Examples

### Example 1: Private npm Registry

This is the most common use case. You have a private npm registry (GitHub Packages, Verdaccio, etc.) and need to authenticate during `npm install`.

**Host setup:**

```bash
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc
```

**Dockerfile:**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --production

COPY . .
RUN npm run build

FROM node:20-slim
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
```

**Build command:**

```bash
docker build --secret id=npmrc,src=.npmrc -t my-app .
```

The `npmrc` file is mounted only during `npm ci`. It never appears in any layer. The final image has the installed dependencies but no trace of the token.

### Example 2: SSH Key for Private Git Repositories

When you need to clone private repositories during build (common with Go modules, Ruby gems, or pip packages from private repos).

**Dockerfile:**

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.22 AS builder

WORKDIR /app
RUN --mount=type=ssh git clone git@github.com:myorg/private-lib.git
RUN go build -o app .

FROM debian:bookworm-slim
COPY --from=builder /app/app /usr/local/bin/app
CMD ["app"]
```

**Build command:**

```bash
# Make sure SSH agent is running with your key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

docker build --ssh default=$SSH_AUTH_SOCK -t my-go-app .
```

The SSH socket is available only during the `RUN` that needs it. The private key never enters the image.

### Example 3: GPG Key for Package Signing

Some package managers need GPG keys to verify or sign packages.

```dockerfile
# syntax=docker/dockerfile:1

FROM ubuntu:24.04

RUN --mount=type=secret,id=gpgkey,target=/tmp/gpg-key.gpg \
    gpg --import /tmp/gpg-key.gpg && \
    apt-get update && \
    apt-get install -y signed-by-example && \
    rm -rf /var/lib/apt/lists/*
```

```bash
docker build --secret id=gpgkey,src=$HOME/.gnupg/private-key.gpg -t my-app .
```

## Comparison of Secret Handling Methods

| Method | In Final Image | In Build History | In Builder Stage | Ease of Use |
|--------|---------------|-----------------|-----------------|-------------|
| `ARG` | No | Yes (visible) | Yes | Easy |
| `ENV` | Yes | Yes | Yes | Easy |
| `COPY .env` | Yes | Yes | Yes | Easy |
| Multi-stage COPY | No | No | Yes | Medium |
| `--secret` | No | No | No | Medium |

The `--secret` mount is the only method that keeps secrets out of all three: the final image, the build history, and the builder stage.

## Production Best Practices

### 1. Keep Secret Files Out of the Build Context

The `--secret` flag reads from the host filesystem, not the build context. This means your `.npmrc`, SSH keys, and other secrets never need to be in the directory you're building from. Add them to `.dockerignore` anyway, it's a safety net.

```dockerignore
.npmrc
*.pem
*.key
.env
```

### 2. Use Specific Secret IDs

Don't use generic names. Give each secret a descriptive ID:

```dockerfile
RUN --mount=type=secret,id=npm_registry_token,target=/root/.npmrc npm install
RUN --mount=type=secret,id=ssh_deploy_key,target=/root/.ssh/id_rsa git clone ...
```

This makes Dockerfiles self-documenting and prevents accidental overwrites when multiple secrets are mounted.

### 3. Mount at the Exact Path Needed

The `target` path should be where the tool expects the secret. Common paths:

- npm: `/root/.npmrc`
- pip: `/root/.pypirc`
- gpg: `/tmp/gpg-key.gpg` (then import)
- ssh: `/root/.ssh/id_rsa` (then set permissions)

### 4. Clean Up After Using Secrets

If you modify a secret file (like importing a GPG key), clean up within the same `RUN` command:

```dockerfile
RUN --mount=type=secret,id=gpgkey,target=/tmp/key.gpg \
    gpg --import /tmp/key.gpg && \
    rm /tmp/key.gpg && \
    apt-get update && apt-get install -y my-package
```

Even though the mount is temporary, good hygiene matters for debugging and clarity.

### 5. Validate in CI/CD

If you're using GitHub Actions, GitLab CI, or similar, pass secrets through the build command:

```yaml
# GitHub Actions example
- name: Build Docker image
  run: |
    docker build \
      --secret id=npmrc,src=.npmrc \
      --ssh default=$SSH_AUTH_SOCK \
      -t my-app:${{ github.sha }} .
```

Most CI platforms provide mechanisms to set up SSH agents and expose secrets as files.

### 6. Scan Your Images

Even with `--secret`, run a scan to confirm nothing leaked:

```bash
trivy image my-app:latest --severity HIGH,CRITICAL
```

This catches accidental secrets, vulnerable dependencies, and misconfigurations.

## Troubleshooting Common Issues

### "secret not found" Error

```bash
ERROR: failed to solve: secret not found: npmrc
```

Make sure you're passing the secret in the build command:

```bash
docker build --secret id=npmrc,src=.npmrc .
```

The `id` must match what's in the Dockerfile's `--mount=type=secret,id=`.

### Secret Not Available During Build

If the tool can't find the secret file, check the `target` path. The file is mounted exactly at that path — not in a parent directory:

```dockerfile
# Wrong: expecting npmrc in /app, but mounted at /root/.npmrc
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install

# Right: mount at where npm reads it
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install
```

### BuildKit Not Enabled

The `--secret` flag requires BuildKit. Docker 23+ has it enabled by default. For older versions:

```bash
export DOCKER_BUILDKIT=1
docker build ...
```

Or set it in your daemon configuration at `/etc/docker/daemon.json`:

```json
{
  "features": {
    "buildkit": true
  }
}
```

## What's Next

Now that your secrets are handled properly, here are some directions to explore:

- **Docker Image Optimization**: Slim down your images after securing them
- **Docker Security Hardening**: Lock down your production containers end-to-end
- **Docker Compose in Production**: Use secrets in Compose with the `secrets` configuration
- **Docker BuildKit Cache Optimization**: Speed up rebuilds while keeping secrets clean

BuildKit secret mounts require one extra flag in your build command, but they eliminate an entire class of security issues. If you're still passing tokens through `ARG` or `ENV`, it's worth spending ten minutes switching.
