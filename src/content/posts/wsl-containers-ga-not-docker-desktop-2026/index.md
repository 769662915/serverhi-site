---
title: "WSL Containers Are GA. They Are Not Docker Desktop."
description: "Microsoft made WSL containers generally available on Sept. 29. The command is wsl --update, then wslc. Intune can still turn the feature off."
pubDate: 2026-10-06
coverImage: "./cover.webp"
coverImageAlt: "A closed laptop on a beige workbench beside a small blank metal box and a coiled gray ethernet cable, daylight, no logos."
category: docker
tags: ["WSL", "Docker", "Windows", "containers", "Intune"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A Windows machine where you can run wsl --update and read the WSL version afterward"
  - "If the fleet uses Intune, a way to see whether WSL Containers is disabled or limited to approved registries"
osCompatibility:
  - "Windows with WSL, updated to the GA build It's FOSS ties to the WSL 3.0.1 release notes"
  - "Docker Desktop can stay installed. This does not replace its engine on Linux hosts"
---

The new command is not `docker`. [Logan Iyer's Sept. 29 post on the Windows Developer Blog](https://blogs.windows.com/windowsdeveloper/2026/09/29/wsl-containers-now-generally-available) says WSL containers are generally available that day, and that the way to try them is `wsl --update` or a download of the latest release from GitHub. [Mayank Parmar at BleepingComputer the same day](https://www.bleepingcomputer.com/news/microsoft/microsoft-is-rolling-out-linux-container-support-to-wsl) names the binary: `wslc.exe`, with `container.exe` as an alias. If a runbook says "we turned on containers in WSL, so Docker is done," the runbook has merged two tools that Microsoft is still describing side by side.

We wrote a kernel bug that mattered because containers see the host in [CVE-2026-80521, check the kernel, not Docker](/posts/ubuntu-cve-2026-80521-docker-hosts/). We wrote a token-length change that broke assumptions about GitHub App secrets in [new GitHub App tokens are 520 characters, not 40](/posts/github-stateless-tokens-runner-tls-2026/). We wrote an ISO refresh that was an update plus a re-enroll, not a vibe, in [Arch Linux 2026.10.01](/posts/arch-linux-october-iso-tpm2-reenroll-2026/). This week is a Windows host feature with a Linux container runtime inside it. The check is still a version and a command, not a feeling that Microsoft "supports Docker now."

## GA means the preview commands grew up, and the install line is still wsl --update

Iyer, corporate vice president for Windows Platform and Developer, frames WSL containers as the next piece of a goal he states outright: Windows as a place to build, run, and manage Linux workloads. The post says you get the feature by updating WSL. Parmar prints the same entry point. [Sourav Rudra at It's FOSS on Sept. 30](https://itsfoss.com/news/wslc-general-availability) says `wsl --update` pulls the release that includes containers, and that `wslc` is ready after that. I am not adding flags. The sources did not print any.

```bash
wsl --update
```

Then the CLI they name is `wslc.exe`, or the alias `container.exe`, for building, running, and deploying Linux containers on Windows. Iyer also describes an API so a native Windows app can start those containers programmatically. The examples he gives are local AI workloads and running a cloud-style containerized app on the machine. That is a Windows application calling a Linux container. It is not a Linux server joining a Swarm. If your fleet is Ubuntu hosts and a Docker Engine package, this blog post is not your upgrade path. It is a developer laptop path, and a Windows app path. Read it that way before you file a change against production nodes.

Rudra points the full changelog and the source at the WSL 3.0.1 release page on GitHub. I am not going to invent that URL. It's FOSS is the pointer. If `wsl --update` does not surface `wslc`, you are not on the build they are writing about, and pasting later commands will not conjure it. Check the version against the release notes they cite. A preview install that never got the GA update will look like a missing command, which is a version problem, not a PATH mystery worth an afternoon.

[Joab Jackson at Cloud Native Now on Oct. 2](https://cloudnativenow.com/features/microsoft-bakes-linux-container-support-directly-into-windows) adds the distinction I want in the ticket title. This is not Windows Containers, the feature he dates to about ten years ago. WSL containers produce and manage fully native Linux containers, OCI standard, inside the managed Linux environment WSL already runs on Windows. You can do the overlapping job with Docker Desktop. Jackson's claimed advantage is integration with native Windows capabilities, not a faster `docker build` on a Linux CI runner. Leave Docker Desktop installed if your images, credentials, and Compose files already live there. Add `wslc` if you want the WSL path. Uninstalling one because the other reached GA is how Monday loses a build that was fine on Friday.

## The commands It's FOSS printed, and the ones it did not

Rudra's table is short. I will print those commands and not decorate them. `wslc container restart` restarts a container. `wslc container cp` transfers files to and from a container as a tar archive. `wslc system info` checks the state of the WSLC environment. `wslc network connect` and `wslc network disconnect` join or remove a container from a network. `wslc network create` creates a network, with support for custom driver options. Parmar's GA list matches the shape: restarting, copying files in and out, health checks, network connect and disconnect, real-time container events, mount support, and configurable storage locations. Health checks, events, mounts, and storage location are in his feature list. They are not in the command table Rudra printed. I will not guess the subcommand.

```bash
wslc system info
wslc container restart
wslc container cp
wslc network connect
wslc network disconnect
wslc network create
```

`wslc container cp` is the one I want a human to read twice. It moves files as a tar archive. That is a normal container operation. It is also the class of operation that has bitten people when the archive is hostile and the extractor follows a link out of the destination directory. I am not turning this post into a vulnerability writeup. I am saying: do not point a copy-out at a container you do not trust, on `wslc` or on `docker`, until you know which binary is doing the extract and which user it runs as. The GA notes describe the feature. They do not describe a sandbox around untrusted images. Approved registries, which Intune can enforce, are the control Parmar actually names. Use that control if the images are not yours.

`container.exe` is an alias, Parmar and Iyer both say, so familiar container commands can be typed without the `wslc` prefix. An alias is how a script silently changes meaning. If a repository has `container` on PATH from another tool, find out which binary runs before you alias your way into the wrong engine. `wslc system info` is the command Rudra gives for the WSLC environment itself. Run that before you debug a network create. A create against an environment that did not come up is a different ticket from a create that the driver rejected.

I am not printing a Compose file, a Dockerfile, or a Kubernetes context. None of the four pieces included one. The GA story is the runtime and the new verbs. Your existing Dockerfile does not need a WSL-specific rewrite for the runtime to be interesting, and I will not invent a rewrite to make the tutorial look complete. Build with the CLI they shipped. If the build needs a flag these posts did not document, the flag belongs in the 3.0.1 changelog Rudra pointed at, not in a blog paraphrase.

## Consommé, ext4 VHDs, and a lifecycle that stays in user space

Jackson is the architecture pass. Storage: WSL containers can create native ext4-formatted virtual hard drive volumes with full Linux ext4 semantics. VirtioFS bind mounts, which he attributes to Boulay, let a process use a volume to share a Windows path with a container. That is the file-sharing story. It is not "the container sees C: the way a Linux box sees a disk." A Windows path shared in is a bind, with the semantics VirtioFS gives you. If a build assumes inotify on that path behaves like a native ext4 mount, test it. The posts do not claim the two are identical. They claim a share exists, and that ext4 VHDs exist for volumes that should be Linux-native.

Networking is a new model named Consommé. Rudra lists it among the GA headlines. Jackson says it gives WSL containers fine control over the Linux virtual machine for port mapping and host loopback, while still speaking to the Windows networking stack. Port mapping and loopback are the two operations he names. I will not extend that to a claim about hairpin NAT, IPv6, or VPN clients. If your app depends on one of those, the Consommé sentence is a hint to test, not a compatibility matrix. `wslc network create`, `connect`, and `disconnect` are the verbs Rudra printed for that model. Custom driver options are mentioned, not specified. Read the changelog before you pass a driver name you remember from Docker.

On the security side, Jackson says container lifecycle operations, spawning containers, binding ports, mounting file systems, run in user space rather than as a core system service. That is a smaller blast radius than a kernel service, and it is not the same as "unprivileged containers" in the Docker sense. User space on a Windows host is still a Windows user. Defender for Endpoint, in Parmar's account, can see process, file, and network activity inside the containers and relate it back to the Windows host. That is the monitoring story for a security team that already lives in Defender. It does not appear in these pieces as a Linux auditd replacement on a Debian server. Different host, different agent.

WSL containers are open source, Jackson says, as WSL itself is. Updating from the command line or taking the bits from GitHub are the two distribution paths he and Iyer agree on. Open source does not mean unsigned binaries from a random fork belong in an Intune-managed fleet. It means you can read the release Microsoft published. Pin the release you reviewed. `wsl --update` on a developer laptop and `wsl --update` on a build agent are the same command and different change windows.

## Intune can delete the feature you just announced

Parmar's enterprise paragraph is the one a platform team should read before a developer newsletter goes out. WSL Containers integrates with Microsoft Defender for Endpoint for the visibility above. Microsoft Intune can disable WSL Containers entirely, or restrict developers to images from approved container registries. Rudra shortens the second control to "Intune registry controls." I am treating Parmar's longer sentence as the spec: off, or approved registries only.

That is a fleet setting, not a local annoyance. If you write a setup doc that starts with `wsl --update` and ends with `wslc container restart`, and Intune has the feature disabled, the doc fails in a way that looks like a bug. It is a policy. Check the policy before you debug PATH. Approved registries are the other failure. A public image that worked on an unmanaged laptop will not pull on a machine limited to the registry list. The error may look like a network problem. Ask whether Intune is in the path before you open a firewall ticket.

Defender's view into process, file, and network activity is the reason a security team might want this on, not off. A Linux container on a Windows laptop is a place secrets and build tools already go. Seeing that activity tied back to the host is new, relative to a preview that Parmar says lacked pieces of the lifecycle. It is also a reason to be specific in the data-handling review. Process and file activity inside a container can include source code and environment variables. "We enabled Defender on WSL containers" is not a sentence that ends the review. It starts the question of retention and who can query it. These posts do not print a retention period. Do not invent one in the security questionnaire. Ask the Defender console you actually have.

I would not disable the feature by default in a shop that already allowed WSL and Docker Desktop, and I would not enable it by default in a shop that kept WSL off for a reason. The GA post is availability. Availability is not a mandate. Intune is how you express the mandate you already had. If you did not have one, write one before the newsletter, even if the one you write is "approved registries, Defender on, Docker Desktop still allowed."

## What to put in the change ticket

The ticket I would accept has five lines. Date: Sept. 29, 2026, generally available, Iyer's post. Entry: `wsl --update`, then confirm `wslc` exists, and compare the build to the WSL 3.0.1 notes It's FOSS cites. Commands you will support: the six Rudra printed, plus the alias `container.exe`, with a note that health checks, mounts, and storage location are advertised by BleepingComputer without a subcommand in the table we have. Architecture risks to test: VirtioFS binds of Windows paths, Consommé port mapping and loopback, ext4 VHD volumes if you need Linux semantics. Policy: Intune allow or deny, approved registries, Defender visibility, Docker Desktop left in place unless a separate ticket removes it.

```bash
wsl --update
wslc system info
```

That pair is the whole smoke test. If `system info` does not describe a WSLC environment, stop. Do not proceed to `network create` on a hunch. If it does, pick one internal image from an approved registry and run a container you already trust. Copy a file out with `wslc container cp` only from that image. Restart it. Connect and disconnect a network you created for the test, not the one your VPN depends on. Jackson's Consommé description is specific enough to justify that test and not specific enough to skip it.

Linux servers do not get this feature. A Debian host running Docker Engine is outside the post. The kernel CVE piece still applies there. A Windows build agent that only existed to run Docker Desktop might be a candidate, and it might not, depending on Compose, buildx, and the credential helper you already scripted. WSL containers being GA does not migrate those scripts. It gives you a second CLI. Second CLIs are how environments drift. Name the one the pipeline uses. Leave the other installed or remove it in a ticket that lists the scripts, not in a sentence at the bottom of a GA announcement.
