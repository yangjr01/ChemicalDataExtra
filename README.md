# 材料工艺-流程-性能文献提取工具

> 基于 [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) 二次开发的材料科学文献数据提取与管理系统。

## 📖 项目简介

在材料科学研究中，从海量文献中提取"工艺流程-性能"关系数据是一项耗时且繁琐的工作。本项目利用大语言模型（LLM）技术，旨在辅助研究人员从PDF文献中自动或半自动地提取关键信息，并将其转化为结构化数据，建立统一的材料数据库。

本项目在 AnythingLLM 的基础上进行了深度定制，保留了其强大的文档处理和向量检索能力，并针对材料科学领域增加了专用的数据模型、提取流程和可视化界面。

## ✨ 核心功能

### 1. 文献管理 (Literature Management)
- **批量导入**：支持批量上传 PDF 文献，自动解析文本内容。
- **智能检索**：支持按标题、作者、关键词等字段快速检索文献。
- **原文对照**：内置 PDF 阅读器，支持在查看提取数据的同时对照原文。

### 2. 工艺流程提取 (Process Extraction)
- **AI 辅助提取**：利用 LLM 自动识别文献中的实验过程，提取原料、步骤、参数（温度、时间等）。
- **人机协同**：提供人工监督模式，用户可以修正 AI 的提取结果，确保数据准确性。
- **结构化存储**：将非结构化的文本描述转化为标准化的工艺流程图数据。

### 3. 材料数据整合 (Data Integration)
- **多维度信息**：提取并关联材料的基本信息（名称、组分）、工艺参数和性能表征数据。
- **SQLite 数据库**：采用关系型数据库存储结构化数据，便于后续的统计分析和机器学习应用。
- **分类管理**：支持按材料类别（如合金、陶瓷、高分子等）进行分类管理。

## 🚀 快速开始

### 环境要求
- **Node.js**: v16+
- **Yarn**: v1.22+
- **Python**: 3.8+ (用于部分 PDF 处理脚本)

### 安装步骤

本项目包含三个主要部分：Server（后端）、Frontend（前端）和 Collector（文档收集器）。请分别安装依赖：

1. **后端 (Server)**
   ```bash
   cd server
   yarn install
   cp .env.example .env  # 配置你的 LLM API Key 和数据库路径
   npx prisma migrate dev # 初始化数据库结构
   ```

2. **前端 (Frontend)**
   ```bash
   cd frontend
   yarn install
   cp .env.example .env
   ```

3. **收集器 (Collector)**
   ```bash
   cd collector
   yarn install
   cp .env.example .env
   ```

### 启动项目

请打开三个终端窗口，分别启动服务：

**终端 1 (Server):**
```bash
cd server
yarn dev
```

**终端 2 (Frontend):**
```bash
cd frontend
yarn dev
```

**终端 3 (Collector):**
```bash
cd collector
yarn dev
```

启动成功后，访问浏览器 **http://localhost:3000** 即可使用。
化学数据提取功能的入口位于侧边栏或直接访问 `/chemical/literature`。

## 📂 项目结构说明

本项目在 AnythingLLM 原有结构上增加了以下关键目录：

- `server/endpoints/chemical/`: 化学数据提取相关的 API 接口。
- `server/models/chemical/`: 定义了文献、材料、工艺等数据模型。
- `server/services/chemical/`: 核心业务逻辑，包括 Prompt 管理和提取服务。
- `server/storage/prompts/chemical/`: 预设的提取提示词模板。
- `frontend/src/pages/Chemical/`: 前端页面（文献管理、提取流程、数据查看）。

## 📄 原版 AnythingLLM 说明

本项目基于 AnythingLLM 开发。关于 AnythingLLM 的原版功能、部署方式和文档，请参考 [README_ORIGINAL.md](./README_ORIGINAL.md) 或访问其 [官方仓库](https://github.com/Mintplex-Labs/anything-llm)。

## 📝 版权信息

本项目遵循 MIT 协议开源。
AnythingLLM Copyright (c) Mintplex Labs Inc.
