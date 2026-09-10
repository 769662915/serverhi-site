---
title: "CrowdStrike's SBOM Now Feeds a Container Rebuild"
description: "RapidFort hooked Falcon Cloud Security at Fal.Con 2026. The pitch is hardened images from someone else's scan data, swapped in without touching app code."
pubDate: 2026-09-11
coverImage: "./cover.webp"
coverImageAlt: "Workbench with a PC showing a package list and a stack of labeled shipping boxes, warehouse light, no neon."
category: docker
tags: ["Docker", "RapidFort", "CrowdStrike", "SBOM", "containers"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "Permission to change base images in CI"
  - "Access to an image registry and a scanner or Falcon data"
osCompatibility:
  - "Ubuntu 24.04"
  - "Debian 12"
  - "RHEL 9"
---

RapidFort used CrowdStrike's Fal.Con 2026 show to say the quiet part of container security out loud. Scanning is not the job. [The job is a new image](https://cloudnativenow.com/features/rapidfort-allies-with-crowdstrike-to-harden-container-images).

Mike Vizard's Cloud Native Now piece is the public account. RapidFort will ingest vulnerability findings and SBOM data from Falcon Cloud Security, then rebuild a hardened container image. Mike Wood, RapidFort's CMO, says you can swap that image in without changing application code. They will also cut images that still run on an older Kubernetes you have not been allowed to upgrade. RapidFort Runtime watches the open source inside a running image for unexpected changes and for the next CVE.

If you already run Docker in production, that is an operations story, not a keynote. We covered [Docker Hardened Images as a distroless starting point](/posts/docker-hardened-images-dhi-production-security/). This week's news is the other half: take a scan you already pay CrowdStrike for, and turn it into a base layer you can pin.

## What the integration claims to do

Three bullets from Vizard, which is all we have in public so far.

Falcon Cloud Security already knows what is in the image and what is wrong with it. RapidFort reads that SBOM and those findings instead of making you run a second full inventory for their tool. It rebuilds. You deploy the rebuild.

"Without application code changes" is the sentence vendors always want. Sometimes it is true. If the app is a language runtime plus your JAR or Go binary, swapping Debian for a trimmed Debian, or Alpine for distroless, can work. If your entrypoint is `bash -lc` and your Dockerfile assumes `apt-get` at runtime, the hardened image will boot and then sit there confused. Try it in the environment that looks like production, not on a laptop that still has a shell in every layer.

The older-Kubernetes claim is more interesting than the CMO quote about "free from known vulnerabilities." Lots of platforms will not let you bump the cluster. They will let you change the image. If RapidFort can emit a userland that still runs on that cluster, that is a real constraint, not a slogan. Ask them which Kubernetes versions they regression-test. If the answer is "it depends," you are the test.

Runtime is a separate product in the same article. It monitors open source inside the container for unauthorized or unexpected changes, and it tries to tell you whether a newly published CVE hits what you actually shipped. That is closer to drift detection than to a scanner. Useful if your threat is "someone wrote a file into the image after it left CI." Useless if your threat is "we still run `latest`."

## What this does not replace

It does not replace [keeping the Docker socket off the AI agent box](/posts/docker-socket-ai-agent-isolation-2026/). A rebuilt image with a pretty SBOM still loses if a process on the host can talk to `dockerd`. Different layer.

It does not replace pinning digests. If CI pulls `rapidfort/your-app:stable` by tag, you have a nicer tag. Pin `@sha256:`. Put that digest in the deployment manifest. Record it next to the Falcon report that justified the rebuild.

It does not replace distroless or DHI as a default. If your starting point is a full Ubuntu because that is what the intern copied in 2023, RapidFort is doing cleanup you should not need. Start from [a hardened official image](/posts/docker-hardened-images-dhi-production-security/) when the software you need exists there. Use a rebuild vendor for the long tail.

It does not mean Falcon is now your image factory. Falcon remains the sensor and the graph. RapidFort remains the rebuild. Two invoices, one pipeline. Budget for both or you will keep the scan and skip the rebuild, which is how we got here.

## A pipeline that matches the pitch

You do not need their brand names to adopt the shape.

Build as you do today. If you still run `docker init` to get a first Dockerfile, we already [walked through that scaffold](/posts/docker-init-project-scaffold-2026/). Keep the app bits. Throw away the extra packages.

Generate an SBOM in CI. Syft, Docker Scout, Falcon, pick one and stop generating three that nobody reads. The RapidFort news is specifically that Falcon's SBOM can be the input. If you do not have Falcon, you still need an SBOM. Do not invent a second format.

Fail the build on a policy you can defend: critical CVEs in packages your process loads, not a 4,000-row PDF. If the policy is "no criticals in the runtime language and openssl," write that down. If the policy is "zero findings," you will waive everything.

Rebuild or rebase when the policy fails. That is the RapidFort step. The manual version is a newer base digest and a rebuild. The automated version is their product. Either way the artifact that goes to the registry should be the trimmed image, signed if you already sign, with a digest.

Deploy by digest. Watch Runtime-class signals if you have them: unexpected binaries, unexpected listening ports, a CVE that landed after the build. If you do not have Runtime, `docker history` and a nightly rescan of what is actually running are the poor version.

None of that requires Fal.Con. Fal.Con is why this is news this week instead of a vendor blog in isolation.

## Questions to ask before you swap a registry namespace

Who owns the rebuild when it breaks the app. If RapidFort emits an image that drops a shared library your native extension needs, is that a ticket to them or a Friday for you.

How they prove the SBOM they ingested matches the image they emitted. A rebuild that "removes vulnerable packages" can also remove the package you thought you still had. Demand a diff, not a green badge.

What happens on a Falcon outage. If the rebuild pipeline cannot pull findings, does CI ship the last known good digest or does it ship nothing. Pick one on purpose.

Where the rebuild runs. If your images cannot leave the region, their factory has to sit in that region. "We rebuild in our cloud" is a data-flow diagram, not a feature.

Can you still `docker run` the result locally with the same entrypoint. If developers cannot reproduce production without a CrowdStrike agent, the swap will happen once and then rot.

## Why this belongs in the Docker column

Container security talk usually lives in the scanner aisle. Docker users feel it as a base-image problem. You pull, you build, you push, you discover the parent image aged six weeks in an afternoon. CrowdStrike already sitting on the SBOM is a distribution play. RapidFort turning that into a drop-in image is a Dockerfile play.

I would not rip out a working distroless pipeline for this. I would use it where the cluster cannot move and the base image cannot stay. That is a smaller set of services than a keynote implies. It is also the set that still pages people.

Do not skip that line.

Put the cluster version next to that USER note.

If the rebuilt image needs a new USER, put that in the runbook the same day.

Record the digest in the ticket that approved the swap. Auditors read tickets. They do not read booth copy.

If your registry still allows `:latest` on production namespaces, fix that first. A hardened image tagged latest is a riddle.

Do not let the Fal.Con sticker replace a FROM line you understand.

Attestations belong next to the digest. If you already sign with cosign, sign the RapidFort output too. A rebuilt image that nobody can verify is just a different untrusted blob. Falcon can tell you what was wrong. Cosign tells you the thing you deployed is the thing you rebuilt.

Multi-stage builds still matter. If RapidFort receives a fat image because your Dockerfile copies a compiler into the final stage, they are cleaning a mess you made. Keep the compiler in stage one. Copy the binary. Then let a rebuild tool fight the remaining OS packages, not gcc.

If you already generate SBOMs with syft and never look at them, Falcon plus RapidFort is not your missing tool. A person who is allowed to change the FROM line is. Buy the pairing when that person is out of hours and the cluster still cannot move.

Scan-and-waive is how most Docker shops actually work. The report lands. Someone marks 40 findings as "accepted risk" because the base image is what legal already blessed. RapidFort's pitch is to stop accepting the base. That is a cultural change disguised as an API. If your change board thinks images are immutable once they left the first build, a rebuild vendor will die in committee. If your change board already accepts weekly base bumps, this is just another bump with a CrowdStrike ID on the ticket.

Rootless Docker and hardened images are cousins, not twins. Rootless shrinks what a container-breakout can do on the host. A trimmed image shrinks what there is to break out of. Do both if you can. Do not skip the socket rule because the image is pretty.

Image size is the metric you can see without Falcon. If the rebuild is still 1.2 GB, they removed a CVE string and left the distro. If it drops to a few hundred megabytes and the app still starts, the SBOM got shorter in a way that matters. Check `docker image ls` before you trust a dashboard.

Compose files should pin. A `image: org/app:prod` line is how Friday's rebuild becomes Monday's mystery. Put the digest in compose or in the Kubernetes tag you already use. Leave a comment with the Falcon report ID if that is what your auditors want to see. They will not read a keynote.

Fal.Con is a partner circus. Most booths will show a graph. This pairing at least ends in a blob in a registry. Demand the blob. Run it. Then decide if the second invoice is cheaper than doing the rebase yourself.

Fal.Con will produce a dozen more pairings this month. Most of them will be dashboards. This one at least ends in an artifact you can put in a registry. That is the bar. An image with a digest. Not a slide.
