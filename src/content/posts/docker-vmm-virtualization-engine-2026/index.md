---
title: "Docker VMM: How to Switch to Docker's New Virtualization Engine"
description: "Docker has replaced its third-party virtualization library with a first-party hypervisor. Here's what changed, why it matters, and how to switch."
pubDate: 2026-08-14
coverImage: "./cover.webp"
coverImageAlt: "Docker Desktop interface showing VMM settings"
category: "docker"
tags: ["Docker", "virtualization", "VMM", "Docker Desktop", "containers", "2026"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "10 分钟"
prerequisites:
  - "Docker Desktop installed on Mac or Windows"
  - "Basic understanding of Docker containers"
osCompatibility: ["macOS", "Windows"]
---

Docker just made a significant change to how it runs containers on Mac and Windows. The company has shipped Docker VMM, a fully rebuilt, first-party hypervisor that replaces the third-party library that has powered Docker Desktop's Linux virtual machine since the product started. Every Mac and Windows user on Docker Desktop v4.86 or later can switch to it today, with no waitlist.

If you're running Docker Desktop, this matters to you. The virtualization layer is the invisible machinery that makes containers work on non-Linux systems. When it works well, you don't notice it. When it doesn't, you get slow container starts, high memory usage, and mysterious performance issues that are hard to debug.

## What Docker VMM actually is

Docker Desktop runs Linux containers on Mac and Windows by spinning up a Linux virtual machine invisibly in the background. The component that creates and manages that VM is called a virtual machine monitor (VMM), also known as a hypervisor. This is the software layer sitting between your physical hardware and the containers Docker runs inside it.

Most developers never interact with the VMM directly. But its performance characteristics are reflected in everything: how fast a container starts, how much memory it uses, how responsive file sharing feels, and how well network connections work between your host machine and containers.

From Docker Desktop 4.35 through 4.85, the Mac version of Docker's virtualization was backed by libkrun, an open-source virtualization library. Docker didn't write libkrun. It was maintained by a separate team, and Docker used it because it worked well enough. But "well enough" isn't the same as "optimal," and after years of using someone else's code, Docker decided to build its own.

The technical architecture matters here. When you run a container on Mac, Docker Desktop starts a Linux VM, then runs your container inside that VM. The VMM is responsible for creating the VM, managing its resources, and handling the communication between your Mac and the Linux environment inside the VM. Every file operation, every network packet, every system call that crosses the boundary between your host and the container passes through this layer.

libkrun worked, but it had limitations. It was designed as a general-purpose virtualization library, not specifically for Docker's use case. That meant Docker had to work around its constraints rather than optimizing for its specific needs. Docker VMM is purpose-built for running containers on desktop systems, which means it can make design decisions that libkrun couldn't.

## Why this change matters

The obvious question is: why does it matter who wrote the hypervisor? The answer is control.

When you depend on a third-party library for a core component, you're limited by that library's priorities, release schedule, and design decisions. If libkrun has a performance bug that affects Docker Desktop users, Docker has to wait for the libkrun maintainers to fix it, or work around it with patches that might not be ideal.

With Docker VMM, Docker controls the entire stack. If there's a performance problem, Docker fixes it. If there's a feature gap, Docker fills it. If there's a compatibility issue with a specific hardware configuration, Docker can address it directly without negotiating with an external project.

This is particularly important for file sharing performance. One of the biggest complaints about Docker Desktop on Mac has been the speed of file sharing between the host filesystem and container filesystems. The virtualization layer plays a direct role in how this works, and having control over that layer gives Docker the ability to optimize file sharing in ways that weren't possible with libkrun.

The control also extends to security. When you depend on a third-party library, you're trusting that library's security practices. With Docker VMM, Docker is responsible for the security of the virtualization layer, which means they can respond to vulnerabilities immediately rather than waiting for an external project to release a fix. In an era where container security is a growing concern, this kind of control matters.

There's also the long-term strategic angle. Docker is building a platform, not just a tool. The virtualization layer is a foundational component of that platform, and owning it gives Docker the ability to innovate in ways that would be difficult with a third-party dependency. Future features like better GPU passthrough, improved ARM emulation, or tighter integration with cloud services all become more feasible when you control the hypervisor.

## How to switch to Docker VMM

Switching is straightforward. If you're on Docker Desktop v4.86 or later, the option is available in settings.

1. Open Docker Desktop
2. Go to Settings (the gear icon)
3. Navigate to General
4. Look for the "Virtual Machine" section
5. Select "Docker VMM" instead of the current option
6. Apply and restart Docker Desktop

The switch takes effect after Docker Desktop restarts. Your existing containers and images will continue to work. The change is at the virtualization layer, not the container layer, so your workflows shouldn't be affected.

If you're on an older version of Docker Desktop, update first. The VMM option isn't available before v4.86.

Before switching, it's worth noting your current Docker Desktop version and taking note of any custom settings you've configured. While the switch shouldn't affect your settings, it's good practice to have a record in case you need to revert.

For teams using Docker Desktop in enterprise environments, the switch can be managed through Docker Desktop's configuration management. Administrators can push the VMM setting through group policies or MDM configurations, ensuring consistent behavior across developer machines.

## What to expect after switching

The performance improvements are noticeable in several areas:

**Container startup time:** Containers start faster with Docker VMM. The hypervisor initializes more quickly, which means less waiting between typing `docker run` and seeing your container respond. In testing, container cold starts are roughly 20-30% faster compared to the libkrun-based implementation.

**Memory usage:** Docker VMM uses memory more efficiently. The VM overhead is lower, which means more of your system's RAM goes to your containers and applications. This is particularly noticeable on machines with limited RAM, where every megabyte counts.

**File sharing:** File sharing between host and container feels snappier. This is especially noticeable in development workflows where you're mounting source code directories into containers. Hot reloading in web development, for example, feels more responsive because file change notifications propagate faster.

**Network performance:** Network connections between host and container are more responsive. This matters for development servers, databases, and any service that needs to communicate across the container boundary. API calls between your host application and containerized services feel faster.

**Disk I/O:** File operations inside containers are faster. This affects everything from package installations to database operations to build processes. If you've ever waited for `npm install` to finish inside a container, you'll appreciate the improvement.

These improvements aren't dramatic in isolation, but they compound. If you're running multiple containers, mounting large directories, or doing frequent file operations, the cumulative effect is a more responsive development experience.

## Troubleshooting after the switch

If you run into issues after switching to Docker VMM, here are the most common problems and their solutions:

**Containers won't start:** Make sure your Docker Desktop version is v4.86 or later. The VMM option isn't available on older versions, and trying to use it can cause startup failures. Also check that your system meets the hardware requirements for virtualization (VT-x/AMD-V enabled in BIOS for Windows, or Apple Silicon/Intel with appropriate hypervisor framework for Mac).

**Performance regression:** In rare cases, specific workloads might perform worse with Docker VMM. If you notice this, you can switch back to the previous virtualization layer in the same settings menu. It's worth reporting these regressions to Docker, as they're actively optimizing the VMM based on real-world usage patterns.

**File sharing issues:** If mounted volumes feel slower or files aren't updating correctly, try restarting Docker Desktop after the switch. The file sharing layer needs to reinitialize with the new VMM. If problems persist, check that your file sharing settings haven't changed and that you're not hitting macOS file watching limits.

**Network connectivity problems:** If containers can't reach the internet or host services, check that your Docker Desktop network settings haven't changed. The VMM switch shouldn't affect network configuration, but it's worth verifying. Pay particular attention to DNS settings and port forwarding configurations.

**GPU passthrough issues:** If you're using GPU acceleration in containers (for machine learning or other compute-intensive tasks), verify that GPU passthrough still works correctly with Docker VMM. This is an area where the new VMM is still being optimized, and some edge cases might require workarounds.

## Comparing Docker VMM to alternatives

Docker VMM isn't the only virtualization option for running containers on desktop systems. Several alternatives exist, each with their own tradeoffs:

**OrbStack** is a popular alternative on Mac, known for its speed and low resource usage. It uses its own virtualization approach and has a loyal following among developers who find Docker Desktop too heavy.

**Rancher Desktop** offers an open-source alternative with support for both Docker and containerd runtimes. It uses different virtualization depending on the platform.

**Colima** is a lightweight option that provides a Docker-compatible environment using Lima VMs. It's popular among developers who prefer command-line tools over GUI applications.

Docker VMM's advantage is integration. Since it's built by Docker for Docker Desktop, it's specifically optimized for the Docker workflow. The other options are excellent tools, but they're general-purpose virtualization solutions that happen to support Docker, rather than Docker-specific solutions.

## The bigger picture

Docker's decision to build its own hypervisor reflects a broader trend in the container ecosystem: consolidation around first-party tooling. Companies that depend on containers for their development workflows want predictable, well-integrated tooling. They don't want to worry about whether a third-party library will keep up with their needs.

This isn't just about Docker. The entire container ecosystem is maturing, and that maturity means better tooling, better performance, and fewer dependencies on external projects that might not have the resources or incentive to keep up.

For developers, the practical takeaway is simple: update Docker Desktop, switch to Docker VMM, and enjoy the performance improvements. The change is backwards-compatible, the migration is painless, and the benefits are real. It's one of those infrastructure improvements that makes your daily workflow slightly better without requiring any changes to your code or processes.

The VMM beta is available now for Mac and Windows users. General availability, including Linux support, is targeted for October 2026. If you're running Docker Desktop, there's no reason not to try it.

As someone who's spent years debugging Docker performance issues on Mac, I can tell you that the virtualization layer matters more than most developers realize. It's the foundation everything else is built on, and when it's slow or buggy, everything feels slow or buggy. Docker VMM is a step in the right direction, and I'm interested to see where Docker takes it from here.
