const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

/**
 * @route GET /api/chemical/alldata
 * @desc 获取所有文献的材料、工艺、表征数据汇总
 */
router.get("/", async (req, res) => {
  try {
    const { articleId, materialName, processName, technique, search } = req.query;

    // 构建查询条件
    const articleWhere = {};
    if (articleId) {
      articleWhere.id = parseInt(articleId);
    }
    if (search) {
      articleWhere.title = { contains: search };
    }

    // 获取所有文献
    const articles = await prisma.chemical_articles.findMany({
      where: articleWhere,
      select: {
        id: true,
        title: true,
      },
    });

    const articleIds = articles.map((a) => a.id);
    const articleMap = new Map(articles.map((a) => [a.id, a.title]));

    // 查询材料数据
    const materialWhere = { articleId: { in: articleIds } };
    if (materialName) {
      materialWhere.name = { contains: materialName };
    }

    const materials = await prisma.chemical_materials.findMany({
      where: materialWhere,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 查询工艺数据
    const processWhere = { articleId: { in: articleIds } };
    if (processName) {
      processWhere.name = { contains: processName };
    }

    const processes = await prisma.chemical_processes.findMany({
      where: processWhere,
      include: {
        parameters: true,
      },
      orderBy: { sequence: "asc" },
    });

    // 查询表征数据
    const charWhere = { articleId: { in: articleIds } };
    if (technique) {
      charWhere.technique = { contains: technique };
    }

    const characterizations = await prisma.chemical_characterizations.findMany({
      where: charWhere,
      include: {
        material: true,
        process: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 添加文献标题到每条记录
    const materialsWithTitle = materials.map((m) => ({
      ...m,
      articleTitle: articleMap.get(m.articleId) || "未知文献",
    }));

    const processesWithTitle = processes.map((p) => ({
      ...p,
      articleTitle: articleMap.get(p.articleId) || "未知文献",
    }));

    const characterizationsWithTitle = characterizations.map((c) => ({
      ...c,
      articleTitle: articleMap.get(c.articleId) || "未知文献",
    }));

    res.json({
      success: true,
      data: {
        materials: materialsWithTitle,
        processes: processesWithTitle,
        characterizations: characterizationsWithTitle,
        totalArticles: articles.length,
      },
    });
  } catch (error) {
    console.error("获取所有数据失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/alldata/export
 * @desc 导出所有数据
 */
router.get("/export", async (req, res) => {
  try {
    const { format = "json" } = req.query;

    // 获取所有数据
    const articles = await prisma.chemical_articles.findMany({
      select: { id: true, title: true },
    });

    const articleIds = articles.map((a) => a.id);
    const articleMap = new Map(articles.map((a) => [a.id, a.title]));

    const materials = await prisma.chemical_materials.findMany({
      where: { articleId: { in: articleIds } },
      include: { category: true },
    });

    const processes = await prisma.chemical_processes.findMany({
      where: { articleId: { in: articleIds } },
      include: { parameters: true },
    });

    const characterizations = await prisma.chemical_characterizations.findMany({
      where: { articleId: { in: articleIds } },
      include: { material: true, process: true },
    });

    const data = {
      materials: materials.map((m) => ({
        ...m,
        articleTitle: articleMap.get(m.articleId) || "未知文献",
      })),
      processes: processes.map((p) => ({
        ...p,
        articleTitle: articleMap.get(p.articleId) || "未知文献",
      })),
      characterizations: characterizations.map((c) => ({
        ...c,
        articleTitle: articleMap.get(c.articleId) || "未知文献",
      })),
    };

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=chemical_data.json");
      res.json(data);
    } else if (format === "csv") {
      // 生成 CSV 格式
      let csv = "文献标题,类型,名称,详情\\n";

      data.materials.forEach((m) => {
        csv += `"${m.articleTitle}","材料","${m.name}","化学式:${m.formula || "-"}"\\n`;
      });

      data.processes.forEach((p) => {
        csv += `"${p.articleTitle}","工艺","${p.name}","步骤:${p.sequence}"\\n`;
      });

      data.characterizations.forEach((c) => {
        csv += `"${c.articleTitle}","表征","${c.technique}","-"\\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=chemical_data.csv");
      res.send(csv);
    } else {
      res.status(400).json({ error: "不支持的导出格式" });
    }
  } catch (error) {
    console.error("导出数据失败:", error);
    res.status(500).json({ error: error.message || "导出失败" });
  }
});

module.exports = router;
