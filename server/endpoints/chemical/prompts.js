const { Router } = require("express");
const { PromptTemplate } = require("../../models/chemical");
const fs = require("fs");
const path = require("path");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

// 预设提示词目录
const PRESET_PROMPTS_DIR = path.join(__dirname, "../../../storage/prompts/chemical");

/**
 * @route GET /api/chemical/prompts/list
 * @desc 获取提示词模板列表
 */
router.get("/list", async (req, res) => {
  try {
    const { category, includeInactive } = req.query;

    const options = {};
    if (category) {
      options.category = category;
    }
    if (includeInactive !== "true") {
      options.isActive = true;
    }

    const templates = await PromptTemplate.list(options);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("获取提示词列表失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/prompts/presets
 * @desc 获取预设提示词列表
 */
router.get("/presets", async (req, res) => {
  try {
    const presets = [];

    if (fs.existsSync(PRESET_PROMPTS_DIR)) {
      const files = fs.readdirSync(PRESET_PROMPTS_DIR).filter((f) => f.endsWith(".txt"));

      for (const file of files) {
        const filePath = path.join(PRESET_PROMPTS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const name = file.replace(".txt", "");

        presets.push({
          name,
          title: name.replace(/_/g, " "),
          content,
          source: "preset",
        });
      }
    }

    res.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error("获取预设提示词失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/prompts/:id
 * @desc 获取提示词模板详情
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await PromptTemplate.getById(parseInt(id));

    if (!template) {
      return res.status(404).json({ error: "提示词模板不存在" });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("获取提示词详情失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/prompts/custom
 * @desc 创建自定义提示词
 */
router.post("/custom", async (req, res) => {
  try {
    const { name, title, description, content, category } = req.body;

    if (!name || !title || !content) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 检查名称是否已存在
    const existing = await PromptTemplate.getByName(name);
    if (existing) {
      return res.status(400).json({ error: "提示词名称已存在" });
    }

    const template = await PromptTemplate.create({
      name,
      title,
      description: description || null,
      content,
      category: category || "custom",
    });

    res.json({
      success: true,
      data: template,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建提示词失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/prompts/:id
 * @desc 更新提示词模板
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, category, isActive } = req.body;

    const template = await PromptTemplate.update(parseInt(id), {
      title,
      description,
      content,
      category,
      isActive,
    });

    res.json({
      success: true,
      data: template,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新提示词失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/prompts/:id
 * @desc 删除提示词模板
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await PromptTemplate.getById(parseInt(id));

    if (!template) {
      return res.status(404).json({ error: "提示词模板不存在" });
    }

    await PromptTemplate.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除提示词失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/prompts/:id/version
 * @desc 创建新版本
 */
router.post("/:id/version", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content } = req.body;

    const newVersion = await PromptTemplate.createNewVersion(parseInt(id), {
      title,
      description,
      content,
    });

    res.json({
      success: true,
      data: newVersion,
      message: "新版本创建成功",
    });
  } catch (error) {
    console.error("创建新版本失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/prompts/:id/toggle
 * @desc 切换激活状态
 */
router.put("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await PromptTemplate.getById(parseInt(id));

    if (!template) {
      return res.status(404).json({ error: "提示词模板不存在" });
    }

    const updated = await PromptTemplate.update(parseInt(id), {
      isActive: !template.isActive,
    });

    res.json({
      success: true,
      data: updated,
      message: updated.isActive ? "已激活" : "已停用",
    });
  } catch (error) {
    console.error("切换状态失败:", error);
    res.status(500).json({ error: error.message || "操作失败" });
  }
});

module.exports = router;