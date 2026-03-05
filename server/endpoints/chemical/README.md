# 化学数据提取系统 - 后端 API

## 新增文件

```
server/endpoints/chemical/
├── image-extraction.js    # 图片提取 API
└── index.js               # 注册新路由（已修改）
```

## API 接口

### 图片提取相关

#### 保存图片提取数据
```
POST /api/chemical/image-extraction/save
```

**请求体：**
```json
{
  "articleId": 1,
  "chartId": 1,
  "materialId": 1,
  "coordinates": [
    {"x": 10.5, "y": 20.3},
    {"x": 15.2, "y": 25.8}
  ],
  "axisRange": {
    "xMin": 0,
    "xMax": 100,
    "yMin": 0,
    "yMax": 50
  },
  "screenshot": "data:image/png;base64,..."
}
```

**响应：**
```json
{
  "success": true,
  "data": { ... },
  "message": "图表数据保存成功"
}
```

#### 获取图片提取数据
```
GET /api/chemical/image-extraction/:id
```

#### 删除图片提取数据
```
DELETE /api/chemical/image-extraction/:id
```

## 数据存储

图片提取的坐标数据保存在 `chemical_characterizations` 表中：
- `technique`: 固定为"图表数据提取"
- `conditions`: 存储图表 ID、坐标轴范围、截图路径
- `results`: 存储坐标点数据

## 文件存储

截图图片保存在：
```
server/storage/chemical/charts/chart_<timestamp>.png
```
