---
title: "Network Diagnostics Guide: Essential Tools and Techniques"
description: "Master Linux network diagnostics with comprehensive coverage of ping, traceroute, netstat, ss, tcpdump, and Wireshark. Learn troubleshooting methodologies that quickly identify connectivity issues."
pubDate: 2026-02-08
coverImage: "./cover.jpg"
coverImageAlt: "Network diagnostics terminal showing packet analysis and connectivity testing"
category: "troubleshooting"
tags: ["network", "troubleshooting", "Linux", "diagnostics", "tcpdump"]
---

## Introduction

Network connectivity problems rank among the most frequent server administration challenges. Applications report mysterious timeouts, users experience intermittent slowdowns, and services fail to communicate without clear error messages. Systematic network diagnostics transform these ambiguous symptoms into actionable information.

This guide covers essential diagnostic tools and proven troubleshooting methodologies. We examine layer-by-layer analysis starting from physical connectivity through application-level network issues. Each tool serves specific purposes within the diagnostic workflow, and understanding when to apply each technique accelerates problem resolution.

Effective troubleshooting follows structured approaches that eliminate possibilities systematically. We build toward methodologies applicable to diverse network problems, from simple connectivity testing to complex performance analysis. These skills serve administrators managing local servers and distributed cloud infrastructure alike.

## Fundamental Connectivity Testing

Basic connectivity tests verify that network paths exist before investigating advanced problems. These fundamental checks establish baseline connectivity and narrow investigation scope.

### Using Ping Effectively

Ping sends ICMP echo requests to test reachability and measure round-trip latency. While simple, ping provides essential diagnostics when interpreted correctly:

```bash
# Basic connectivity test
ping -c 4 server.example.com

# Continuous ping for monitoring connectivity
ping -i 0.5 server.example.com

# Specify interface for multi-homed hosts
ping -I eth0 server.example.com

# Set packet size for MTU testing
ping -s 1472 server.example.com

# Flood ping for stress testing (requires root)
ping -f server.example.com
```

Interpret ping results carefully. ICMP may be blocked by firewalls without indicating application-level connectivity problems. Successful pings confirm network layer reachability but do not guarantee application ports respond.

Counted pings with timeout flags suit scripts and automated monitoring:

```bash
# Script-friendly ping with timeout
if ping -c 3 -W 2 server.example.com > /dev/null 2>&1; then
    echo "Server is reachable"
else
    echo "Server is unreachable"
fi
```

### Tracepath and Traceroute Analysis

Traceroute maps the network path between hosts, revealing each intermediate hop and its latency. This visibility identifies where problems occur along the path:

```bash
# Standard traceroute (UDP-based)
traceroute server.example.com

# ICMP traceroute (bypasses UDP blocks)
traceroute -I server.example.com

# TCP traceroute (useful when ICMP/UDP blocked)
traceroute -T -p 443 server.example.com

# Tracepath (no root required, UDP-based)
tracepath server.example.com
```

Traceroute output reveals routing paths and latency at each hop. Increasing latency at specific hops indicates congestion or routing problems. Hops showing timeouts may indicate firewall blocking or asymmetric routing.

Multi-path traceroutes from different network locations identify geographic routing problems:

```bash
# Traceroute from specific source IP
traceroute -s 10.0.1.50 server.example.com

# Record timestamp for analysis
traceroute -T server.example.com > trace-$(date +%Y%m%d).txt
```

### DNS Resolution Testing

DNS problems prevent connections even when network paths function correctly. Verify DNS resolution separately from connectivity:

```bash
# Query specific DNS server
dig @8.8.8.8 server.example.com

# Short answer output
dig +short server.example.com

# Query MX records
dig MX example.com

# Query TXT records (SPF, DKIM, etc.)
dig TXT example.com

# Reverse DNS lookup
dig -x 203.0.113.50
```

NXDOMAIN responses indicate DNS configuration problems rather than network issues. Slow DNS resolution suggests server overload or network latency. Test against multiple DNS servers to isolate DNS-specific problems.

## Port and Service Verification

Network layer connectivity does not guarantee application functionality. Port verification confirms that services listen on expected interfaces and ports.

### Netstat for Port Analysis

Netstat displays network connections, routing tables, and interface statistics. Though deprecated in favor of ss, netstat remains widely available:

```bash
# List all listening ports
netstat -tuln

# Show process IDs for connections
netstat -tulnp

# Display established connections
netstat -tan

# Show network interface statistics
netstat -i

# Display routing table
netstat -rn
```

Listen sockets without associated processes indicate services that failed to start properly. Established connections reveal active client sessions. Interface errors and collisions indicate physical layer problems.

### Modern Socket Statistics with ss

The ss command provides faster, more detailed socket information than netstat:

```bash
# List all listening TCP sockets
ss -tln

# Show listening sockets with process info
ss -tlpn

# Display all TCP connections
ss -tan

# Show socket memory usage
ss -s

# Filter connections by state
ss -t state established
ss -t state time-wait

# Show connections to specific port
ss -tan | grep :443
```

The ss output includes connection timestamps, window sizes, and retransmission statistics useful for performance analysis. Time-wait sockets accumulating indicate high connection churn that may exhaust available ports.

### Port Scanning with Nmap

Nmap provides comprehensive port discovery and service identification capabilities:

```bash
# Scan single port on target
nmap -p 443 server.example.com

# Scan common ports
nmap server.example.com

# Scan all ports (slow)
nmap -p- server.example.com

# Identify service versions
nmap -sV server.example.com

# Aggressive scan with OS detection
nmap -A server.example.com

# TCP connect scan (stealthier than default SYN)
nmap -sT server.example.com
```

Nmap results reveal listening services and their versions. Unexpected open ports warrant investigation as potential security risks. Service version information helps identify outdated software requiring updates.

## Packet Capture and Analysis

Packet captures reveal exactly what traffic flows between systems, enabling diagnosis of complex protocol issues that higher-level tools obscure.

### tcpdump Fundamentals

Tcpdump captures network packets for offline analysis. Its powerful expression language filters captured traffic to relevant streams:

```bash
# Capture packets on interface
tcpdump -i eth0

# Capture to file
tcpdump -i eth0 -w capture.pcap

# Filter by host
tcpdump host 203.0.113.50

# Filter by port
tcpdump port 443

# Filter by port and save
tcpdump port 443 -w ssl-traffic.pcap

# Display ASCII content
tcpdump -A port 80

# Filter SYN packets (connection attempts)
tcpdump -n 'tcp[13] & 2 != 0'
```

Capture files analyzed with Wireshark provide rich visualization and protocol decoding. Limit capture duration and use filters to manage file sizes. Large captures consume disk space and slow analysis.

### Advanced tcpdump Filters

Complex filtering isolates specific traffic patterns within high-volume captures:

```bash
# Capture HTTP GET requests
tcpdump -i eth0 -A port 80 | grep GET

# Capture DNS queries
tcpdump -i eth0 port 53

# Capture packets larger than 1500 bytes
tcpdump greater 1500

# Capture SSH traffic including connection setup
tcpdump -i eth0 port 22

# Capture traffic between two hosts
tcpdump host 10.0.1.10 and host 10.0.1.20

# Capture packets to or from subnet
tcpdump net 10.0.0.0/8
```

Expressions combine using logical operators. Parentheses group conditions; escape spaces when using in shells:

```bash
# Capture HTTP or HTTPS traffic
tcpdump -i eth0 'port 80 or port 443'

# Capture traffic excluding local network
tcpdump -i eth0 'not net 192.168.0.0/16'
```

### Wireshark Analysis

Wireshark provides graphical packet analysis with protocol decoders, statistics tools, and filtering capabilities:

```bash
# View capture statistics
wireshark -r capture.pcap -q -z io,stat,1

# Apply display filter
wireshark -r capture.pcap -Y "tcp.port == 443"

# Export specific packets
wireshark -r capture.pcap -Y "http.request" -w http-requests.pcap
```

Common display filters isolate relevant traffic:

```dns}
# DNS queries
dns

# HTTP errors
http.response.code >= 400

# TCP retransmissions
tcp.analysis.retransmission

# Slow responses
http.request and tcp.time_delta > 0.5
```

Wireshark expert information highlights potential problems:

```bash
# Generate expert information summary
tshark -r capture.pcap -q -z expert
```

Expert analysis reveals duplicate ACKs, window size problems, and connection issues invisible in summary statistics.

## Performance Measurement

Beyond connectivity, network performance affects application responsiveness. Bandwidth, latency, and jitter measurements guide capacity planning and problem diagnosis.

### Bandwidth Testing with iperf3

Iperf3 measures network bandwidth between test endpoints. Understanding actual throughput identifies performance bottlenecks:

```bash
# Start iperf3 server
iperf3 -s

# Run client test (default TCP)
iperf3 -c server.example.com

# UDP test for jitter and loss
iperf3 -c server.example.com -u

# Test with specific bandwidth limit
iperf3 -c server.example.com -b 1G

# Parallel streams test
iperf3 -c server.example.com -P 4

# Reverse direction test
iperf3 -c server.example.com -R
```

Iperf3 results reveal available bandwidth between endpoints. Compare actual throughput against theoretical limits to identify constraints. UDP tests measure jitter and packet loss invisible in TCP tests.

### Latency and Jitter Measurement

Latency affects interactive applications while jitter disrupts real-time communications like VoIP and video conferencing:

```bash
# Measure latency with mtr (My Traceroute)
mtr -r -c 10 server.example.com

# ICMP latency only
mtr --icmp -r -c 10 server.example.com

# Measure jitter with ping (limited)
ping -c 20 server.example.com | tail -1

# Detailed jitter measurement
# Using jitter measurement tools
iperf3 -c server.example.com -u -J json > jitter-test.json
```

Low latency with high jitter indicates variable network conditions affecting real-time applications. Consistent latency indicates predictable network paths suitable for latency-sensitive workloads.

### Connection Tracking and NAT Analysis

NAT devices complicate diagnosis by modifying address information. Understanding NAT behavior prevents misinterpretation of diagnostic results:

```bash
# View NAT connections (requires root)
conntrack -L -p tcp --dport 443

# Delete NAT entry (forces reconnection)
conntrack -D -p tcp --dport 443 --src 10.0.1.50

# List all NAT connections
conntrack -L | grep dport=80
```

Connection tracking reveals NAT mappings maintained by firewalls and load balancers. Unexpected connection counts indicate traffic patterns requiring investigation.

## Wireless Network Diagnostics

Wireless networks introduce additional variables affecting connectivity. Wireless-specific tools diagnose signal, interference, and association problems.

### Signal Quality Assessment

Wireless signal strength directly affects connection quality and throughput:

```bash
# View wireless interface statistics
iw dev wlan0 station dump

# Signal strength monitoring
watch -n 1 "cat /proc/net/dev | grep wlan0"

# Detailed wireless statistics
iw dev wlan0 link

# Channel and access point information
iw dev wlan0 scan | grep -E "(SSID|BSSID|signal|channel)"
```

Signal strength below -70 dBm indicates weak connections prone to drops and errors. Interference from neighboring networks on the same channel degrades performance. Channel selection tools identify optimal access point configuration.

### Wireless Troubleshooting Commands

Wireless troubleshooting requires understanding interface state and configuration:

```bash
# List wireless interfaces
iw dev

# View interface configuration
iw dev wlan0 info

# Regulatory domain information
iw reg get

# Set interface up/down
ip link set wlan0 down
ip link set wlan0 up

# Restart wireless service
systemctl restart NetworkManager
```

Intermittent wireless problems often stem from power management, driver issues, or environmental interference. Wired connections provide more reliable diagnostics when wireless problems complicate troubleshooting.

## Application Layer Testing

Network connectivity problems sometimes originate in application configuration rather than network infrastructure. Application-specific tests isolate these issues.

### HTTP/HTTPS Testing

Web service problems require protocol-level testing beyond simple connectivity:

```bash
# Basic HTTP request
curl -I https://server.example.com

# Verbose request showing headers
curl -v https://server.example.com

# Time measurements
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s https://server.example.com

# Check certificate chain
openssl s_client -connect server.example.com:443

# Verify certificate details
openssl s_client -connect server.example.com:443 | \
  openssl x509 -noout -dates -subject

# Test specific TLS versions
openssl s_client -tls1_2 -connect server.example.com:443
openssl s_client -tls1_3 -connect server.example.com:443
```

Certificate chain verification identifies certificate problems causing HTTPS failures. TLS version testing reveals compatibility issues with older clients. Response timing identifies slow servers.

### Database Connection Testing

Database connectivity problems manifest as connection timeouts or authentication failures:

```bash
# PostgreSQL connection test
psql -h db.example.com -U username -d database -c "SELECT 1;"

# MySQL connection test
mysql -h db.example.com -u username -p -e "SELECT 1;"

# MongoDB connection test
mongosh --host db.example.com --eval "db.adminCommand('ping')"

# Redis connection test
redis-cli -h db.example.com PING

# Test database port accessibility
nc -zv db.example.com 5432
```

Database-specific tools verify authentication and basic operations. Port tests confirm network accessibility. Connection strings and authentication configuration errors appear in verbose output.

## Systematic Troubleshooting Methodology

Effective troubleshooting follows structured approaches that eliminate possibilities efficiently. This section provides frameworks applicable to diverse network problems.

### The OSI Layer Approach

Systematic troubleshooting examines each network layer independently:

**Layer 1 (Physical):** Verify cables, link lights, interface status, and power. Physical layer problems prevent all higher-layer communication.

**Layer 2 (Data Link):** Check MAC addresses, switch port status, ARP tables, and VLAN configuration. MAC address conflicts and spanning tree issues manifest at this layer.

**Layer 3 (Network):** Verify IP addresses, routing tables, subnet masks, and gateway configuration. Ping tests and traceroute reveal layer three connectivity.

**Layer 4 (Transport):** Confirm port accessibility, firewall rules, and connection limits. Port scanning and netstat verify transport layer status.

**Layer 5-7 (Session-Presentation-Application):** Test application protocols, authentication, and service availability. Application-specific tools diagnose layer seven issues.

### Documenting Diagnostic Results

Maintain records of diagnostic procedures and results:

```bash
# Capture diagnostic output with timestamps
{
  echo "=== $(date) ==="
  ip addr
  ip route
  netstat -rn
  ping -c 3 default gw
} > diagnostics-$(hostname)-$(date +%Y%m%d-%H%M%S).txt
```

Detailed documentation supports incident escalation and post-mortem analysis. Capture relevant configuration and state information during problems rather than afterward.

## Conclusion

Network diagnostics require diverse tools matched to specific troubleshooting scenarios. Basic connectivity tests establish reachability while port verification confirms service availability. Packet capture reveals protocol-level details invisible to higher-level tools. Performance measurement identifies bottlenecks affecting application responsiveness.

Practice with diagnostic tools in controlled environments before facing production problems. Understanding tool limitations prevents misinterpreting results. Combine multiple tools for comprehensive visibility into network behavior.

Integrate diagnostics into monitoring and alerting systems. Automated diagnostics accelerate problem identification while systematic approaches ensure thorough investigation. Effective troubleshooting reduces downtime and improves service reliability.

---

**Related Posts:**
- [Linux Troubleshooting](/posts/linux-troubleshooting)
- [Systemd Service Management](/posts/systemd-service-management)
- [Ubuntu 22.04 Server Setup](/posts/ubuntu-22-04-server-setup)
