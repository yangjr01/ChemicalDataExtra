const { Router } = require("express");
const { ExtractionTask, PromptTemplate, Article } = require("../../models/chemical");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const { ExtractionService } = require("../../services/chemical/extractionService");
const fs = require("fs");
const path = require("path");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

/**
 * @route POST /api/chemical/extraction/start
 * @desc 启动提取任务
 */
router.post("/start", async (req, res) => {
  try {
    const { articleId, promptId, force = false } = req.body;

    if (!articleId || !promptId) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 检查文献是否存在
    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取提示词模板 (支持按 ID 或名称查询)
    let prompt = null;
    const promptIdNum = parseInt(promptId);
    if (!isNaN(promptIdNum)) {
      prompt = await PromptTemplate.getById(promptIdNum);
    }
    if (!prompt) {
      prompt = await PromptTemplate.getByName(promptId);
    }
    if (!prompt) {
      return res.status(404).json({ error: "提示词模板不存在" });
    }

    // 检查是否已有完成的提取任务（非强制模式下）
    if (!force) {
      const existingTask = await ExtractionTask.getCompletedTask(parseInt(articleId), prompt.id?.toString() || promptId);
      
      if (existingTask && existingTask.parsedData) {
        console.log(`[ExtractionTask] 使用缓存结果：articleId=${articleId}, promptId=${promptId}`);
        return res.json({
          success: true,
          data: existingTask,
          cached: true,
          message: "已找到之前的提取结果，如需重新提取请设置 force=true",
        });
      }
    }

    // 创建新的提取任务
    const task = await ExtractionTask.create({
      articleId: parseInt(articleId),
      promptId: prompt.id?.toString() || promptId,
      promptName: prompt.name,
      status: "running",
      startedAt: new Date(),
    });

    // 更新文献状态为处理中
    await Article.updateStatus(parseInt(articleId), "processing");

    // 记录系统消息
    await ExtractionTask.addConversation(task.id, {
      role: "system",
      content: `开始执行提取任务：${prompt.title}${force ? ' (强制重新提取)' : ''}`,
      tokens: 0,
    });

    res.json({
      success: true,
      data: task,
      cached: false,
      message: "提取任务已启动，正在处理...",
    });

    // 异步执行提取任务
    setImmediate(async () => {
      try {
        // 构建文献内容 - 首先尝试读取文件内容
        let fullContent = `标题：${article.title}\n`;

        if (article.journal) fullContent += `期刊：${article.journal}\n`;
        if (article.doi) fullContent += `DOI: ${article.doi}\n`;
        if (article.abstract) fullContent += `摘要：${article.abstract}\n`;

        // 如果有源文件，尝试读取文件内容
        if (article.sourceFile) {
          try {
            const filePath = path.resolve(article.sourceFile);
            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath).toLowerCase();
              let fileContent = '';

              // 根据文件类型选择读取方式
              if (['.txt', '.md', '.json', '.xml', '.csv'].includes(ext)) {
                // 文本文件直接读取
                fileContent = fs.readFileSync(filePath, 'utf-8');
              } else if (ext === '.pdf') {
                // PDF 文件使用 pdf-parse 读取
                try {
                  const pdfParse = require('pdf-parse');
                  const dataBuffer = fs.readFileSync(filePath);
                  const pdfData = await pdfParse(dataBuffer);
                  fileContent = pdfData.text;
                } catch (pdfError) {
                  console.error(`解析 PDF 文件失败 ${filePath}:`, pdfError.message);
                  fileContent = `[PDF 文件内容无法解析，文件路径：${filePath}]`;
                }
              } else if (['.doc', '.docx'].includes(ext)) {
                // Word 文件使用 officeparser 读取
                try {
                  const officeparser = require('officeparser');
                  fileContent = await officeparser.parseOffice(filePath);
                } catch (officeError) {
                  console.error(`解析 Word 文件失败 ${filePath}:`, officeError.message);
                  fileContent = `[Word 文件内容无法解析，文件路径：${filePath}]`;
                }
              }

              if (fileContent) {
                fullContent += `\n--- 文献完整内容 ---\n${fileContent}\n--- 文献内容结束 ---\n`;
              }
            } else {
              fullContent += `\n[文件不存在：${article.sourceFile}]\n`;
            }
          } catch (fileError) {
            console.error(`读取文献文件失败:`, fileError.message);
            fullContent += `\n[读取文件失败：${fileError.message}]\n`;
          }
        }

        // 如果没有文件内容但有摘要，使用摘要
        if (!fullContent.includes('文献完整内容') && article.abstract) {
          fullContent += `\n--- 文献内容 ---\n${article.abstract}\n--- 文献内容结束 ---\n`;
        }

        // 执行提取
        const result = await ExtractionService.executeExtraction(task.id, fullContent, {
          temperature: 0.1,
          maxTokens: 8000,  // 增加 token 限制，避免响应被截断
        });

        if (result.success) {
          console.log(`提取任务 ${task.id} 完成`);
        } else {
          console.error(`提取任务 ${task.id} 失败:`, result.error);
        }
      } catch (error) {
        console.error(`提取任务 ${task.id} 异常:`, error);
        await ExtractionTask.updateStatus(task.id, "failed", {
          errorMessage: error.message,
        });
      }
    });
  } catch (error) {
    console.error("启动提取任务失败:", error);
    res.status(500).json({ error: error.message || "启动失败" });
  }
});

/**
 * @route POST /api/chemical/extraction/chat
 * @desc 发送提取对话
 */
router.post("/chat", async (req, res) => {
  try {
    const { taskId, message } = req.body;

    if (!taskId || !message) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 获取任务
    const task = await ExtractionTask.getById(parseInt(taskId));
    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    // 更新任务状态为运行中
    if (task.status === "pending") {
      await ExtractionTask.updateStatus(parseInt(taskId), "running");
    }

    // 记录用户消息
    await ExtractionTask.addConversation(parseInt(taskId), {
      role: "user",
      content: message,
      tokens: 0, // 将在服务层计算
    });

    res.json({
      success: true,
      data: {
        taskId: task.id,
        status: "processing",
        message: "消息已接收，正在处理",
      },
    });
  } catch (error) {
    console.error("处理对话失败:", error);
    res.status(500).json({ error: error.message || "处理失败" });
  }
});

/**
 * @route POST /api/chemical/extraction/save-to-db/:id
 * @desc 保存提取数据到数据库（调用 LLM 转换格式）
 */
router.post("/save-to-db/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await ExtractionTask.getById(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    if (!task.parsedData) {
      return res.status(400).json({ error: "没有可保存的数据" });
    }

    // 调用服务层保存到数据库
    await ExtractionService.saveToDatabaseWithLLM(
      task.articleId,
      task.promptName,
      task.parsedData,
      task.rawResponse || ""
    );

    res.json({
      success: true,
      message: "数据已保存到数据库",
    });
  } catch (error) {
    console.error("保存到数据库失败:", error);
    res.status(500).json({ error: error.message || "保存失败" });
  }
});

/**
 * @route POST /api/chemical/extraction/save
 * @desc 保存提取结果
 */
router.post("/save", async (req, res) => {
  try {
    const { taskId, parsedData, rawResponse, inputTokens, outputTokens } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: "缺少任务 ID" });
    }

    // 获取任务
    const task = await ExtractionTask.getById(parseInt(taskId));
    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    // 更新任务
    const updatedTask = await ExtractionTask.updateStatus(parseInt(taskId), "completed", {
      rawResponse,
      parsedData,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
    });

    // 记录助手响应
    await ExtractionTask.addConversation(parseInt(taskId), {
      role: "assistant",
      content: rawResponse || "",
      tokens: outputTokens || 0,
    });

    res.json({
      success: true,
      data: updatedTask,
      message: "提取结果已保存",
    });
  } catch (error) {
    console.error("保存提取结果失败:", error);
    res.status(500).json({ error: error.message || "保存失败" });
  }
});

/**
 * @route GET /api/chemical/extraction/status/:id
 * @desc 获取提取任务状态
 */
router.get("/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await ExtractionTask.getById(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        articleId: task.articleId,
        promptId: task.promptId,
        promptName: task.promptName,
        status: task.status,
        inputTokens: task.inputTokens,
        outputTokens: task.outputTokens,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    console.error("获取任务状态失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/extraction/task/:id
 * @desc 获取提取任务详情
 */
router.get("/task/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await ExtractionTask.getById(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("获取任务详情失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/extraction/history/:articleId
 * @desc 获取文献的提取历史
 */
router.get("/history/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const tasks = await ExtractionTask.getByArticleId(parseInt(articleId));

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("获取提取历史失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route DELETE /api/chemical/extraction/task/:id
 * @desc 删除提取任务
 */
router.delete("/task/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await ExtractionTask.getById(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: "任务不存在" });
    }

    await ExtractionTask.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除任务失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/extraction/fail/:id
 * @desc 标记任务失败
 */
router.post("/fail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { errorMessage } = req.body;

    const task = await ExtractionTask.updateStatus(parseInt(id), "failed", {
      errorMessage,
    });

    res.json({
      success: true,
      data: task,
      message: "任务已标记为失败",
    });
  } catch (error) {
    console.error("标记失败失败:", error);
    res.status(500).json({ error: error.message || "操作失败" });
  }
});

module.exports = router;
