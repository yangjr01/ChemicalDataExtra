const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Article, Author } = require("../../models/chemical");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../../storage/chemical/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型，仅支持 PDF、DOC、DOCX"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * @route POST /api/chemical/literature/upload
 * @desc 上传文献文件
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "未上传文件" });
    }

    const { title, doi, journal, publicationDate, abstract, keywords } = req.body;

    // 创建文献记录
    const article = await Article.create({
      title: title || req.file.originalname,
      doi: doi || null,
      journal: journal || null,
      publicationDate: publicationDate || null,
      abstract: abstract || null,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      sourceFile: req.file.path,
      status: "pending",
    });

    res.json({
      success: true,
      data: article,
      message: "文献上传成功",
    });
  } catch (error) {
    console.error("上传文献失败:", error);
    res.status(500).json({ error: error.message || "上传失败" });
  }
});

/**
 * @route GET /api/chemical/literature/list
 * @desc 获取文献列表
 */
router.get("/list", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, search } = req.query;

    const result = await Article.list({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      search,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("获取文献列表失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/literature/:id
 * @desc 获取文献详情
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.getById(parseInt(id));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("获取文献详情失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route PUT /api/chemical/literature/:id
 * @desc 更新文献信息
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const article = await Article.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: article,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新文献失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/literature/:id
 * @desc 删除文献
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.getById(parseInt(id));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 删除关联文件
    if (article.sourceFile && fs.existsSync(article.sourceFile)) {
      fs.unlinkSync(article.sourceFile);
    }

    await Article.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除文献失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/literature/:id/authors
 * @desc 添加文献作者
 */
router.post("/:id/authors", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, orcid, affiliation, authorOrder } = req.body;

    if (!name) {
      return res.status(400).json({ error: "作者名称不能为空" });
    }

    // 查找或创建作者
    const author = await Author.findOrCreate({
      name,
      orcid: orcid || null,
      affiliation: affiliation || null,
    });

    // 关联到文献
    await Author.addToArticle(
      parseInt(id),
      author.id,
      authorOrder || 0
    );

    res.json({
      success: true,
      data: author,
      message: "添加作者成功",
    });
  } catch (error) {
    console.error("添加作者失败:", error);
    res.status(500).json({ error: error.message || "添加失败" });
  }
});

/**
 * @route PUT /api/chemical/literature/:id/status
 * @desc 更新文献状态
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "processing", "completed", "failed"].includes(status)) {
      return res.status(400).json({ error: "无效的状态值" });
    }

    const article = await Article.updateStatus(parseInt(id), status);

    res.json({
      success: true,
      data: article,
      message: "状态更新成功",
    });
  } catch (error) {
    console.error("更新状态失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

module.exports = router;
/**
 * @route GET /api/chemical/literature/:id/pdf
 * @desc 获取文献 PDF 文件
 */
router.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.getById(parseInt(id));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    if (!article.sourceFile) {
      return res.status(404).json({ error: "未找到 PDF 文件" });
    }

    // 检查文件是否存在
    if (!fs.existsSync(article.sourceFile)) {
      return res.status(404).json({ error: "PDF 文件不存在" });
    }

    // 发送文件
    res.sendFile(article.sourceFile);
  } catch (error) {
    console.error("获取 PDF 文件失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});
