# Claude Code 中文开发套件使用示例

此目录包含各种项目类型的使用示例，展示如何在不同技术栈中应用Claude Code中文开发套件。

## 📁 示例项目

### [Python 项目](python-project/)
展示在Python项目中使用Claude Code的最佳实践：
- FastAPI Web应用结构
- 数据科学项目配置
- 机器学习工作流

### [Node.js 项目](nodejs-project/)  
Node.js项目的完整配置示例：
- Express.js API服务
- React全栈应用
- 微服务架构

### [Web 应用](web-app/)
现代Web应用开发配置：
- 前后端分离架构
- 移动端适配
- 部署和运维配置

## 🚀 快速开始

每个示例项目都包含：
- `CLAUDE.md` - 项目特定的AI上下文配置
- `docs/` - 完整的文档结构
- `.claude/` - 项目级别的配置和命令
- `README.md` - 项目说明和使用指南

### 使用方法

1. **复制示例项目**：
   ```bash
   cp -r examples/python-project my-new-project
   cd my-new-project
   ```

2. **自定义配置**：
   - 编辑 `CLAUDE.md` 设置项目特定的AI指令
   - 更新 `docs/ai-context/project-structure.md` 描述你的技术栈
   - 调整 `.claude/settings.json` 配置

3. **开始开发**：
   ```bash
   claude
   # 现在可以使用完整的中文化Claude Code功能
   ```

## 💡 最佳实践

### 文档管理
- **保持文档与代码同步** - 代码变更时及时更新相关文档
- **使用三层文档架构** - 基础/组件/功能层次清晰分离
- **编写清晰的上下文** - 帮助AI更好地理解项目结构

### AI交互优化
- **明确的任务描述** - 清楚描述要实现的功能
- **提供充足上下文** - 包含相关的业务逻辑和技术约束
- **分步骤执行** - 复杂任务拆分为可管理的小步骤

### 团队协作
- **统一开发标准** - 团队成员使用相同的CLAUDE.md配置
- **文档版本控制** - 文档变更通过Git进行版本管理
- **知识共享** - 通过handoff.md进行任务交接

## 🛠 自定义指南

### 添加新命令
在 `.claude/commands/` 目录下创建新的Markdown文件：
```bash
# 创建自定义命令
touch .claude/commands/deploy.md
```

### 配置Hook脚本
修改 `.claude/hooks/` 中的脚本以适应项目需求：
- 安全扫描规则
- 通知配置
- 上下文注入策略

### 集成外部工具
通过 `.claude/settings.json` 配置MCP服务器：
- Context7 文档查询
- Gemini 深度咨询
- 自定义AI服务

---

*这些示例帮助你快速上手Claude Code中文开发套件，打造高效的AI辅助开发工作流。*