---
title: "Docker Agent Is a YAML File. Desktop 4.63 Has It."
description: "The docker-agent README says Desktop 4.63+ already includes the plugin. KDnuggets, Oct. 8, still says you bring the model key."
pubDate: 2026-10-11
coverImage: "./cover.webp"
coverImageAlt: "A dim server aisle with one monitor glowing a blurred terminal and a printed page of illegible lines on a keyboard tray, cool light, no logos."
category: docker
tags: ["Docker Agent", "Docker Desktop", "YAML", "MCP", "OCI"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "A host where you can run docker version and see whether the CLI plugin is already on disk"
  - "Permission to set an API key in the environment, or a working Docker Model Runner, if you intend to run an agent rather than only inspect the plugin"
  - "A habit of not committing that key into the YAML you are about to review"
---

The install line is shorter than the pitch. The [docker-agent README](https://github.com/docker/docker-agent) says Docker Desktop 4.63 and newer already includes the CLI plugin. The check is `docker agent`. If that prints help instead of "is not a docker command," you are not waiting on a download. [KDnuggets on October 8](https://www.kdnuggets.com/building-ai-agents-with-docker-agent) is the week's writeup of the same tool, and it does not change the install floor. It adds a count, a licence, and a reminder that the model is still your problem.

## What the README says is already on a current Desktop

`docker-agent` is a Docker CLI plugin. You run it as `docker agent`, not as a separate daemon you schedule beside the engine. The README's install block has three doors.

Desktop 4.63 or newer: the plugin is preinstalled. Run `docker agent`.

Homebrew: `brew install docker-agent`. You can run the `docker-agent` binary directly, or symlink it to `~/.docker/cli-plugins/docker-agent` so the `docker agent` form works.

GitHub release binary: same symlink, same choice. The README says to put `docker-agent` at `~/.docker/cli-plugins/docker-agent` if you want the subcommand, or call `docker-agent` itself if you do not.

That third door matters on servers that do not run Docker Desktop. Desktop is a product with a GUI and a licensing story. The plugin path is a file in a directory the CLI already scans. A Linux host that only has Engine can still grow the subcommand if you drop the binary in the plugin directory. The README does not say Engine 29, or any Engine version, is required. It says the CLI plugin interface is the install. If `docker agent` fails on a host whose Desktop is older than 4.63, the failure is the missing plugin, not a mysterious engine flag. The fix the README gives is the binary or Homebrew, not an Engine upgrade.

KDnuggets, published October 8 by Olumide Shittu, describes the same plugin as open source, Apache 2.0, built by Docker Engineering. The tagline it quotes is to run AI agents like containers. The Go module history it cites on pkg.go.dev shows tagged releases from March 2026. As of that October 8 piece, the project had passed 3,300 GitHub stars and nearly 10,000 commits. Stars are not a compatibility matrix. They are a reason the October 8 tutorial exists. They do not tell you whether your Desktop build is 4.63.

I am not treating August Desktop release notes as this week's news. Those notes mention Agent builds bundled months ago. The fact I will use for install is the README's 4.63 floor, plus the October 8 description of what the plugin is. If your inventory says Desktop 4.70 or 4.80, you are above the floor the README states. Confirm with `docker agent`, not with a blog's version table.

## The file you review is agent.yaml

The README's quick start is a YAML document, then one command:

```yaml
agents:
  root:
    model: openai/gpt-5-mini
    description: A helpful AI assistant
    instruction: |
      You are a knowledgeable assistant that helps users with various tasks.
      Be helpful, accurate, and concise in your responses.
    toolsets:
      - type: mcp
        ref: docker:duckduckgo
```

```bash
docker agent run agent.yaml
```

That example is the product. An agent is a named block under `agents`. It has a model string, a description, an instruction, and a list of toolsets. The toolset in the example is an MCP reference, `docker:duckduckgo`, not a shell script you wrote beside the file. `docker agent new` is the interactive generator if you do not want to start from that skeleton. `docker agent run agent.yaml` is the run. The contributing note in the README uses the same verb on a different file: `docker agent run ./golang_developer.yaml`. The unit of review is the YAML. The unit of execution is that subcommand.

KDnuggets adds that HCL is accepted if you prefer it to YAML. I have not reproduced an HCL sample here. If your repo standardises on HCL, the October 8 piece says the plugin will take it. The README extract I used shows YAML. Pick the one your review tooling can diff. Do not maintain both for the same agent unless you enjoy drift.

The model string is a provider choice, not a default you can ignore. The example uses `openai/gpt-5-mini`. The feature list says the plugin is provider-agnostic: OpenAI, Anthropic, Gemini, AWS Bedrock, Mistral, xAI, Docker Model Runner, and more. KDnuggets repeats that list and adds the local case explicitly: fully local models through Docker Model Runner, so a config is not locked to one vendor. "Not locked" means you can change the string. It does not mean the example runs with an empty environment.

The README's install section says to set at least one API key, or use Docker Model Runner for local models. It points at a "Set Up a Model" doc for both paths. I am not going to invent the variable names. They belong in that doc, and they will move. The operational fact is the fork. Cloud key, or local runner. No third option appears in the extract.

That fork is where this stops being a container story and starts being a secret story. The YAML in the example does not contain a key. Keep it that way. A model string is safe to commit. A key is not. If a teammate pastes a key under `instruction` because the agent "needs to know it," that is a review failure, not a feature. The plugin's own example does not do this. Neither should the file you merge.

## Tools, teams, and the registry line

The README's feature list is longer than the quick start, and it is worth splitting so you do not buy the whole list on day one.

Built-in tools include think, todo, and memory. KDnuggets calls these the advanced-reasoning set. They are in-process aids. They are not a policy engine. Turning them on does not give you an audit log of what the model was allowed to touch. If you need that log, it is not in the feature bullet I read.

MCP is the extension point. The README says any MCP server, local, remote, or Docker-based. KDnuggets stresses the container case: run the MCP server in its own container for isolation. Isolation here means the tool process is not the agent process. It does not mean the tool cannot reach the network if you gave it a network. A DuckDuckGo MCP ref, as in the example, is a network tool. Review the ref the way you would review a sidecar image. `docker:duckduckgo` is a name. Names can point at something you did not read.

Multi-agent is a team of specialised agents that delegate. The README says sub-agents can be referenced across the registry, mixing local files and shared agents in one config. KDnuggets uses the same idea: teams that hand work to each other. A delegated agent is another YAML, or another OCI object, with its own model string and its own tools. If the root agent can call it, the root agent's blast radius includes it. Review the leaves before you praise the tree.

Distribution is the line that sounds most like Docker and needs the most care. Finished agents can be pushed to any OCI-compatible registry and pulled back with:

```bash
docker agent run myorg/agent:tag
```

KDnuggets prints the same command. No local YAML is required on the far side, which is the point of the analogy and also the risk. `docker pull` of an image you did not read is a familiar mistake. `docker agent run` of a tag you did not read is the same mistake with a model and a tool list inside. Pin the tag. Read the YAML before the run, or accept that you did not. The README does not describe a signature check in the extract I have. Do not assume one.

RAG is on the feature list: pluggable retrieval with BM25, embeddings, hybrid search, and reranking. That is a capability statement. It is not a corpus. You still choose what gets indexed. An embeddings line in a feature grid does not mean your internal wiki is already in the agent. If a vendor demo jumps from "RAG" to "it knows our runbooks," ask which files were loaded. The October 8 tutorial calls itself hands-on, from a bare install to a working team. I am not copying those steps into this post. The steps live in that piece and in the README's `examples/` directory. What matters for a server review is the shape: a file, a model, a tool ref, a run command.

## What this is not

It is not Docker Engine. Nothing in the README or the October 8 piece announces an Engine version, a containerd bump, or a buildx change. If your patch window this week is about the engine, this plugin does not close it. [The kernel check on Docker hosts](/posts/ubuntu-cve-2026-80521-docker-hosts/) is still a kernel check. An agent YAML does not patch a kernel.

It is not Docker Desktop, even though Desktop 4.63+ is one way to get the binary. [WSL containers going GA](/posts/wsl-containers-ga-not-docker-desktop-2026/) was a Windows runtime story. Docker Agent is a CLI plugin that can ride along with Desktop and can also be dropped onto a Linux CLI. Do not merge those tickets. A host that gained WSL containers did not gain a reviewed `agent.yaml`. A host that can run `docker agent` did not change its container runtime.

It is not a replacement for the virtualization choice inside Desktop. [Docker VMM](/posts/docker-vmm-virtualization-engine-2026/) is about which hypervisor Desktop uses. Agent does not select that. If someone files this plugin under "Desktop infrastructure," send it back to the application repo. The thing you diff is YAML.

It is not free of a model bill. Local Model Runner removes the hosted key. It does not remove GPU, disk, and the question of which weights you loaded. A cloud key removes the local weights. It does not remove the invoice. The README makes you pick one. KDnuggets says the config is not locked to a vendor, which is true, and which still leaves the invoice with whoever holds the key.

Telemetry is the line people skip. The README says anonymous usage data is collected to improve the tool, and points at a Telemetry section. The extract does not include the opt-out flag. Before you run this on a production build host, open that section and decide. "Anonymous" is the project's adjective. It is not a data-processing agreement. If your policy forbids phone-home binaries, the plugin is in scope for that policy even though the agents themselves are YAML.

## A short review, not a platform migration

You can finish the useful check in one sitting.

On a Desktop host, run `docker version` and `docker agent`. If the second command is missing and Desktop is older than 4.63, you are below the README's floor. Upgrade Desktop or install the plugin binary. Do not upgrade Engine "because of Agent." The docs I used do not ask for that.

On a Linux engine host, do not install Desktop just to get the subcommand. Put the release binary in `~/.docker/cli-plugins/docker-agent`, or use Homebrew where that is your standard, and run `docker agent` again. The symlink target is the whole integration.

Read the YAML the way you read Compose. Model string, instruction, toolset refs, any sub-agent path or OCI tag. Reject keys in the file. Reject unpinned `docker agent run someorg/agent:latest` in a job until someone has read that tag. If the tool ref is MCP, name the server and where it runs: local process, remote URL, or a container. KDnuggets prefers the container for isolation. Isolation still needs a network policy. The plugin will not invent one for you.

Pick the model path before the demo. Either export the key the Set Up a Model doc names, or point at Model Runner. Then run the example, or do not. A successful `docker agent` help screen only proves the plugin is installed. It does not prove a model answered. Those are different tickets, and only the first one is closed by Desktop 4.63.

The October 8 piece is a tutorial with star counts and a March tag history. The README is the contract: a YAML file, a subcommand, a key or a local runner, an OCI tag if you share it. Write the review against the contract. The stars can stay in the weekly notes.
