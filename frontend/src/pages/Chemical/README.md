# 化学数据提取系统重构 - 新版提取页面

## 功能概述

新版化学数据提取页面采用两阶段提取流程：

### 第 1 部分：文本信息提取
- LLM 对话式提取
- 支持 5 种预定义提取模板（工艺流程、材料信息、工艺参数、表征信息、表征数据）
- 提取结果 JSON 预览
- 保存到数据库

### 第 2 部分：图片数据提取
- 从 PDF 截图或上传图片
- 坐标标定（点击标定坐标点）
- 坐标轴范围设置（Xmin/Xmax/Ymin/Ymax）
- 坐标数据转换（像素 → 数据坐标）
- 曲线预览（使用 recharts）
- 数据导出 CSV

## 文件结构

```
frontend/src/pages/Chemical/
├── ChemicalExtractionContext.jsx    # 状态管理 Context
├── PDFViewer.jsx                     # PDF 查看组件
├── TextExtractionPanel.jsx           # 文本信息提取面板
├── ImageCalibrationPanel.jsx         # 图片标定主面板
├── CoordinateCanvas.jsx              # 坐标标定画布
├── ChartSelector.jsx                 # 图表选择器
├── MaterialSelector.jsx              # 材料选择器
├── ChartPreview.jsx                  # 曲线预览组件
├── ExtractedDataSummary.jsx          # 已提取数据预览
├── ChemicalExtractionPage.jsx        # 统一提取页面
└── index.js                          # 模块导出
```

## 安装依赖

需要安装以下 npm 包：

```bash
cd anything-llm/frontend
npm install react-pdf html2canvas
```

## 使用说明

1. 访问 `/chemical/literature` 文献管理页面
2. 点击文献卡片上的"新版提取"按钮
3. 进入 `/chemical/extract/:articleId` 提取页面
4. 第 1 部分：选择提取模板，点击"开始提取"
5. 保存文本提取结果后，切换到第 2 部分
6. 从 PDF 截图或上传图片
7. 设置坐标轴范围，点击标定坐标点
8. 保存提取数据

## 技术栈

- 前端：React + MUI
- 图表：recharts
- PDF 渲染：react-pdf
- 截图：html2canvas
- 状态管理：React Context

## API 接口

### 图片提取 API
- `POST /api/chemical/image-extraction/save` - 保存图片提取数据
- `GET /api/chemical/image-extraction/:id` - 获取图片提取数据
- `DELETE /api/chemical/image-extraction/:id` - 删除图片提取数据

## 数据流

```
第 1 部分文本提取 → Context → 第 2 部分图片提取
                            ↓
                        坐标标定 → 曲线预览
                            ↓
                        保存到数据库
                            ↓
                        底部数据预览（实时更新）
```
