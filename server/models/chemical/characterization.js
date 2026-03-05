const { prisma } = require("./article");

/**
 * 表征信息管理模型
 */
const Characterization = {
  /**
   * 创建新表征
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await prisma.chemical_characterizations.create({
      data: {
        articleId: data.articleId,
        materialId: data.materialId || null,
        processId: data.processId || null,
        technique: data.technique,
        conditions: data.conditions ? JSON.stringify(data.conditions) : null,
        results: data.results ? JSON.stringify(data.results) : null,
        notes: data.notes || null,
      },
    });
  },

  /**
   * 根据 ID 获取表征
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const char = await prisma.chemical_characterizations.findUnique({
      where: { id },
      include: {
        article: true,
        material: true,
        process: true,
      },
    });

    if (char) {
      char.conditions = char.conditions ? JSON.parse(char.conditions) : null;
      char.results = char.results ? JSON.parse(char.results) : null;
    }

    return char;
  },

  /**
   * 获取文献的所有表征
   * @param {number} articleId
   * @returns {Promise<Array>}
   */
  async getByArticleId(articleId) {
    const chars = await prisma.chemical_characterizations.findMany({
      where: { articleId },
      include: {
        material: true,
        process: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return chars.map((c) => ({
      ...c,
      conditions: c.conditions ? JSON.parse(c.conditions) : null,
      results: c.results ? JSON.parse(c.results) : null,
    }));
  },

  /**
   * 按材料获取表征
   * @param {number} materialId
   * @returns {Promise<Array>}
   */
  async getByMaterialId(materialId) {
    const chars = await prisma.chemical_characterizations.findMany({
      where: { materialId },
      include: {
        article: true,
        process: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return chars.map((c) => ({
      ...c,
      conditions: c.conditions ? JSON.parse(c.conditions) : null,
      results: c.results ? JSON.parse(c.results) : null,
    }));
  },

  /**
   * 按工艺获取表征
   * @param {number} processId
   * @returns {Promise<Array>}
   */
  async getByProcessId(processId) {
    const chars = await prisma.chemical_characterizations.findMany({
      where: { processId },
      include: {
        article: true,
        material: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return chars.map((c) => ({
      ...c,
      conditions: c.conditions ? JSON.parse(c.conditions) : null,
      results: c.results ? JSON.parse(c.results) : null,
    }));
  },

  /**
   * 更新表征
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const updateData = { ...data, lastUpdatedAt: new Date() };
    if (data.conditions !== undefined) {
      updateData.conditions = data.conditions
        ? JSON.stringify(data.conditions)
        : null;
    }
    if (data.results !== undefined) {
      updateData.results = data.results ? JSON.stringify(data.results) : null;
    }

    return await prisma.chemical_characterizations.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * 删除表征
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_characterizations.delete({
      where: { id },
    });
  },

  /**
   * 获取常用表征技术列表
   * @returns {Promise<Array>}
   */
  async getTechniques() {
    const results = await prisma.chemical_characterizations.groupBy({
      by: ["technique"],
      _count: {
        technique: true,
      },
      orderBy: {
        _count: {
          technique: "desc",
        },
      },
    });

    return results.map((r) => ({
      name: r.technique,
      count: r._count.technique,
    }));
  },
};

module.exports = {
  Characterization,
};