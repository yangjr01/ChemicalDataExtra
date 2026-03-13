# 文献管理页面更新说明

## 新增功能

### 1. 视图切换功能
- **卡片视图**：传统的卡片式布局，显示详细信息
- **列表视图**：紧凑的表格布局，适合快速浏览大量文献

**切换按钮**：在工具栏右侧，点击可在两种视图间切换

### 2. 提取文章信息功能
- **功能描述**：调用 DeepSeek LLM 自动从 PDF 中提取论文元数据
- **提取字段**：
  - 标题 (title)
  - DOI (doi)
  - 期刊名称 (journal)
  - 作者列表 (authors)
  - 摘要 (abstract)
  - 关键词 (keywords)
  - 发表日期 (publicationDate)

**使用方法**：
1. 上传 PDF 文献
2. 点击"提取文章信息"按钮
3. 等待 AI 分析完成
4. 系统自动更新文献信息

**按钮位置**：
- **卡片视图**：在每张卡片的操作栏中
- **列表视图**：在每行的操作列中（图标按钮）

## 修改的文件

### 前端
- `frontend/src/pages/Chemical/LiteratureManage.jsx`
  - 添加视图切换状态和按钮
  - 添加列表视图组件
  - 添加"提取文章信息"按钮和处理逻辑
  - 添加提取状态显示（加载中）

### 后端
- `server/endpoints/chemical/literature.js`
  - 添加 `POST /api/chemical/literature/:id/extract` 端点
  - 集成 PDF 解析（pdf-parse）
  - 集成 DeepSeek LLM 调用
  - 自动更新数据库

## API 端点

### POST /api/chemical/literature/:id/extract

**请求**：
```http
POST /api/chemical/literature/123/extract
Headers: Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "title": "论文标题",
    "doi": "10.1000/xyz123",
    "journal": "期刊名称",
    "authors": ["作者 1", "作者 2"],
    "abstract": "摘要内容...",
    "keywords": ["关键词 1", "关键词 2"],
    "publicationDate": "2024-01-01"
  },
  "message": "提取成功"
}
```

## 注意事项

1. **API 费用**：每次提取会调用 DeepSeek API，产生相应费用
2. **PDF 限制**：仅提取前 8000 字符，适合大多数论文
3. **确认提示**：点击提取按钮时会弹出确认对话框
4. **智能更新**：只更新空字段，不覆盖已有信息
5. **错误处理**：提取失败时显示详细错误信息

## 技术细节

### LLM 提示词
- 使用结构化提示词，要求返回纯 JSON
- 温度设置为 0.1，确保输出稳定
- 最大 token 数 2000

### PDF 解析
- 使用 pdf-parse 库
- 提取纯文本内容
- 限制长度防止超出上下文窗口

### 数据处理
- 自动修复可能的 JSON 格式问题
- 作者自动关联到文献
- 关键词存储为 JSON 数组
