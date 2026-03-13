const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * 文献管理模型
 */
const Article = {
  /**
   * 创建新文献
   * @param {Object} data - 文献数据
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await prisma.chemical_articles.create({
      data: {
        title: data.title,
        doi: data.doi || null,
        journal: data.journal || null,
        publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
        volume: data.volume || null,
        issue: data.issue || null,
        pages: data.pages || null,
        abstract: data.abstract || null,
        keywords: data.keywords ? JSON.stringify(data.keywords) : null,
        sourceFile: data.sourceFile || null,
        workspaceDocId: data.workspaceDocId || null,
        status: data.status || "pending",
      },
    });
  },

  /**
   * 根据 ID 获取文献
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const article = await prisma.chemical_articles.findUnique({
      where: { id },
      include: {
        authors: {
          include: {
            author: true,
          },
          orderBy: { authorOrder: "asc" },
        },
        materials: true,
        processes: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
            parameters: true,
          },
          orderBy: { sequence: "asc" },
        },
        characterizations: true,
        extractionTasks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (article) {
      // 解析 JSON 字段
      article.keywords = article.keywords ? JSON.parse(article.keywords) : [];
    }

    return article;
  },

  /**
   * 获取文献列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>}
   */
  async list(options = {}) {
    const { page = 1, pageSize = 20, status, search } = options;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { doi: { contains: search } },
        { journal: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.chemical_articles.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          authors: {
            include: { author: true },
            orderBy: { authorOrder: "asc" },
          },
          _count: {
            select: {
              materials: true,
              processes: true,
              characterizations: true,
            },
          },
        },
      }),
      prisma.chemical_articles.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * 更新文献
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const updateData = { ...data, lastUpdatedAt: new Date() };
    
    // 处理 keywords：如果是数组，转换为 JSON 字符串
    if (data.keywords) {
      if (Array.isArray(data.keywords)) {
        updateData.keywords = JSON.stringify(data.keywords);
      } else if (typeof data.keywords === 'string') {
        // 如果已经是字符串，保持不变
        updateData.keywords = data.keywords;
      }
    }
    
    // 处理 publicationDate：确保是 Date 对象
    if (data.publicationDate) {
      if (!(data.publicationDate instanceof Date)) {
        updateData.publicationDate = new Date(data.publicationDate);
      }
    }

    console.log(`[Article.update] id=${id}, updateData:`, JSON.stringify(updateData, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));

    return await prisma.chemical_articles.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * 删除文献
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_articles.delete({
      where: { id },
    });
  },

  /**
   * 更新文献状态
   * @param {number} id
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    return await prisma.chemical_articles.update({
      where: { id },
      data: { status, lastUpdatedAt: new Date() },
    });
  },
};

/**
 * 作者管理模型
 */
const Author = {
  async create(data) {
    return await prisma.chemical_authors.create({
      data: {
        name: data.name,
        orcid: data.orcid || null,
        affiliation: data.affiliation || null,
      },
    });
  },

  async findOrCreate(data) {
    if (data.orcid) {
      const existing = await prisma.chemical_authors.findUnique({
        where: { orcid: data.orcid },
      });
      if (existing) return existing;
    }

    // 按名称查找
    const existing = await prisma.chemical_authors.findFirst({
      where: { name: data.name },
    });
    if (existing) return existing;

    return await this.create(data);
  },

  async addToArticle(articleId, authorId, authorOrder = 0) {
    return await prisma.chemical_article_authors.create({
      data: {
        articleId,
        authorId,
        authorOrder,
      },
    });
  },
};

/**
 * 文献管理模型 - 提取任务相关方法
 */
Article.getExtractionTasks = async function(articleId) {
  return await prisma.chemical_extraction_tasks.findMany({
    where: { articleId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  Article,
  Author,
  prisma,
};