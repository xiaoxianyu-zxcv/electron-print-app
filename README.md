# Electron打印应用 🖨️

![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)

一个基于Electron的现代化桌面打印服务应用，集成Vue.js前端界面和Spring Boot后端服务，为企业级打印管理提供完整解决方案。

## ✨ 功能特色

- 🖨️ **智能打印管理** - 支持多种文档格式，PDF处理能力强
- 📊 **实时状态监控** - WebSocket实时推送，任务状态一目了然  
- 🔄 **自动更新机制** - 内置自动更新，远程维护便捷
- 🏠 **桌面原生体验** - 系统托盘运行，开机自启动
- 🎨 **现代化界面** - Element Plus组件库，美观易用
- ⚡ **高性能架构** - 前后端分离，进程隔离稳定运行

## 🚀 快速开始

### 环境要求
- Node.js 16+
- Java 8+
- Windows 7/10/11

### 安装依赖
```bash
# 克隆项目
git clone <repository-url>
cd electron-print-app

# 安装主项目依赖
npm install

# 安装前端依赖
cd frontend/print-client && npm install
```

### 开发模式运行
```bash
# 启动完整开发环境（推荐）
npm run dev

# 或者分步启动
npm run build:backend    # 构建后端服务
npm run start:frontend   # 启动前端开发服务器
npm run start:electron   # 启动Electron开发模式
```

### 生产环境打包
```bash
# 构建并打包所有平台版本
npm run release-all

# 仅打包Windows版本
npm run package:win
```

## 🏗️ 技术架构

### 核心技术栈
- **前端**: Vue 3.5 + Element Plus + Vite
- **后端**: Spring Boot 2.6 + WebSocket + PDFBox
- **桌面**: Electron 19 + 自动更新
- **打包**: Electron Builder + NSIS

### 架构设计
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron      │    │   Vue.js        │    │  Spring Boot    │
│   主进程        │◄──►│   前端界面      │◄──►│   后端服务      │
│   (桌面容器)    │    │   (用户交互)    │    │   (业务逻辑)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 主要功能

### 打印服务
- ✅ 多格式文档打印支持（PDF、Office等）
- ✅ 打印任务队列管理
- ✅ 打印机状态实时监控
- ✅ 打印历史记录查询

### 桌面应用
- ✅ 系统托盘运行
- ✅ 开机自启动选项
- ✅ 自动更新机制
- ✅ 跨平台支持（Windows 32/64位）

### 用户界面
- ✅ 现代化响应式设计
- ✅ 数据可视化图表
- ✅ 实时状态推送
- ✅ 友好的用户交互

## 🔧 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动完整开发环境 |
| `npm run build` | 构建所有组件 |
| `npm run build:backend` | 仅构建后端服务 |
| `npm run build:frontend` | 仅构建前端应用 |
| `npm run start:frontend` | 启动前端开发服务器 |
| `npm run start:electron` | 启动Electron开发模式 |
| `npm run package:win` | 打包Windows应用 |
| `npm run package:win-all` | 打包所有Windows架构 |
| `npm run release-all` | 完整发布流程 |

## 📚 详细文档

### 📖 核心技术文档
- **[项目分析文档](./项目分析文档.md)** - 完整的技术架构分析和开发指南
- **[前端技术文档](./docs/前端技术文档.md)** - Vue.js前端详细技术实现
- **[后端技术文档](./docs/后端技术文档.md)** - Spring Boot后端详细技术实现

### 📑 文档导航
- **[文档索引](./docs/文档索引.md)** - 完整的文档体系导航，按角色提供阅读建议

## 🎯 适用场景

- **企业办公环境** - 统一打印服务管理，多部门资源共享
- **打印服务中心** - 专业打印服务提供，客户任务管理
- **教育机构** - 学校打印资源管理，批量作业打印

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.0.3 (当前版本)
- ✅ 完善自动更新机制
- ✅ 优化UI界面设计
- ✅ 增强打印任务管理
- ✅ 修复已知问题

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 📞 技术支持

如遇到技术问题或需要支持，请：
- 📧 发送邮件至技术支持团队
- 🐛 在GitHub Issues中报告问题
- 📖 查阅[详细技术文档](./项目分析文档.md)
- 🔍 浏览[文档索引](./docs/文档索引.md)了解完整文档体系

---

**开发团队** | 专业的企业级打印解决方案

# Electron打印应用 - 完整项目文档

> 🖨️ **企业级桌面打印服务** | Electron + Vue.js + Spring Boot

这是一个基于Electron的企业级桌面打印应用，提供本地打印服务、远程任务接收、实时状态监控等功能，支持热插拔打印机、任务队列管理和WebSocket双向通信。

---

## 📖 项目文档导航

### 🏠 主要文档
- **[📄 项目分析文档](./项目分析文档.md)** - 项目架构、技术选型与开发指南
- **[🎨 前端技术文档](./docs/前端技术文档.md)** - Vue.js前端详细技术文档  
- **[⚙️ 后端技术文档](./docs/后端技术文档.md)** - Spring Boot后端详细技术文档
- **[📚 文档索引](./docs/文档索引.md)** - 完整文档导航系统

### 🚀 快速开始
1. **环境准备**: JDK 8 + Node.js 16+ + Maven 3.8+
2. **后端启动**: `cd backend && mvn spring-boot:run`
3. **前端启动**: `cd frontend && npm run electron:serve`
4. **访问应用**: 自动启动桌面应用

### 💡 技术特色
- ✅ **三层架构** - Electron桌面 + Vue3前端 + Spring Boot后端
- ✅ **实时通信** - WebSocket + STOMP协议双向数据推送
- ✅ **智能队列** - 异步任务处理，支持重试和故障恢复
- ✅ **热插拔支持** - 动态识别打印机设备变化
- ✅ **跨平台兼容** - Windows主要支持，可扩展Linux/macOS

---

## 🏗️ 项目技术架构
