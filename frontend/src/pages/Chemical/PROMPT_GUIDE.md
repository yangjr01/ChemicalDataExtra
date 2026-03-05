# 预设提示词修改指南

## 目录
- [预设提示词位置](#预设提示词位置)
- [方法一：直接修改文件](#方法一直接修改文件)
- [方法二：通过 API 管理](#方法二通过-api-管理)
- [方法三：使用管理页面](#方法三使用管理页面)
- [预设提示词说明](#预设提示词说明)

---

## 预设提示词位置

预设提示词文件存储在：
```
anything-llm/server/storage/prompts/chemical/
```

### 现有提示词文件

| 文件名 | 说明 | 对应提取步骤 |
|--------|------|-------------|
| `material_structured_extraction.txt` | 材料结构化提取提示词 | 材料信息提取 |
| `process_structured_extraction.txt` | 工艺结构化提取提示词 | 工艺参数提取 |
| `characterization_structured_extraction.txt` | 表征结构化提取提示词 | 表征数据提取 |
| `process_flow_pre_extraction.txt` | 工艺流程预提取提示词 | 工艺流程预提取 |
| `characterization_pre_extraction.txt` | 表征预提取提示词 | 表征信息预提取 |

---

## 方法一：直接修改文件（最简单）

### 步骤

1. **打开提示词文件**
   ```bash
   # Windows
   notepad anything-llm\server\storage\prompts\chemical\material_structured_extraction.txt
   
   # 或使用其他编辑器
   code anything-llm\server\storage\prompts\chemical\material_structured_extraction.txt
   ```

2. **编辑提示词内容**
   
   例如，修改材料提取提示词：
   ```txt
   你是一个专业的材料科学文献分析助手。请从给定的文献内容中提取材料的结构化信息。

   请按以下 JSON 格式输出：
   [
     {
       "name": "材料名称",
       "formula": "化学式/分子式",
       "type": "材料类型（如：催化剂、电极材料、吸附剂等）",
       ...
     }
   ]

   请仔细识别文献中提到的所有材料...
   ```

3. **保存文件**

4. **重启后端服务**
   ```cmd
   # 停止服务（Ctrl+C）
   # 重新启动
   cd server
   yarn dev
   ```

### 优点
- ✅ 简单直接
- ✅ 无需额外工具
- ✅ 版本可控（可 Git 管理）

### 缺点
- ❌ 需要重启服务
- ❌ 无法动态切换
- ❌ 不支持版本管理

---

## 方法二：通过 API 管理（推荐）

### API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/chemical/prompts/list` | 获取提示词列表 |
| GET | `/api/chemical/prompts/presets` | 获取预设提示词 |
| GET | `/api/chemical/prompts/:id` | 获取提示词详情 |
| POST | `/api/chemical/prompts/custom` | 创建自定义提示词 |
| PUT | `/api/chemical/prompts/:id` | 更新提示词 |
| DELETE | `/api/chemical/prompts/:id` | 删除提示词 |
| PUT | `/api/chemical/prompts/:id/toggle` | 切换激活状态 |
| POST | `/api/chemical/prompts/:id/version` | 创建新版本 |

### 使用示例

#### 1. 获取提示词列表

```bash
curl http://localhost:3001/api/chemical/prompts/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "material_structured_extraction",
      "title": "材料结构化提取",
      "description": "提取材料的结构化信息",
      "content": "你是一个专业的材料科学文献分析助手...",
      "category": "extraction",
      "isActive": true,
      "version": 1
    }
  ]
}
```

#### 2. 创建自定义提示词

```bash
curl -X POST http://localhost:3001/api/chemical/prompts/custom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "custom_material_v2",
    "title": "自定义材料提取 V2",
    "description": "增强版材料提取提示词",
    "content": "你是一个专业的材料科学文献分析助手...\n\n请按以下格式输出...",
    "category": "custom"
  }'
```

#### 3. 更新提示词

```bash
curl -X PUT http://localhost:3001/api/chemical/prompts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "材料结构化提取（更新版）",
    "content": "更新后的提示词内容...",
    "isActive": true
  }'
```

#### 4. 切换激活状态

```bash
curl -X PUT http://localhost:3001/api/chemical/prompts/1/toggle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript 示例

```javascript
// 获取提示词列表
async function getPrompts() {
  const response = await fetch('/api/chemical/prompts/list', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  const data = await response.json();
  return data.data;
}

// 创建提示词
async function createPrompt(name, title, content, category = 'custom') {
  const response = await fetch('/api/chemical/prompts/custom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ name, title, content, category })
  });
  return await response.json();
}

// 更新提示词
async function updatePrompt(id, updates) {
  const response = await fetch(`/api/chemical/prompts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(updates)
  });
  return await response.json();
}
```

### 优点
- ✅ 无需重启服务
- ✅ 支持版本管理
- ✅ 可动态切换
- ✅ 可创建自定义提示词

### 缺点
- ❌ 需要 API 调用
- ❌ 需要认证 token

---

## 方法三：使用管理页面

### 访问管理页面

```
http://localhost:3000/chemical/prompts
```

### 功能

1. **查看提示词列表** - 显示所有预设和自定义提示词
2. **编辑提示词** - 在线编辑并保存
3. **创建新提示词** - 创建自定义提示词模板
4. **管理版本** - 查看和切换不同版本
5. **激活/停用** - 控制提示词是否可用

---

## 预设提示词说明

### 1. material_structured_extraction

**用途**: 从文献中提取材料的结构化信息

**输出格式**:
```json
[
  {
    "name": "材料名称",
    "formula": "化学式",
    "type": "材料类型",
    "composition": { ... },
    "properties": { ... },
    "role": "作用",
    "preparationMethod": "制备方法"
  }
]
```

**提取内容**:
- 原料/前驱体
- 中间产物
- 最终产物
- 对比材料

---

### 2. process_structured_extraction

**用途**: 提取工艺步骤和参数的详细信息

**输出格式**:
```json
[
  {
    "name": "工艺名称",
    "type": "工艺类型",
    "sequence": 1,
    "description": "工艺描述",
    "parameters": [
      {
        "name": "温度",
        "value": "100",
        "unit": "℃",
        "dataType": "number"
      }
    ],
    "equipment": "使用设备",
    "conditions": { ... },
    "inputMaterials": [ ... ],
    "outputMaterials": [ ... ]
  }
]
```

---

### 3. characterization_structured_extraction

**用途**: 提取表征测试条件和结果数据

**输出格式**:
```json
[
  {
    "technique": "表征技术名称",
    "fullName": "技术全称",
    "category": "技术类别",
    "testedMaterial": "被测试材料",
    "conditions": {
      "instrument": "仪器型号",
      "temperature": "测试温度",
      "scanRange": "扫描范围"
    },
    "results": {
      "mainFindings": "主要发现",
      "quantitativeData": [ ... ],
      "qualitativeData": [ ... ]
    },
    "conclusions": "结论"
  }
]
```

**重点关注**:
- 定量数据（晶格常数、粒径、比表面积等）
- 定性描述（形貌特征、相组成等）
- 图表信息

---

## 最佳实践

### 1. 提示词设计原则

- **明确输出格式**: 使用 JSON Schema 或示例格式
- **分步引导**: 复杂任务分解为多个步骤
- **处理缺失值**: 说明如何处理文献中未提及的信息
- **语言一致**: 使用中文回答

### 2. 版本管理

- 修改前创建备份
- 使用版本号标识（v1, v2, v3）
- 记录每次修改的原因

### 3. 测试验证

- 修改后使用相同文献测试
- 对比新旧版本输出质量
- 确保 JSON 格式正确

---

## 常见问题

### Q: 修改后为什么没有生效？

**A**: 
- 如果直接修改文件，需要重启后端服务
- 如果使用数据库，确保提示词处于激活状态
- 清除浏览器缓存后刷新页面

### Q: 如何恢复原始预设提示词？

**A**:
```bash
# 从 Git 恢复
git checkout HEAD -- server/storage/prompts/chemical/

# 或重新初始化
cd server
npx prisma db seed
```

### Q: 可以创建多个版本的提示词吗？

**A**: 可以，使用 API 的 `/version` 端点创建新版本：
```bash
curl -X POST http://localhost:3001/api/chemical/prompts/1/version \
  -H "Content-Type: application/json" \
  -d '{"content": "新版本内容..."}'
```

---

**最后更新**: 2026-03-05
