const { prisma } = require("./article");

/**
 * 工艺管理模型
 */
const Process = {
  /**
   * 创建新工艺
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const process = await prisma.chemical_processes.create({
      data: {
        articleId: data.articleId,
        name: data.name,
        description: data.description || null,
        sequence: data.sequence || 0,
        conditions: data.conditions ? JSON.stringify(data.conditions) : null,
        notes: data.notes || null,
      },
    });

    // 创建工艺参数
    if (data.parameters && data.parameters.length > 0) {
      for (const param of data.parameters) {
        await prisma.chemical_process_parameters.create({
          data: {
            processId: process.id,
            name: param.name,
            value: param.value,
            unit: param.unit || null,
            dataType: param.dataType || "string",
            notes: param.notes || null,
          },
        });
      }
    }

    // 关联材料
    if (data.materials && data.materials.length > 0) {
      for (const mat of data.materials) {
        await prisma.chemical_process_materials.create({
          data: {
            processId: process.id,
            materialId: mat.materialId || null,
            role: mat.role || "input",
            quantity: mat.quantity || null,
            unit: mat.unit || null,
            notes: mat.notes || null,
          },
        });
      }
    }

    return this.getById(process.id);
  },

  /**
   * 根据 ID 获取工艺
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const process = await prisma.chemical_processes.findUnique({
      where: { id },
      include: {
        article: true,
        materials: {
          include: {
            material: true,
          },
        },
        parameters: true,
        characterizations: true,
      },
    });

    if (process) {
      process.conditions = process.conditions
        ? JSON.parse(process.conditions)
        : null;
    }

    return process;
  },

  /**
   * 获取文献的所有工艺
   * @param {number} articleId
   * @returns {Promise<Array>}
   */
  async getByArticleId(articleId) {
    const processes = await prisma.chemical_processes.findMany({
      where: { articleId },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
        parameters: true,
        _count: {
          select: {
            characterizations: true,
          },
        },
      },
      orderBy: { sequence: "asc" },
    });

    return processes.map((p) => ({
      ...p,
      conditions: p.conditions ? JSON.parse(p.conditions) : null,
    }));
  },

  /**
   * 更新工艺
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

    return await prisma.chemical_processes.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * 删除工艺
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return await prisma.chemical_processes.delete({
      where: { id },
    });
  },

  /**
   * 添加工艺参数
   * @param {number} processId
   * @param {Object} param
   * @returns {Promise<Object>}
   */
  async addParameter(processId, param) {
    return await prisma.chemical_process_parameters.create({
      data: {
        processId,
        name: param.name,
        value: param.value,
        unit: param.unit || null,
        dataType: param.dataType || "string",
        notes: param.notes || null,
      },
    });
  },

  /**
   * 更新工艺参数
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateParameter(id, data) {
    return await prisma.chemical_process_parameters.update({
      where: { id },
      data,
    });
  },

  /**
   * 删除工艺参数
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async deleteParameter(id) {
    return await prisma.chemical_process_parameters.delete({
      where: { id },
    });
  },

  /**
   * 关联材料到工艺
   * @param {number} processId
   * @param {Object} materialData
   * @returns {Promise<Object>}
   */
  async addMaterial(processId, materialData) {
    return await prisma.chemical_process_materials.create({
      data: {
        processId,
        materialId: materialData.materialId || null,
        role: materialData.role || "input",
        quantity: materialData.quantity || null,
        unit: materialData.unit || null,
        notes: materialData.notes || null,
      },
    });
  },

  /**
   * 移除工艺材料关联
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async removeMaterial(id) {
    return await prisma.chemical_process_materials.delete({
      where: { id },
    });
  },
};

module.exports = {
  Process,
};