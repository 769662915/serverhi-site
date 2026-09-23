---
title: "Kubernetes 1.35 Will Not Boot Your cgroup v1 Nodes. Check Before You Type Upgrade."
description: "KEP-5573 turns failCgroupV1 on by default. 1.35 is also the last release that speaks containerd 1.x. Here is the stat command and the part the blogs disagree on."
pubDate: 2026-09-24
coverImage: "./cover.webp"
coverImageAlt: "Two server nodes on a rack shelf, one with a small green status LED, one dark, cool aisle lighting, no vendor logos."
category: devops
tags: ["Kubernetes 1.35", "cgroup v2", "containerd", "kubelet", "2026"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "35 minutes"
prerequisites:
  - "SSH to a worker node and permission to run stat and crictl"
  - "A maintenance window before any 1.35 kubelet roll"
  - "Access to the node image pipeline (AMI, golden image, or kubeadm upgrade plan)"
osCompatibility:
  - "Any Linux node still on cgroup v1 (CentOS 7, RHEL 7, Ubuntu 18.04 defaults)"
  - "Modern distros mis-set to cgroupDriver: cgroupfs"
---

If a worker still answers `tmpfs` for `/sys/fs/cgroup`, do not roll kubelet 1.35 onto it and hope for a deprecation warning. Several write-ups this week say you get a failed kubelet. One says the flag just flipped. Either way, the node is not "mostly fine."

[ScaleOps walked the 1.35 modernization cliff in their release overview](https://scaleops.com/blog/kubernetes-1-35-release-overview). [Sysdig listed the security flags](https://www.sysdig.com/blog/kubernetes-1-35-whats-new). [Palark treated the same KEP as beta](https://palark.com/blog/kubernetes-1-35-release-features). They do not agree on how dead cgroup v1 is. They agree you should look at the node before the control plane.

We already had a [1.37 emptyDir noexec note](/posts/k8s-137-emptydir-noexec-bind-2026/). That one was mounts. This one is the kernel's control-group tree.

## Run this before the upgrade window

On every OS image you still ship:

```bash
stat -fc %T /sys/fs/cgroup
```

- `cgroup2fs` — unified hierarchy, cgroup v2. Keep going.
- `tmpfs` — you are on the old layout. Stop.

ScaleOps published that check and said they validated v1.35.0-rc.1 nodes on v2. They also warned that a kubelet with `cgroupDriver: cgroupfs` on an otherwise modern distro will walk into the same wall. The driver has to be `systemd` on v2. People copy old kubeadm snippets. Those snippets are how you get a 2022 Ubuntu image behaving like 2018.

While you are on the box:

```bash
cat /proc/cmdline | tr ' ' '\n' | grep -E 'systemd.unified_cgroup_hierarchy|cgroup'
crictl version
containerd --version
```

Write down the containerd minor. 1.35 is the last Kubernetes that SIG Node is willing to pair with containerd 1.x, including 1.7 LTS, under KEP-4033. 1.36 drops it. You can survive 1.35 on 1.7. You cannot plan to still be there six months later.

If `crictl` is missing, you are already flying without a runtime inspector. Install it from the same channel you use for kubelet, not from a random GitHub release on the node.

## What the KEPs actually say, versus the blog titles

KEP-5573 is "Remove cgroup v1 support." Titles this week say Kubernetes 1.35 kills it and nodes fail to boot. Read the next paragraph before you page the on-call.

[Sysdig's note is more precise](https://www.sysdig.com/blog/kubernetes-1-35-whats-new): `failCgroupV1` defaults to `true`. Support is disabled by default. That is a first step before a later removal. [Palark says complete removal is not expected before 1.38](https://palark.com/blog/kubernetes-1-35-release-features), and that the 1.35 change lands as beta, with cgroup v2 already stable since 1.25.

[ScaleOps is harsher](https://scaleops.com/blog/kubernetes-1-35-release-overview): if kubelet detects v1 at startup, expect it to fail. Not a manifest rewrite. An infrastructure upgrade. They call out CentOS 7 (EOL June 2024), RHEL 7, and Ubuntu 18.04 as default-v1.

I am going to treat ScaleOps and Sysdig as compatible: default is fail, there may still be a flag, and the flag is not a strategy. If you need `failCgroupV1: false` to keep a museum distro alive, you are borrowing time against 1.38 and against every PSI-based autoscaler that assumes v2.

Do not take a third-party "nodes fail to boot" article as the changelog. Read the 1.35 release notes for the exact kubelet behavior on the patch you install. Then believe your staging node, not me.

## Why v2 is not a fashion choice

cgroup v2 is one hierarchy. v1 was a pile of controllers that did not agree on what a process belonged to. Kubernetes has wanted the unified tree for years because memory and CPU accounting stop lying when they share a hierarchy. The bonus ScaleOps cares about is Pressure Stall Information. PSI tells you that tasks are waiting, not just that the CPU percentage is high. If you autoscale on `cpu_usage` alone you add replicas after the node is already stuck. PSI is how you notice the stall.

You do not get PSI on v1. You also get worse isolation, which is a security conversation even if this post is filed under devops. [CybersecurityNews recapped a Unit 42-style finding this week: compromise the node, you have every workload identity on it](https://cybersecuritynews.com/kubernetes-node). SPIFFE IDs, projected service-account tokens, the whole "zero trust" diagram, sit on a kernel that still has to isolate cgroups. An old node OS is not a separate problem from identity. We made the same argument about [handing AI agents a live Docker socket](/posts/docker-socket-ai-agent-isolation-2026/). Privileged runtime access collapses the graph.

If a node cannot move to v2, do not keep putting privileged pods on it while you "wait for the rebuild." Drain it.

## Containerd 1.x is a second clock

People will fix cgroups and still die on the runtime. KEP-4033: 1.35 last dance for containerd 1.x. Check the node image, the DaemonSet that installs containerd, and the immutable OS image, because those three drift.

Upgrade containerd first, on v1.34, while kubelet is still polite. Then move kubelet. The other order is how you get a kubelet that refuses to start and a runtime you cannot talk to because the CRIs mismatch.

containerd 2.x has its own config schema. `config.toml` from 1.7 does not always load. Take a node out, convert the config, run a pause pod, then bake the image. Do not convert in place on Friday across 400 nodes.

If you are on CRI-O, you are not exempt from cgroup v1 removal. You are exempt from the containerd 1.x sentence. Still run `stat`.

## Distros that will surprise you

CentOS 7 should already be gone. If it is not, this release is the event that finally makes the risk register true. RHEL 7 same story. Ubuntu 18.04 same story. [Ubuntu 26.10 snapshot 4 is a different planet](/posts/ubuntu-2610-snapshot4-uutils-cp-2026/); if your workers are that new, cgroup v2 is probably already on and your problem is elsewhere.

The surprise cases are:

- Ubuntu 20.04 images that were converted with a grub cmdline leftover.
- Bottlerocket or Flatcar pins that nobody has bumped since 1.28.
- GPU nodes with a vendor installer that remounts cgroup v1 "for the driver."
- EKS/AKS/GKE node pools on an old AMI alias that still says "latest" in Terraform.

Managed Kubernetes will try to protect you and then fail a node-pool upgrade with a generic health error. Read the kubelet journal on the instance, not the console banner.

```bash
journalctl -u kubelet -b --no-pager | tail -n 80
```

If you see cgroup v1 in that tail, you have the answer. Do not start deleting Deployments.

## A staging drill that takes half an hour

1. Snapshot one non-prod worker that matches production's AMI.
2. Run the `stat` check. If tmpfs, stop and rebuild the image on a v2 distro. Do not toggle a kubelet flag and call it done.
3. If cgroup2fs, set `cgroupDriver: systemd` explicitly. Do not rely on detection.
4. Upgrade containerd to a 2.x your CNI and sandbox images support. Restart. `crictl pods`.
5. Install kubelet 1.35 (or the rc you trust) on that one node. Join it. Drain a canary Deployment onto it.
6. Confirm PSI files exist: `/proc/pressure/cpu` should be readable.
7. Only then touch the node pool template.

If step 5 fails, you found the issue in staging. That is the entire point.

## Other 1.35 footguns while you are in the notes

ScaleOps flagged two HPAs selecting the same pods: the controller now refuses with `AmbiguousSelector` instead of fighting itself. If your "HPA is broken" ticket starts the morning after the upgrade, look for overlapping selectors before you roll back the cluster.

Sysdig flagged `KubeletEnsureSecretPulledImages` defaulting true: a pod without pull credentials should not ride an image another pod already fetched. That will break cache-happy CI nodes that assumed the first job's secret covered the rest. It is a good break. Fix the service account.

Palark mentioned pod-level restart rules building on container restart policies. Alpha. Do not design production around alpha. Do read it if you have been stuffing `restartPolicy` hacks into sidecars.

## How a v1 node actually becomes v2

On Debian/Ubuntu you are looking at the kernel cmdline, not a kubelet flag. `systemd.unified_cgroup_hierarchy=1` and no leftover `cgroup_enable=memory` hacks from 2018 blog posts. Reboot. `stat` again. If it still says tmpfs, the image has a volume or a container runtime remounting the old tree. Docker-in-docker jobs love to do this. GPU driver installers love to do this. Find the remount before you blame Kubernetes.

On RHEL-family 8 and 9, v2 is usually already default. The stragglers are 7.x AMIs someone cloned in 2021 and never renamed. Do not "upgrade in place" from 7 to 8 on a kube worker. Bake 8 or 9, roll the pool.

kubeadm clusters: set `cgroupDriver: systemd` in `kubelet-config` and in the containerd `SystemdCgroup = true` stanza together. If they disagree, kubelet 1.35 is a good way to find out. Managed pools: change the node image ID, not a user-data sed. User-data that toggles cmdline after first boot will fight the image on the next rotate.

Hybrid: if 10 percent of nodes are v1, a DaemonSet with a v2-only feature (PSI exporter, some eBPF agents) will crash-loop on that 10 percent and look like a cluster-wide outage in the dashboard. Label the old pool `cgroup=v1` and keep those DaemonSets off it until it dies.

## What I would put in the change ticket

"Kubernetes 1.35 defaults `failCgroupV1` to true (KEP-5573). Nodes reporting tmpfs on `/sys/fs/cgroup` must be reimaged to cgroup v2 / `cgroupDriver: systemd` before kubelet 1.35. 1.35 is also the last release for containerd 1.x (KEP-4033); containerd 2.x lands on the same images this quarter. Complete v1 removal is described as later (Palark: not before 1.38). We will not rely on the disable flag."

Paste the `stat` output from a sample of each pool. If you cannot produce that table, you are not ready to upgrade.

The blogs this week argued about beta versus hard fail. Your journalctl will not argue. Run it on one node today, while the cluster is still on the version that boots.

One more pass on the GPU pool, because that is where v1 hides after you cleaned the CPU workers. Vendor installers remount controllers, and the node still reports Ready. `stat` is cheaper than an incident. If the GPU AMI is a fork, fork it again from a v2 base rather than patching cmdline in a systemd unit that races containerd. Then take a coffee. Then run `stat` on a node that came up after the coffee, not the one you just fixed by hand. Put the command in the node bootstrap so a pool rotate cannot "forget." A wiki page is not a control. A failing systemd unit that refuses to start kubelet when `stat` returns tmpfs is a control.


