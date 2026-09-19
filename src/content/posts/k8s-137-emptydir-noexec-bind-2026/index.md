---
title: "K8s 1.37 Can Mount /tmp noexec. Docker Images Still Need It"
description: "The Sept. 16 Kubernetes blog adds Alpha bindMountOptions and emptyDir modes. readOnlyRootFilesystem was never enough if the volume can chmod +x."
pubDate: 2026-09-20
coverImage: "./cover.webp"
coverImageAlt: "Server rack aisle with a laptop on a cart showing a YAML editor, no readable text, cool white lighting, no vendor logos."
category: docker
tags: ["Kubernetes 1.37", "emptyDir", "noexec", "bind mounts", "container security"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A cluster or kind node you can restart with feature gates"
  - "Permission to edit Pod specs and RuntimeClass if you use one"
  - "A test image you built with Docker, not a production StatefulSet"
osCompatibility:
  - "Kubernetes v1.37+ (Alpha gates)"
  - "Linux nodes only; Windows ignores these fields"
---

If you still `docker build` on a laptop and ship the tarball into a cluster, last week's Kubernetes blog is about your image even if you never type `kubectl` in the Dockerfile.

[Nispriha Jagan and Neeraj Krishna Gopalakrishna at Red Hat wrote it up on September 16](https://kubernetes.io/blog/2026/09/16/kubernetes-v1-37-hardening-container-storage). Kubernetes v1.37 adds two Alpha features: bind mount options on volume mounts, and a permission `mode` on `emptyDir`. The boring Linux flags are `noexec`, `nosuid`, and `nodev`. The reason they matter in a container is the default you already live with. The runtime and kubelet bind-mount volumes into the container without those flags. A compromised process can write a binary onto any writable volume, `chmod +x`, and run it, even when you set `readOnlyRootFilesystem: true`. The root filesystem was never the whole disk.

We spent [Friday on GKE Fragnesia](/posts/gke-fragnesia-cve-2026-46300-ubuntu-nodes/), which is a different breakout. Same class of lesson: the node is closer than your Pod spec wants to admit. Volume mounts are how a lot of those stories start.

## What actually shipped

Two feature gates, both Alpha, both required on the API server and the kubelet: `VolumeBindMountOptions` and `EmptyDirVolumeMode`. If you enable only the API server, you get a false sense of control. For `emptyDir` `mode`, the field is accepted and then ignored; the kubelet falls back to `0777`. For bind mount options, the scheduler is supposed to use Node Declared Features so the Pod does not land on a node that cannot honor them. If it still gets there, the kubelet rejects the Pod instead of silently dropping the flags. That reject is the failure mode you want. Silent ignore is how people think `/tmp` is `noexec` for six months.

`bindMountOptions` is not limited to `emptyDir`. The blog lists PersistentVolumes, CSI, projected volumes, ConfigMaps, and Secrets. Image volumes are the explicit exception. `emptyDir` `mode` works for the default disk-backed directory, `medium: Memory` (tmpfs), and HugePages.

Linux only. Windows nodes ignore `bindMountOptions`. They also skip `emptyDir` `mode`, because Windows does not do Unix permission bits. If your fleet is mixed, the YAML is a Linux control. Do not paste it onto a Windows node pool and call the audit done.

`fsGroup` still wins. If the Pod security context sets `fsGroup`, those group bits override the `mode` you put on the `emptyDir`. Same behavior as `defaultMode` on Secrets and ConfigMaps. If you needed `0750` and you also set `fsGroup`, look at the result on disk before you write the control ticket.

Omit the new fields and nothing changes. Default `emptyDir` permissions stay `0777`. Default bind mounts still lack `noexec`. That is the compatibility story and the security story.

## A Pod that actually sets the flags

The blog's example is an `emptyDir` on `/tmp` with `bindMountOptions: [noexec, nosuid]`. In spirit:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-bindmount-pod
spec:
  containers:
    - name: app
      image: your.example/app:tag
      securityContext:
        readOnlyRootFilesystem: true
      volumeMounts:
        - name: tmp
          mountPath: /tmp
          bindMountOptions:
            - noexec
            - nosuid
  volumes:
    - name: tmp
      emptyDir:
        mode: 0750
```

Do not paste this into production on 1.36. The fields are 1.37 Alpha. Confirm the gates on the control plane and on every kubelet that might run the Pod. `kind` is the right place to learn the reject path.

`0750` on the `emptyDir` is the other half. The blog's database example: only the database user and group can read or write the temporary storage, so a sidecar in the same Pod does not get a free look. Combined with `noexec`, a write-up of `/tmp` is storage, not a staging directory for a second binary.

`nodev` is the third flag in the Linux set. Use it when the volume should not grow device nodes. The blog leads with `noexec` and `nosuid` because those two are the payload-and-escalation pair.

## What this is not

It is not a Docker Engine feature flag. Docker already knows `--read-only` and tmpfs mounts. People building images with Docker still assume that a read-only root in the Compose file is the same as a hardened kubelet mount. It is not, once the orchestrator bind-mounts an `emptyDir` without `noexec`. The image can be perfect. The runtime mount decides whether `/tmp/a.out` runs.

It is not a replacement for dropping capabilities, for seccomp, or for not mounting the Docker socket. We [already told you not to hand agents the host socket](/posts/docker-socket-ai-agent-isolation-2026/). `noexec` on `/tmp` does not fix a socket that is the host.

It is not BuildKit secret hygiene. [Secrets in image layers are a different leak](/posts/docker-buildkit-secrets-guide-2026/). Mount flags do not unpublish a key you baked in at `docker build`.

## How to prove it on a throwaway node

Bring up a 1.37 control plane with both gates. Run a Pod with `readOnlyRootFilesystem: true` and a writable `emptyDir` on `/tmp`, gates off. Exec in, write a small script, `chmod +x`, run it. That is the baseline the blog is angry about.

Turn the gates on. Apply `bindMountOptions: [noexec]`. Repeat the chmod and exec. You want `Permission denied`. If you still get a running process, you are not on a kubelet that honored the flag. Check the event, not the YAML you meant to apply.

Then set `mode: 0750` and exec as a second user in a sidecar. You want the sidecar blocked. If `fsGroup` is set, you may not get the 0750 you typed. That is the override, not a kubelet bug.

Windows node: skip the test and document the exception. Do not file a ticket that "mode does nothing" on a 2019 node.

## Why a Docker-centric shop should care this week

Most of the images in a company Kubernetes fleet still start life as Dockerfiles. The people who write those files think in `USER`, `chmod`, and maybe a distroless final stage. They do not think in kubelet bind-mount flags. The gap is where the September 16 post lives.

If you are the person who reviews Dockerfiles, add a note to the template: any image that expects a writable `/tmp` must assume the cluster will one day mount it `noexec`. Do not ship an entrypoint that downloads a binary into `/tmp` and runs it. That pattern is already bad. On 1.37 it becomes a production outage when someone enables the gate.

If you are the person who writes Helm values, stop treating `emptyDir` as a free scratch disk with execute bits. Default 0777 was always a little embarrassing. Now there is a field. Alpha means you enable it on purpose, on a cluster you can break, and you watch the scheduler reject Pods on old nodes.

If you run GKE, this blog does not patch Fragnesia. Different bug. The mental model still helps: mounts and host proximity keep showing up in bulletins. Read the 1.37 notes before you copy a "hardened" Pod spec from a slide.

I would not enable Alpha gates on the cluster that pays the bills. I would enable them on the cluster where you test the next base image. The feature is a native way to match the benchmarks people already paste into audits. Until the gate is GA, the audit still has a footnote: we asked for `noexec`, the API accepted it, the kubelet might have ignored it. Check the kubelet.

## Docker Compose is not the cluster

A lot of app teams still validate with Compose on a laptop, then hand the image to a platform team. Compose `read_only: true` plus a tmpfs on `/tmp` is a reasonable local stand-in. It is not `bindMountOptions`. tmpfs on Docker Desktop can still be executable depending on how the engine created it. I have seen entrypoints that curl a binary into `/tmp` "only in CI" and then the same entrypoint ships. The CI job is privileged. The cluster is not, once someone turns the gate on.

Put a comment in the Dockerfile: this image must start if `/tmp` is mounted `noexec`. Add a smoke test that tries to exec a file from the scratch volume and expects failure. When 1.37 leaves Alpha, that test is how you find the broken jobs before the kubelet does.

HostPath is still the footgun the GKE bulletin archive is full of. The 1.37 flags do not make HostPath wise. They make `emptyDir` and CSI mounts less of a free execution path. If your chart still uses HostPath because "the agent needs Docker," go back to the socket piece. Native noexec on an `emptyDir` will not save a mount of `/var/run/docker.sock`.

ConfigMaps and Secrets in the supported list surprised me. People treat those as data. They are also files on a volume. If a process can write next to them, or if a projected volume is writable in a way you did not intend, execute bits on that mount are a story you do not want in the incident channel. Set `noexec` there when the gate is real. Do not wait for a clever payload that lives in a "config" directory.

## Rollout without lying to the audit

Gate on a non-prod pool. Label the nodes. Use Node Declared Features the way the blog describes, then try to schedule a Pod with `bindMountOptions` onto an old kubelet on purpose. You want a reject. If you get a running Pod, your scheduler story is fiction.

Watch `emptyDir` mode and `fsGroup` on the same Pod. Print `stat` in an init container. If the bits are not 0750, do not file a Kubernetes bug until you read the fsGroup sentence again.

Keep a Windows exception in the policy. Linux flags on a Windows node are theater.

When you write the control, quote the September 16 post, quote the two gate names, quote Alpha. Auditors copy "we enabled noexec." They skip "kubelet might ignore." Put the second sentence in the same bullet.

The one-sentence version: read-only root is a start. `/tmp` is the hole. v1.37 finally lets you close it in YAML, if you turn the lights on and stay on Linux.

If you cannot run 1.37 yet, you can still stop shipping the pattern. Ban `curl | sh` into `/tmp` in entrypoints. Ban downloading a helper binary at start. Use a second image stage that already contains the tool. The Alpha YAML is a cluster control. The Dockerfile change is available this afternoon, on every engine that can `docker build`.

I would rather have a slightly fatter image than a start script that assumes execute bits on scratch space. The blog is dated September 16. The hole is older. Close the hole in the image first. Turn the gate on when the kubelets catch up.

`nosuid` is the flag people skip because they already dropped capabilities. Keep it. A setuid copy on a writable volume is an old trick and it still works when the mount allows it. `nodev` is the one you add on scratch space that should never grow a device node. The blog leads with the exec pair because that is the payload path. The other two are cheap.

If your security scanner already flags missing `noexec` on volumes, 1.37 is the first time you can clear that finding with a field in the Pod spec instead of a custom runtime class or a privileged init that remounts. Custom remounts are how people break CSI. Use the native field when it is GA. Until then, the image change is the control you can ship.
