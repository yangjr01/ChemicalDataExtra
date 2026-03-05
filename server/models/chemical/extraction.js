const { prisma } = require("./article");

/**
 * 提取任务管理模型
 */
const ExtractionTask = {
  /**
   * 创建新提取任务
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await prisma.chemical_extraction_tasks.create({
      data: {
        articleId: data.articleId,
        promptId: data.promptId,
        promptName: data.promptName,
        status: data.status || "pending",
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        rawResponse: data.rawResponse || null,
        parsedData: data.parsedData || null,
        errorMessage: data.errorMessage || null,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
      },
    });
  },

  /**
   * 根据 ID 获取提取任务
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const task = await prisma.chemical_extraction_tasks.findUnique({
      where: { id },
      include: {
        article: true,
        conversations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (task) {
      try {
        task.parsedData = task.parsedData ? JSON.parse(task.parsedData) : null;
      } catch (e) {
        console.error(`[ExtractionTask ${id}] 解析 parsedData 失败:`, e.message);
        task.parsedData = null;
      }
    }

    return task;
  },

  /**
   * 获取已完成的提取任务
   * @param {number} articleId - 文献 ID
   * @param {string} promptId - 提示词 ID
   * @returns {Promise<Object|null>}
   */
  async getCompletedTask(articleId, promptId) {
    const task = await prisma.chemical_extraction_tasks.findFirst({
      where: {
        articleId,
        promptId,
        status: "completed",
        parsedData: {
          not: null,
        },
      },
      include: {
        conversations: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    if (task) {
      try {
        task.parsedData = task.parsedData ? JSON.parse(task.parsedData) : null;
      } catch (e) {
        console.error(`[ExtractionTask] 解析 parsedData 失败:`, e.message);
        task.parsedData = null;
      }
    }

    return task;
  },

  /**
   * 获取文献的所有提取任务
   * @param {number} articleId
   * @returns {Promise<Array>}
   */
  async getByArticleId(articleId) {
    const tasks = await prisma.chemical_extraction_tasks.findMany({
      where: { articleId },
      include: {
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((t) => ({
      ...t,
      parsedData: t.parsedData ? JSON.parse(t.parsedData) : null,
    }));
  },

  /**
   * 更新提取任务
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const updateData = { ...data };
    if (data.parsedData !== undefined) {
      updateData.parsedData = data.parsedData
        ? JSON.stringify(data.parsedData)
        : null;
    }
    if (data.startedAt) {
      updateData.startedAt = new Date(data.startedAt);
    }
    if (data.completedAt) {
      updateData.completedAt = new Date(data.completedAt);
    }

    return await prisma.chemical_extraction_tasks.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * 更新任务状态
   * @param {number} id
   * @param {string} status
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status, options = {}) {
    const data = { status };
    if (status === "running") {
      data.startedAt = new Date();
    }
    if (status === "completed" || status === "failed") {
      data.completedAt = new Date();
    }
    if (options.rawResponse !== undefined) {
      data.rawResponse = options.rawResponse;
    }
    if (options.parsedData !== undefined) {
      data.parsedData = options.parsedData
        ? JSON.stringify(options.parsedData)
        : null;
    }
    if (options.errorMessage !== undefined) {
      data.errorMessage = options.errorMessage;
    }
    if (options.inputTokens !== undefined) {
      data.inputTokens = options.inputTokens;
    }
    if (options.outputTokens !== undefined) {
      data.outputTokens = options.outputTokens;
    }

    return await prisma.chemical_extraction_tasks.update({
      where: { id },
      data,
    });
  },

  /**
   * 添加对话记录
   * @param {number} taskId
   * @param {Object} message
   * @returns {Promise<Object>}
   */
  async addConversation(taskId, message) {
    return await prisma.chemical_conversation_history.create({
      data: {
        taskId,
        role: message.role,
        content: message.content,
        tokens: message.tokens || 0,
      },
    });
  },

  /**
   * 获取任务的对话历史
   * @param {number} taskId
   * @returns {Promise<Array>}
   */
  async getConversationHistory(taskId) {
    return await prisma.chemical_conversation_history.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * 删除提取任务
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_extraction_tasks.delete({
      where: { id },
    });
  },
};

/**
 * 提示词模板管理模型
 */
const PromptTemplate = {
  /**
   * 创建新提示词模板
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await prisma.chemical_prompt_templates.create({
      data: {
        name: data.name,
        title: data.title,
        description: data.description || null,
        content: data.content,
        category: data.category || "extraction",
        version: data.version || 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  },

  /**
   * 根据 ID 获取提示词模板
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    if (!id || isNaN(parseInt(id))) {
      return null;
    }
    return await prisma.chemical_prompt_templates.findUnique({
      where: { id: parseInt(id) },
    });
  },

  /**
   * 根据名称获取提示词模板
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async getByName(name) {
    if (!name) {
      return null;
    }
    return await prisma.chemical_prompt_templates.findUnique({
      where: { name: String(name) },
    });
  },

  /**
   * 获取提示词模板列表
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async list(options = {}) {
    const where = {};
    if (options.category) {
      where.category = options.category;
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return await prisma.chemical_prompt_templates.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },

  /**
   * 获取所有激活的提示词模板
   * @returns {Promise<Array>}
   */
  async getActive() {
    return await this.list({ isActive: true });
  },

  /**
   * 更新提示词模板
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return await prisma.chemical_prompt_templates.update({
      where: { id },
      data: {
        ...data,
        lastUpdatedAt: new Date(),
      },
    });
  },

  /**
   * 删除提示词模板
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_prompt_templates.delete({
      where: { id },
    });
  },

  /**
   * 创建新版本
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createNewVersion(id, data) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Template not found");
    }

    // 创建新版本
    return await prisma.chemical_prompt_templates.create({
      data: {
        name: existing.name,
        title: data.title || existing.title,
        description: data.description || existing.description,
        content: data.content || existing.content,
        category: existing.category,
        version: existing.version + 1,
        isActive: true,
      },
    });
  },
};

module.exports = {
  ExtractionTask,
  PromptTemplate,
};