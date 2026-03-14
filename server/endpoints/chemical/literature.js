const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const { Article, Author } = require("../../models/chemical");
const { ExtractionTask } = require("../../models/chemical/extraction");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const pdfParse = require("pdf-parse");

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
    // 使用 iconv-lite 正确解码中文文件名
    const decodedName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf-8');
    cb(null, uniqueSuffix + "-" + decodedName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型，仅支持 PDF、DOC、DOCX、TXT"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// 处理中文文件名编码问题
const decodeFilename = (filename) => {
  try {
    // 使用 iconv-lite 正确解码 UTF-8 文件名
    return iconv.decode(Buffer.from(filename, 'binary'), 'utf-8');
  } catch (e) {
    // 如果失败，返回原始文件名
    return filename;
  }
};

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
    console.error("获取 PDF 文件失败:", error);
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
 * @route POST /api/chemical/literature/:id/extract
 * @desc 提取文章元数据（标题、DOI、期刊、摘要等）
 */
router.post("/:id/extract", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.getById(parseInt(id));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    if (!article.sourceFile || !fs.existsSync(article.sourceFile)) {
      return res.status(404).json({ error: "PDF 文件不存在" });
    }

    // 1. 读取并解析 PDF 文件
    const pdfBuffer = fs.readFileSync(article.sourceFile);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.length < 100) {
      return res.status(400).json({ error: "无法从 PDF 中提取足够的文本内容" });
    }

    // 2. 构建提示词
    const prompt = `请从以下学术论文文本中提取元数据信息。只需要提取以下字段：
- title: 论文标题（字符串）
- doi: DOI 号（字符串，如果没有则返回 null）
- journal: 期刊名称（字符串，如果没有则返回 null）
- authors: 作者列表（字符串数组）
- abstract: 摘要（字符串）
- keywords: 关键词（字符串数组，如果没有则返回 null）
- publicationDate: 发表日期（字符串，格式 YYYY-MM-DD，如果没有则返回 null）

请以纯 JSON 格式返回，不要包含任何其他说明文字。格式如下：
{
  "title": "论文标题",
  "doi": "DOI 号或 null",
  "journal": "期刊名称或 null",
  "authors": ["作者 1", "作者 2"],
  "abstract": "摘要内容",
  "keywords": ["关键词 1", "关键词 2"],
  "publicationDate": "2024-01-01"
}

论文文本内容：
${pdfText.substring(0, 8000)}
`;

    // 3. 调用 LLM 提取信息
    const provider = process.env.LLM_PROVIDER;
    let client;

    // 根据配置的 LLM 提供商选择客户端
    if (provider === "deepseek") {
      const { DeepSeekLLM } = require("../../utils/AiProviders/deepseek/index");
      client = new DeepSeekLLM();
    } else if (provider === "generic-openai") {
      const { GenericOpenAiLLM } = require("../../utils/AiProviders/genericOpenAi/index");
      client = new GenericOpenAiLLM();
    } else {
      // 默认使用 OpenAI
      const { OpenAiLLM } = require("../../utils/AiProviders/openAi/index");
      client = new OpenAiLLM();
    }

    const messages = [
      { role: "system", content: "你是一个专业的学术论文元数据提取助手。请准确提取论文的元数据信息，并以纯 JSON 格式返回。" },
      { role: "user", content: prompt },
    ];

    const result = await client.getChatCompletion(messages, {
      temperature: 0.1,
      maxTokens: 2000,
    });

    if (!result || !result.textResponse) {
      throw new Error("LLM 返回为空");
    }

    // 4. 解析 LLM 返回的 JSON
    let extractedData;
    const jsonResponse = result.textResponse;
    
    // 尝试提取 JSON 代码块
    const jsonMatch = jsonResponse.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1].trim() : jsonResponse;
    
    // 尝试提取第一个 JSON 对象
    const jsonBlockMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[0].trim();
    }

    try {
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("解析 JSON 失败，尝试修复:", e);
      // 尝试修复 JSON
      throw new Error("无法解析 LLM 返回的 JSON 数据");
    }

    // 5. 更新文章信息
    const updateData = {};
    if (extractedData.title) {
      // 清理标题：去除首尾空格和换行符
      const cleanTitle = String(extractedData.title).trim().replace(/\s+/g, ' ');
      if (cleanTitle.length > 0 && cleanTitle.length < 500) {
        updateData.title = cleanTitle;
      }
    }
    if (extractedData.doi) {
      updateData.doi = String(extractedData.doi).trim();
    }
    if (extractedData.journal) {
      updateData.journal = String(extractedData.journal).trim();
    }
    if (extractedData.abstract) {
      updateData.abstract = String(extractedData.abstract).trim();
    }
    if (extractedData.keywords && Array.isArray(extractedData.keywords)) {
      // 确保 keywords 是数组
      updateData.keywords = extractedData.keywords
        .filter(k => k && String(k).trim().length > 0)
        .map(k => String(k).trim());
    }
    if (extractedData.publicationDate) {
      const date = new Date(extractedData.publicationDate);
      if (!isNaN(date.getTime())) {
        updateData.publicationDate = date;
      }
    }

    console.log(`[提取文章信息] 更新数据：`, JSON.stringify(updateData, null, 2));

    // 如果有需要更新的数据
    if (Object.keys(updateData).length > 0) {
      await Article.update(parseInt(id), updateData);
      console.log(`[提取文章信息] 文章 ${id} 已更新`);
    }

    // 6. 处理作者信息
    if (extractedData.authors && Array.isArray(extractedData.authors)) {
      for (let i = 0; i < extractedData.authors.length; i++) {
        const authorName = extractedData.authors[i];
        const author = await Author.findOrCreate({
          name: authorName,
          orcid: null,
          affiliation: null,
        });
        await Author.addToArticle(parseInt(id), author.id, i);
      }
    }

    res.json({
      success: true,
      data: extractedData,
      message: "提取成功",
    });
  } catch (error) {
    console.error("提取文章信息失败:", error);
    res.status(500).json({ 
      error: error.message || "提取失败",
      details: error.stack 
    });
  }
});

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

/**
 * 处理预提取文件的映射配置
 * 支持文件名格式：
 * - 1预提取-材料工艺信息xxx.txt (xxx可以是任意字符)
 * - 2材料表xxx.txt
 * - 3工艺表xxx.txt
 * - 4预提取-表征信息xxx.txt
 * - 5表征信息表xxx.txt
 */
const PRE_EXTRACTED_FILE_MAP = {
  "1预提取-材料工艺信息": {
    promptId: "pre_extraction_materials_processes",
    promptName: "pre_extraction_materials_processes",
  },
  "2材料表": {
    promptId: "materials_table",
    promptName: "materials_table",
  },
  "3工艺表": {
    promptId: "processes_table",
    promptName: "processes_table",
  },
  "4预提取-表征信息": {
    promptId: "pre_extraction_characterizations",
    promptName: "pre_extraction_characterizations",
  },
  "5表征信息表": {
    promptId: "characterizations_table",
    promptName: "characterizations_table",
  },
};

/**
 * @route POST /api/chemical/literature/upload-processed
 * @desc 上传预处理过的文献数据（包含5个提示词处理过的结果）
 */
router.post("/upload-processed", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "未上传文件" });
    }

    const { title, doi, journal, abstract } = req.body;
    
    // 1. 查找 PDF 文件
    const pdfFile = req.files.find(f => 
      f.originalname.toLowerCase().endsWith('.pdf')
    );
    
    if (!pdfFile) {
      return res.status(400).json({ error: "未找到 PDF 文件，请上传 PDF 文件" });
    }

    // 2. 创建文献记录
    const article = await Article.create({
      title: title || pdfFile.originalname.replace('.pdf', ''),
      doi: doi || null,
      journal: journal || null,
      abstract: abstract || null,
      sourceFile: pdfFile.path,
      status: "completed",
    });

    console.log(`[上传预处理数据] 创建文献 ID: ${article.id}`);
    console.log(`[上传预处理数据] 上传文件列表:`, req.files.map(f => ({ name: f.originalname, path: f.path })));

    // 3. 处理预提取的 txt 文件
    const createdTasks = [];
    const txtFiles = req.files.filter(f => 
      decodeFilename(f.originalname).toLowerCase().endsWith('.txt')
    );
    
    console.log(`[上传预处理数据] 找到 ${txtFiles.length} 个 txt 文件`);

    for (const txtFile of txtFiles) {
      // 从文件名识别类型
      const originalName = decodeFilename(txtFile.originalname);
      const fileName = path.basename(originalName, '.txt');
      let matchedConfig = null;
      
      console.log(`[上传预处理数据] 处理文件: ${originalName}`);
      console.log(`[上传预处理数据] 提取名称: ${fileName}`);
      
      // 使用正则表达式匹配文件名
      // 支持的格式：1预提取-材料工艺信息xxx.txt、2材料表xxx.txt 等
      for (const [prefix, config] of Object.entries(PRE_EXTRACTED_FILE_MAP)) {
        // 构建正则：以prefix开头，后面可以是任意字符
        const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
        
        if (pattern.test(fileName)) {
          matchedConfig = config;
          console.log(`[上传预处理数据] ✅ 匹配成功: ${prefix} -> ${config.promptName}`);
          break;
        }
      }

      if (!matchedConfig) {
        console.log(`[上传预处理数据] ❌ 未识别的文件: ${originalName}`);
        console.log(`[上传预处理数据] 期望的前缀: ${Object.keys(PRE_EXTRACTED_FILE_MAP).join(', ')}`);
        continue;
      }

      // 读取文件内容
      const content = fs.readFileSync(txtFile.path, 'utf-8');
      
      if (!content || content.trim().length === 0) {
        console.log(`[上传预处理数据] 文件内容为空: ${txtFile.originalname}，跳过`);
        continue;
      }

      try {
        // 创建提取任务记录
        const task = await ExtractionTask.create({
          articleId: article.id,
          promptId: matchedConfig.promptId,
          promptName: matchedConfig.promptName,
          status: "completed",
          rawResponse: content,
          parsedData: content, // 直接存储原始内容作为解析数据
          inputTokens: 0,
          outputTokens: content.length,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        createdTasks.push({
          taskId: task.id,
          promptName: matchedConfig.promptName,
          fileName: txtFile.originalname,
        });

        console.log(`[上传预处理数据] 创建提取任务: ${matchedConfig.promptName}`);
      } catch (error) {
        console.error(`[上传预处理数据] 创建任务失败: ${txtFile.originalname}`, error);
      }
    }

    res.json({
      success: true,
      data: {
        article,
        createdTasks,
        totalFiles: req.files.length,
        processedFiles: createdTasks.length,
      },
      message: `文献上传成功，共处理 ${createdTasks.length} 个预提取文件`,
    });
  } catch (error) {
    console.error("上传预处理数据失败:", error);
    res.status(500).json({ error: error.message || "上传失败" });
  }
});

module.exports = router;
