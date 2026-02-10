---
title: "Docker Compose: Deploy Multi-Container Applications"
description: "Learn how to use Docker Compose to define and run multi-container Docker applications with practical examples, production-ready configurations, and best practices for modern deployment."
pubDate: 2026-02-08
coverImage: "./cover.webp"
coverImageAlt: "Docker Compose multi-container deployment illustration showing containers, networking, and volumes"
category: "docker"
tags: ["Docker", "Docker Compose", "containers", "DevOps", "tutorial"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25-30 分钟"
prerequisites: ["Docker 已安装", "基本命令行知识", "理解 Docker 镜像和容器概念"]
osCompatibility: ["Ubuntu 22.04", "Ubuntu 20.04", "Debian 11+", "CentOS 8+", "macOS", "Windows"]
---

## Introduction

在现代应用开发中，单独部署单个服务的情况越来越少。相反，我们将应用拆分为多个松散耦合的服务，每个服务负责特定的业务功能。例如，一个典型的 Web 应用可能包含前端应用、后端 API、数据库、缓存层和消息队列。这些服务需要协同工作，同时保持独立性和可扩展性。

Docker Compose 是 Docker 官方提供的工具，用于定义和运行多容器 Docker 应用。通过一个 YAML 配置文件，你可以定义应用的所有服务、网络和卷，然后使用单个命令启动整个应用堆栈。这极大地简化了开发、测试和生产环境中的容器编排工作。

本教程将带你从零开始学习 Docker Compose，包括基础概念、实际配置示例、最佳实践以及常见问题的解决方案。完成本教程后，你将能够自信地使用 Docker Compose 管理复杂的多容器应用。

## Why Use Docker Compose?

### 简化多容器管理

在没有 Docker Compose 的情况下，启动多个容器需要分别运行每个容器，并手动管理它们之间的依赖关系和网络配置。这不仅繁琐，而且容易出错。Docker Compose 允许你在一个配置文件中声明所有服务及其关系，然后通过简单的命令统一管理整个应用堆栈。

### 环境一致性

通过 docker-compose.yml 文件，团队成员可以确保使用完全相同的服务配置。开发环境、测试环境和生产环境可以使用同一份配置文件，避免因环境差异导致的各种问题。这对于持续集成和持续部署（CI/CD）流程尤为重要。

### 快速启动和销毁

Docker Compose 提供了便捷的命令来启动、停止和重建服务。你可以在几秒钟内启动整个应用堆栈，或者完全清理所有资源。这对于开发迭代和测试场景非常有价值。

### 易于协作

Docker Compose 配置文件是文本文件，可以轻松纳入版本控制系统（如 Git）。团队成员可以共享配置、审查变更、跟踪历史记录，促进协作和代码复用。

## Prerequisites

在开始本教程之前，请确保你的系统满足以下要求：

- **Docker Engine**：确保 Docker 已正确安装并运行。你可以运行 `docker --version` 和 `docker-compose --version` 来验证安装。
- **基础命令行知识**：熟悉终端或命令提示符的基本操作。
- **文本编辑器**：用于创建和编辑配置文件，如 VS Code、vim 或 nano。
- **理解 Docker 基础**：了解 Docker 镜像、容器和基本命令。

## Step 1: Installing Docker Compose

Docker Compose 通常随 Docker Desktop 一起安装。如果你使用的是 Linux 系统或单独的 Docker 安装，可能需要单独安装 Docker Compose。

### Verify Installation

运行以下命令检查 Docker Compose 是否已安装：

```bash
# 检查 Docker Compose 版本
docker-compose --version

# 或者使用 v2 命令
docker compose version
```

如果看到版本信息（如 `Docker Compose version v2.24.0`），说明已安装。如果未安装，请继续阅读安装说明。

### Linux Installation

对于 Ubuntu 或 Debian 系统：

```bash
# 下载 Docker Compose 二进制文件
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

对于 CentOS 或 RHEL 系统：

```bash
# 安装依赖包
sudo yum install -y curl

# 下载并安装
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
```

### macOS and Windows

在 macOS 和 Windows 上，Docker Compose 已包含在 Docker Desktop 中。确保 Docker Desktop 是最新版本即可。

## Step 2: Creating Your First docker-compose.yml

让我们创建一个简单的多容器应用示例。我们将部署一个包含 Web 服务器（nginx）和一个简单的 API 服务（Node.js）的应用。

### Basic Structure

创建一个新目录并进入：

```bash
mkdir my-docker-app && cd my-docker-app
```

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html
    networks:
      - app-network

  api:
    image: node:20-alpine
    working_dir: /app
    command: node -e "require('http').createServer((req, res) => { res.end('API Response'); }).listen(3000)"
    networks:
      - app-network
    expose:
      - "3000"

networks:
  app-network:
    driver: bridge
```

这个配置文件定义了两个服务：`web` 和 `api`。让我们逐行解析：

- `version: '3.8'` 指定 Docker Compose 文件格式版本。
- `services` 部分定义所有容器服务。
- `web` 服务使用 nginx:alpine 镜像，将宿主机的 8080 端口映射到容器的 80 端口。
- `api` 服务使用 Node.js 镜像，创建一个简单的 HTTP 服务器。
- `networks` 创建自定义网络，使容器能够相互通信。

### Launch the Application

使用以下命令启动应用：

```bash
# 启动所有服务（在后台运行）
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

访问 http://localhost:8080 应该能看到 nginx 默认页面。同时，api 服务在内部网络中的 3000 端口运行。

## Step 3: Managing Services

掌握服务的生命周期管理是使用 Docker Compose 的关键技能。

### Starting and Stopping

```bash
# 启动服务（后台模式）
docker-compose up -d

# 启动服务并重新构建镜像
docker-compose up -d --build

# 停止所有服务
docker-compose down

# 停止并删除卷（数据将被删除）
docker-compose down -v
```

### Viewing Status and Logs

```bash
# 查看运行中的服务状态
docker-compose ps

# 查看所有服务的日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs web

# 查看最近 100 行日志
docker-compose logs --tail 100
```

### Restarting and Recreating

```bash
# 重启单个服务
docker-compose restart api

# 重建并重启所有服务
docker-compose up -d --force-recreate

# 删除并重新创建所有服务
docker-compose down && docker-compose up -d
```

## Step 4: Environment Variables and Configuration

环境变量是配置应用程序的灵活方式，Docker Compose 支持多种方式设置环境变量。

### Using Environment Files

创建 `.env` 文件来存储敏感配置：

```bash
# .env 文件
DATABASE_PASSWORD=my_secret_password
API_KEY=your_api_key_here
NODE_ENV=production
```

在 `docker-compose.yml` 中引用这些变量：

```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_USER: app_user
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    image: myapp/backend:latest
    environment:
      - DATABASE_URL=postgresql://app_user:${DATABASE_PASSWORD}@database:5432/myapp
      - NODE_ENV=${NODE_ENV}
    depends_on:
      - database

volumes:
  postgres_data:
```

### Environment-Specific Configurations

使用多个 Compose 文件来管理不同环境的配置：

```bash
# docker-compose.yml（基础配置）
version: '3.8'

services:
  app:
    image: myapp:latest
    ports:
      - "8080:8080"
```

```bash
# docker-compose.override.yml（开发环境覆盖）
version: '3.8'

services:
  app:
    build: .
    volumes:
      - ./src:/app/src
    environment:
      - DEBUG=true
```

```bash
# docker-compose.prod.yml（生产环境）
version: '3.8'

services:
  app:
    image: myapp:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

启动不同环境：

```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Step 5: Multi-Container Setup with Database

让我们创建一个更完整的示例，包含 Web 应用、API 服务和 PostgreSQL 数据库。

### Complete Example

创建以下目录结构：

```
myapp/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   └── index.js
└── frontend/
    └── Dockerfile
```

`docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: postgres_db
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: securepassword
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: backend_api
    environment:
      DATABASE_URL: postgresql://appuser:${POSTGRES_PASSWORD}@postgres:5432/myapp
      NODE_ENV: development
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network
    expose:
      - "3000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: frontend_app
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
```

`backend/index.js`：

```javascript
const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Welcome to the API',
      databaseTime: result.rows[0].now
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Health Checks

健康检查确保服务在完全就绪后才接收流量：

```yaml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## Step 6: Networking Between Services

Docker Compose 自动为所有服务创建一个默认网络，允许它们通过服务名称相互通信。

### Custom Networks

```yaml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    networks:
      - frontend-network
      - backend-network

  backend:
    image: node:20-alpine
    networks:
      - backend-network

networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge
```

### External Networks

使用已存在的外部网络：

```yaml
networks:
  default:
    external:
      name: my-existing-network
```

## Step 7: Data Persistence with Volumes

数据卷（Volumes）用于持久化容器生成的数据，即使容器被删除，数据仍然保留。

### Named Volumes

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### Bind Mounts

绑定挂载允许你将宿主机的目录直接挂载到容器中：

```yaml
services:
  node:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./src:/app:ro  # 只读挂载
      - ./config:/app/config
    command: npm run dev
```

### tmpfs Mounts

tmpfs 挂载将数据存储在内存中，容器重启后数据消失：

```yaml
services:
  cache:
    image: redis:7-alpine
    tmpfs:
      - /data:size=100M
```

## Best Practices

### 1. Use Specific Image Tags

避免使用 `latest` 标签，这会导致不可预测的行为。始终指定具体版本：

```yaml
# 不推荐
image: nginx

# 推荐
image: nginx:1.25-alpine
```

### 2. Implement Health Checks

为所有长时间运行的服务添加健康检查：

```yaml
services:
  api:
    image: myapi:latest
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Use .dockerignore

创建 `.dockerignore` 文件排除不必要的文件：

```
node_modules
npm-debug.log
.git
.env
*.md
```

### 4. Limit Container Resources

为生产环境设置资源限制：

```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 5. Separate Development and Production

使用多阶段构建和不同的 Compose 文件：

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### 6. Never Store Secrets in Images

使用 Docker Secrets 或环境变量管理敏感信息：

```yaml
services:
  app:
    image: myapp:latest
    secrets:
      - db_password
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Troubleshooting Common Issues

### Issue 1: Ports Already in Use

如果启动服务时端口被占用，你会看到类似 "port is already allocated" 的错误。

**解决方案：**

```bash
# 查看占用端口的进程
lsof -i :8080

# 或使用 docker-compose 修改端口映射
# 编辑 docker-compose.yml 中的 ports 部分
```

修改 `docker-compose.yml`：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8081:80"  # 改为其他端口
```

### Issue 2: Container Exits Immediately

容器启动后立即退出，通常是因为主进程结束。

**解决方案：**

```bash
# 查看容器日志了解退出原因
docker-compose logs service_name

# 检查命令是否正确
# 确保使用持久化命令
command: tail -f /dev/null  # 开发调试用
```

### Issue 3: Database Connection Refused

应用无法连接到数据库，通常是因为依赖关系或网络问题。

**解决方案：**

```bash
# 检查服务是否健康
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 验证网络连接
docker-compose exec backend ping postgres

# 确保使用正确的连接字符串
# 使用服务名而非 localhost
DATABASE_URL=postgresql://<db_user>:<db_password>@postgres:5432/db
```

### Issue 4: Volume Permission Denied

挂载卷时遇到权限问题。

**解决方案：**

```bash
# 修改目录权限
sudo chown -R $USER:$USER ./data

# 或在容器内使用 root 用户
user: root

# 然后在容器内修改权限
docker-compose exec app chown -R appuser /data
```

### Issue 5: Images Not Updating

修改代码后容器没有反映最新更改。

**解决方案：**

```bash
# 强制重新构建并启动
docker-compose up -d --build

# 或清除 Docker 构建缓存
docker-compose build --no-cache

# 完全清理并重新创建
docker-compose down && docker-compose up -d --build
```

## Conclusion

Docker Compose 是管理多容器 Docker 应用的强大工具，它通过声明式配置简化了容器编排过程。在本教程中，我们涵盖了 Docker Compose 的核心概念、安装方法、配置文件编写、服务管理、环境变量配置、网络设置和数据持久化等关键主题。

通过实践这些示例和最佳实践，你应该能够自信地使用 Docker Compose 部署和管理复杂的应用堆栈。记住以下几点：

- 始终使用具体的镜像标签而非 `latest`
- 为关键服务添加健康检查
- 合理规划网络和卷结构
- 使用环境变量管理配置
- 区分开发环境和生产环境的配置

**Related Tutorials:**

- [Dockerfile Best Practices: Build Efficient Images](/posts/dockerfile-best-practices)
- [Docker Networking: Complete Guide to Container Communication](/posts/docker-networking)
- [Docker Volumes: Persistent Data Management](/posts/docker-volumes)
- [Nginx Reverse Proxy: Setup and Configuration](/posts/nginx-reverse-proxy)
