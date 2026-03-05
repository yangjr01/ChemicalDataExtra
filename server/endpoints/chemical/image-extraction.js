const { Router } = require("express");
const { Characterization, Article } = require("../../models/chemical");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const path = require("path");
const fs = require("fs");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

/**
 * @route POST /api/chemical/image-extraction/save
 * @desc 保存图片提取的坐标数据（新格式）
 */
router.post("/save", async (req, res) => {
  try {
    const {
      articleId,
      chartId,
      materialId,
      coordinates,
      axisPoints,
      axisValues,
      curves,
      screenshot,
    } = req.body;

    if (!articleId) {
      return res.status(400).json({
        error: "缺少文献ID",
      });
    }

    // 检查文献是否存在
    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 验证坐标轴标定
    if (!axisPoints?.origin || !axisPoints?.xAxis || !axisPoints?.yAxis) {
      return res.status(400).json({
        error: "坐标轴标定不完整",
      });
    }

    // 保存截图（如果有）
    let screenshotPath = null;
    if (screenshot) {
      try {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        const filename = `chart_${Date.now()}.png`;
        const uploadDir = path.join(process.cwd(), "storage", "chemical", "charts");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        screenshotPath = `/storage/chemical/charts/${filename}`;
      } catch (error) {
        console.error("保存截图失败:", error.message);
      }
    }

    // 创建表征数据记录
    const characterization = await Characterization.create({
      articleId: parseInt(articleId),
      materialId: materialId ? parseInt(materialId) : null,
      technique: "图表数据提取",
      conditions: {
        chartId: chartId || null,
        axisPoints,
        axisValues,
        curves: curves || [],
        screenshotPath: screenshotPath,
      },
      results: {
        dataPoints: coordinates || [],
        pointCount: coordinates?.length || 0,
        curveCount: curves?.length || 0,
      },
      notes: `从文献图表中提取的坐标数据，共 ${coordinates?.length || 0} 个点，${curves?.length || 0} 条曲线`,
    });

    res.json({
      success: true,
      data: characterization,
      message: "图表数据保存成功",
    });
  } catch (error) {
    console.error("保存图片提取数据失败:", error);
    res.status(500).json({
      error: error.message || "保存失败",
    });
  }
});

/**
 * @route GET /api/chemical/image-extraction/:id
 * @desc 获取图片提取数据
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const characterization = await Characterization.getById(parseInt(id));

    if (!characterization) {
      return res.status(404).json({ error: "数据不存在" });
    }

    res.json({
      success: true,
      data: characterization,
    });
  } catch (error) {
    console.error("获取图片提取数据失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route DELETE /api/chemical/image-extraction/:id
 * @desc 删除图片提取数据
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const characterization = await Characterization.getById(parseInt(id));

    if (!characterization) {
      return res.status(404).json({ error: "数据不存在" });
    }

    // 如果有截图文件，删除文件
    if (characterization.conditions?.screenshotPath) {
      try {
        const filePath = path.join(
          process.cwd(),
          "storage",
          characterization.conditions.screenshotPath.replace(/^\//, "")
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error("删除截图文件失败:", error.message);
      }
    }

    await Characterization.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除图片提取数据失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

module.exports = router;
