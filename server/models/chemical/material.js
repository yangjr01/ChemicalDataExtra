const { prisma } = require("./article");

/**
 * 材料管理模型
 */
const Material = {
  /**
   * 创建新材料
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return await prisma.chemical_materials.create({
      data: {
        articleId: data.articleId,
        name: data.name,
        formula: data.formula || null,
        categoryId: data.categoryId || null,
        composition: data.composition ? JSON.stringify(data.composition) : null,
        properties: data.properties ? JSON.stringify(data.properties) : null,
        notes: data.notes || null,
      },
    });
  },

  /**
   * 根据 ID 获取材料
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const material = await prisma.chemical_materials.findUnique({
      where: { id },
      include: {
        article: true,
        category: true,
        processMaterials: {
          include: {
            process: true,
          },
        },
        characterizations: true,
      },
    });

    if (material) {
      material.composition = material.composition
        ? JSON.parse(material.composition)
        : null;
      material.properties = material.properties
        ? JSON.parse(material.properties)
        : null;
    }

    return material;
  },

  /**
   * 获取文献的所有材料
   * @param {number} articleId
   * @returns {Promise<Array>}
   */
  async getByArticleId(articleId) {
    const materials = await prisma.chemical_materials.findMany({
      where: { articleId },
      include: {
        category: true,
        _count: {
          select: {
            processMaterials: true,
            characterizations: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return materials.map((m) => ({
      ...m,
      composition: m.composition ? JSON.parse(m.composition) : null,
      properties: m.properties ? JSON.parse(m.properties) : null,
    }));
  },

  /**
   * 更新材料
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const updateData = { ...data, lastUpdatedAt: new Date() };
    if (data.composition !== undefined) {
      updateData.composition = data.composition
        ? JSON.stringify(data.composition)
        : null;
    }
    if (data.properties !== undefined) {
      updateData.properties = data.properties
        ? JSON.stringify(data.properties)
        : null;
    }

    return await prisma.chemical_materials.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * 删除材料
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_materials.delete({
      where: { id },
    });
  },
};

/**
 * 材料分类模型
 */
const MaterialCategory = {
  async create(data) {
    return await prisma.chemical_material_categories.create({
      data: {
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
      },
    });
  },

  async getById(id) {
    return await prisma.chemical_material_categories.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { materials: true },
        },
      },
    });
  },

  async list() {
    return await prisma.chemical_material_categories.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { materials: true },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async getTree() {
    const categories = await this.list();
    const rootCategories = categories.filter((c) => !c.parentId);

    const buildTree = (parent) => {
      const children = categories.filter((c) => c.parentId === parent.id);
      return {
        ...parent,
        children: children.map(buildTree),
      };
    };

    return rootCategories.map(buildTree);
  },

  async update(id, data) {
    return await prisma.chemical_material_categories.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return await prisma.chemical_material_categories.delete({
      where: { id },
    });
  },
};

module.exports = {
  Material,
  MaterialCategory,
};