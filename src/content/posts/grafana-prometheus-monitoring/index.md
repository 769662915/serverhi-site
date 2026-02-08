---
title: "Monitoring Linux Servers with Grafana and Prometheus"
description: "Set up comprehensive server monitoring using Grafana and Prometheus. This guide covers metric collection, dashboard creation, alert configuration, and production best practices."
pubDate: 2026-02-08
coverImage: "./cover.jpg"
coverImageAlt: "Grafana dashboard showing server metrics with graphs and charts"
category: "devops"
tags: ["Grafana", "Prometheus", "monitoring", "Linux", "metrics", "visualization"]
---

## Introduction

Effective monitoring transforms operations from reactive firefighting into proactive management. When you understand your infrastructure's behavior patterns, you identify problems before users notice them, optimize resource allocation based on actual usage, and make informed capacity planning decisions. Grafana and Prometheus together form an open-source monitoring stack used by organizations worldwide, from small startups to massive enterprises running millions of containers.

Prometheus excels at collecting and storing time-series metrics, providing a powerful query language for analyzing system behavior over time. Grafana transforms those metrics into intuitive visualizations, enabling teams to understand complex data through well-designed dashboards. Both tools integrate seamlessly with Kubernetes, Docker, and traditional Linux servers, making them versatile choices for diverse infrastructure.

This comprehensive guide walks you through deploying a complete monitoring stack. You will install and configure Prometheus for metric collection, set up Grafana for visualization, create informative dashboards, and configure alerting that notifies you when problems arise. By the end, you will have a production-ready monitoring infrastructure that provides visibility into your servers' health and performance.

## Understanding the Monitoring Stack

Before diving into installation, understanding how Prometheus and Grafana work together clarifies the setup process and helps with future troubleshooting.

Prometheus operates on a pull-based model, periodically fetching metrics from configured targets. Each target exposes metrics in a plaintext format that Prometheus scrapes at regular intervals. These metrics include system information like CPU usage, memory consumption, disk I/O, and network activity, as well as application-specific measurements. Prometheus stores all data locally with efficient compression, enabling retention of historical metrics for trend analysis and capacity planning.

Grafana connects to various data sources, with Prometheus being one of the most popular. It provides drag-and-drop dashboard creation, allowing you to visualize metrics without writing code. Grafana's alerting engine evaluates conditions against your metrics and sends notifications through multiple channels including email, Slack, PagerDuty, and webhooks.

The node_exporter, running on each monitored server, exposes system-level metrics in a format Prometheus understands. Installing node_exporter on all servers you wish to monitor completes the collection infrastructure. Grafana then visualizes the data collected by Prometheus from all your node_exporter instances.

## Prerequisites

Before beginning the installation, ensure your environment meets these requirements and you have necessary access.

You need at least one Linux server to serve as the monitoring host. For production deployments, allocate adequate resources: Prometheus requires approximately 2GB of RAM for moderate metric retention, while Grafana needs 1GB. Disk space depends on your retention period and number of monitored targets—plan for at least 50GB for initial deployments.

Each server you want to monitor requires the ability to run node_exporter, either as a systemd service or Docker container. Firewall rules must allow connections between monitoring components on port 9090 (Prometheus) and 3000 (Grafana).

You need sudo access on all servers to install packages and configure services. Root-level commands in this guide assume you have appropriate privileges or can request them from your system administrator.

## Installing Prometheus

Prometheus serves as the central metrics database and query engine. This section covers installation on Ubuntu/Debian systems, with notes for other distributions.

### Binary Installation

The recommended approach for production deployments uses official binary releases, which provide stable, predictable behavior:

```bash
# Create dedicated user
sudo useradd --no-create-home --shell /bin/false prometheus

# Create directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus

# Download Prometheus
PROMETHEUS_VERSION="2.47.0"
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz

# Extract and install
tar xvf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
sudo cp prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool

# Copy configuration files
sudo cp -r prometheus-${PROMETHEUS_VERSION}.linux-amd64/consoles /etc/prometheus/
sudo cp -r prometheus-${PROMETHEUS_VERSION}.linux-amd64/console_libraries /etc/prometheus/
sudo chown -R prometheus:prometheus /etc/prometheus/consoles /etc/prometheus/console_libraries
```

### Configuring Prometheus

Create the main configuration file with appropriate settings for your environment:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'prod-us-east-1'
    env: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: /metrics

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):\\d+'
        replacement: '${1}'

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
```

Create systemd service configuration for automatic startup:

```ini
# /etc/systemd/system/prometheus.service
[Unit]
Description=Prometheus Time Series Database
After=network-online.target
Wants=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=15d \
  --web.enable-lifecycle \
  --web.listen-address=0.0.0.0:9090

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
sudo systemctl status prometheus

# Verify Prometheus is running
curl http://localhost:9090/-/healthy
```

## Installing Node Exporter

Node_exporter collects system metrics from Linux servers. Install it on every server you want to monitor.

### Installation Process

```bash
# Create dedicated user
sudo useradd --no-create-home --shell /bin/false node_exporter

# Download and install
NODE_EXPORTER_VERSION="1.7.0"
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xvf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
sudo cp node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
```

### Service Configuration

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network-online.target
Wants=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --collector.disable-defaults \
  --collector.cpu \
  --collector.meminfo \
  --collector.diskstats \
  --collector.filesystem \
  --collector.loadavg \
  --collector.netdev \
  --collector.stat \
  --collector.time \
  --collector.uname \
  --web.listen-address=0.0.0.0:9100

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# Verify metrics endpoint
curl http://localhost:9100/metrics | head -50
```

## Installing Grafana

Grafana provides the visualization layer, connecting to Prometheus and other data sources to create informative dashboards.

### Package Installation

```bash
# Install required dependencies
sudo apt-get install -y apt-transport-https software-properties-common

# Add Grafana repository
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update
sudo apt-get install -y grafana

# Start and enable service
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

### Docker Installation

For containerized deployments:

```bash
# Run Grafana in Docker
docker run -d \
  --name=grafana \
  -p 3000:3000 \
  -v grafana-data:/var/lib/grafana \
  grafana/grafana:latest
```

## Connecting Grafana to Prometheus

With both services running, configure Grafana to use Prometheus as a data source. Access Grafana at `http://your-server-ip:3000`, navigate to Configuration → Data Sources → Add data source, select Prometheus, and enter your Prometheus URL (`http://localhost:9090`). Click "Save & Test" to verify the connection.

## Creating Dashboards

Navigate to Dashboards → New Dashboard → Add new panel. Query examples:

```promql
# CPU usage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk space
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

## Configuring Alerts

Edit any panel and navigate to the Alert tab. Configure alert conditions like "avg() of query is above 80 for 5m". Configure notification channels under Alerting → Contact points.

## Production Best Practices

For high availability, run redundant Prometheus instances. Monitor your monitoring infrastructure and set appropriate retention periods. Secure access via firewalls and consider HTTPS via reverse proxy. Regularly backup dashboards and Prometheus data.

## Conclusion

Grafana and Prometheus together provide a powerful monitoring solution. Start with basic installation and dashboards, then expand to alerting and high availability as your infrastructure grows.

---

**Related Guides:**
- [Prometheus Monitoring Setup](/posts/prometheus-monitoring)
- [Log Analysis Techniques](/posts/log-analysis-techniques)
- [Systemd Service Management](/posts/systemd-service-management)