const { Router } = require("express");
const {
  Article,
  Material,
  MaterialCategory,
  Process,
  Characterization,
} = require("../../models/chemical");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

/**
 * @route GET /api/chemical/data/:articleId
 * @desc 获取文献的完整数据
 */
router.get("/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.getById(parseInt(articleId));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取所有关联数据
    const [materials, processes, characterizations] = await Promise.all([
      Material.getByArticleId(parseInt(articleId)),
      Process.getByArticleId(parseInt(articleId)),
      Characterization.getByArticleId(parseInt(articleId)),
    ]);

    res.json({
      success: true,
      data: {
        article,
        materials,
        processes,
        characterizations,
      },
    });
  } catch (error) {
    console.error("获取数据失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/data/material
 * @desc 创建材料
 */
router.post("/material", async (req, res) => {
  try {
    const { articleId, name, formula, categoryId, composition, properties, notes } = req.body;

    if (!articleId || !name) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const material = await Material.create({
      articleId: parseInt(articleId),
      name,
      formula: formula || null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      composition: composition || null,
      properties: properties || null,
      notes: notes || null,
    });

    res.json({
      success: true,
      data: material,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建材料失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/material/:id
 * @desc 更新材料
 */
router.put("/material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: material,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新材料失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/material/:id
 * @desc 删除材料
 */
router.delete("/material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Material.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除材料失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/process
 * @desc 创建工艺
 */
router.post("/process", async (req, res) => {
  try {
    const { articleId, name, description, sequence, conditions, notes, parameters, materials } = req.body;

    if (!articleId || !name) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const process = await Process.create({
      articleId: parseInt(articleId),
      name,
      description: description || null,
      sequence: sequence || 0,
      conditions: conditions || null,
      notes: notes || null,
      parameters: parameters || [],
      materials: materials || [],
    });

    res.json({
      success: true,
      data: process,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建工艺失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/process/:id
 * @desc 更新工艺
 */
router.put("/process/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const process = await Process.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: process,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新工艺失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/process/:id
 * @desc 删除工艺
 */
router.delete("/process/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Process.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除工艺失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/characterization
 * @desc 创建表征
 */
router.post("/characterization", async (req, res) => {
  try {
    const { articleId, materialId, processId, technique, conditions, results, notes } = req.body;

    if (!articleId || !technique) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const char = await Characterization.create({
      articleId: parseInt(articleId),
      materialId: materialId ? parseInt(materialId) : null,
      processId: processId ? parseInt(processId) : null,
      technique,
      conditions: conditions || null,
      results: results || null,
      notes: notes || null,
    });

    res.json({
      success: true,
      data: char,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建表征失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/characterization/:id
 * @desc 更新表征
 */
router.put("/characterization/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const char = await Characterization.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: char,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新表征失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/characterization/:id
 * @desc 删除表征
 */
router.delete("/characterization/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Characterization.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除表征失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/integrate
 * @desc 数据整合
 */
router.post("/integrate", async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ error: "请选择要整合的文献" });
    }

    // 获取所有文献数据
    const articlesData = await Promise.all(
      articleIds.map(async (id) => {
        const article = await Article.getById(parseInt(id));
        const materials = await Material.getByArticleId(parseInt(id));
        const processes = await Process.getByArticleId(parseInt(id));
        const characterizations = await Characterization.getByArticleId(parseInt(id));

        return {
          article,
          materials,
          processes,
          characterizations,
        };
      })
    );

    // 统计数据
    const summary = {
      totalArticles: articlesData.length,
      totalMaterials: articlesData.reduce((sum, d) => sum + d.materials.length, 0),
      totalProcesses: articlesData.reduce((sum, d) => sum + d.processes.length, 0),
      totalCharacterizations: articlesData.reduce(
        (sum, d) => sum + d.characterizations.length,
        0
      ),
    };

    // 材料名称汇总
    const materialNames = new Set();
    articlesData.forEach((d) => {
      d.materials.forEach((m) => materialNames.add(m.name));
    });

    // 表征技术汇总
    const techniques = {};
    articlesData.forEach((d) => {
      d.characterizations.forEach((c) => {
        techniques[c.technique] = (techniques[c.technique] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        articles: articlesData,
        summary,
        materialNames: Array.from(materialNames),
        techniques,
      },
    });
  } catch (error) {
    console.error("数据整合失败:", error);
    res.status(500).json({ error: error.message || "整合失败" });
  }
});

/**
 * @route GET /api/chemical/data/export/:articleId
 * @desc 导出数据
 */
router.get("/export/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const { format = "json" } = req.query;

    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    const [materials, processes, characterizations] = await Promise.all([
      Material.getByArticleId(parseInt(articleId)),
      Process.getByArticleId(parseInt(articleId)),
      Characterization.getByArticleId(parseInt(articleId)),
    ]);

    const exportData = {
      article: {
        title: article.title,
        doi: article.doi,
        journal: article.journal,
        publicationDate: article.publicationDate,
        authors: article.authors.map((a) => a.author.name),
      },
      materials,
      processes,
      characterizations,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="article_${articleId}.json"`
      );
      res.json(exportData);
    } else {
      res.json({
        success: true,
        data: exportData,
      });
    }
  } catch (error) {
    console.error("导出数据失败:", error);
    res.status(500).json({ error: error.message || "导出失败" });
  }
});

/**
 * @route GET /api/chemical/data/categories
 * @desc 获取材料分类列表
 */
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await MaterialCategory.getTree();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("获取分类失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/data/categories
 * @desc 创建材料分类
 */
router.post("/categories", async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "分类名称不能为空" });
    }

    const category = await MaterialCategory.create({
      name,
      description: description || null,
      parentId: parentId ? parseInt(parentId) : null,
    });

    res.json({
      success: true,
      data: category,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建分类失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route GET /api/chemical/data/techniques
 * @desc 获取表征技术列表
 */
router.get("/techniques/list", async (req, res) => {
  try {
    const techniques = await Characterization.getTechniques();

    res.json({
      success: true,
      data: techniques,
    });
  } catch (error) {
    console.error("获取技术列表失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

module.exports = router;