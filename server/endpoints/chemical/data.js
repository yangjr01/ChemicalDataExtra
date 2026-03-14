const { Router } = require("express");
const {
  Article,
  Material,
  MaterialCategory,
  Process,
  Characterization,
} = require("../../models/chemical");
const { prisma } = require("../../models/chemical/article");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

const router = Router();

// 对所有请求进行认证验证
router.use(validatedRequest);

/**
 * @route GET /api/chemical/data/:articleId
 * @desc 获取文献的完整数据
 */
router.get("/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.getById(parseInt(articleId));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取所有关联数据
    const [materials, processes, characterizations] = await Promise.all([
      Material.getByArticleId(parseInt(articleId)),
      Process.getByArticleId(parseInt(articleId)),
      Characterization.getByArticleId(parseInt(articleId)),
    ]);

    res.json({
      success: true,
      data: {
        article,
        materials,
        processes,
        characterizations,
      },
    });
  } catch (error) {
    console.error("获取数据失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/data/material
 * @desc 创建材料
 */
router.post("/material", async (req, res) => {
  try {
    const { articleId, name, formula, categoryId, composition, properties, notes } = req.body;

    if (!articleId || !name) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const material = await Material.create({
      articleId: parseInt(articleId),
      name,
      formula: formula || null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      composition: composition || null,
      properties: properties || null,
      notes: notes || null,
    });

    res.json({
      success: true,
      data: material,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建材料失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/material/:id
 * @desc 更新材料
 */
router.put("/material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: material,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新材料失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/material/:id
 * @desc 删除材料
 */
router.delete("/material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Material.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除材料失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/process
 * @desc 创建工艺
 */
router.post("/process", async (req, res) => {
  try {
    const { articleId, name, description, sequence, conditions, notes, parameters, materials } = req.body;

    if (!articleId || !name) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const process = await Process.create({
      articleId: parseInt(articleId),
      name,
      description: description || null,
      sequence: sequence || 0,
      conditions: conditions || null,
      notes: notes || null,
      parameters: parameters || [],
      materials: materials || [],
    });

    res.json({
      success: true,
      data: process,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建工艺失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/process/:id
 * @desc 更新工艺
 */
router.put("/process/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const process = await Process.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: process,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新工艺失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/process/:id
 * @desc 删除工艺
 */
router.delete("/process/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Process.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除工艺失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/characterization
 * @desc 创建表征
 */
router.post("/characterization", async (req, res) => {
  try {
    const { articleId, materialId, processId, technique, conditions, results, notes } = req.body;

    if (!articleId || !technique) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const char = await Characterization.create({
      articleId: parseInt(articleId),
      materialId: materialId ? parseInt(materialId) : null,
      processId: processId ? parseInt(processId) : null,
      technique,
      conditions: conditions || null,
      results: results || null,
      notes: notes || null,
    });

    res.json({
      success: true,
      data: char,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建表征失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route PUT /api/chemical/data/characterization/:id
 * @desc 更新表征
 */
router.put("/characterization/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const char = await Characterization.update(parseInt(id), req.body);

    res.json({
      success: true,
      data: char,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新表征失败:", error);
    res.status(500).json({ error: error.message || "更新失败" });
  }
});

/**
 * @route DELETE /api/chemical/data/characterization/:id
 * @desc 删除表征
 */
router.delete("/characterization/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Characterization.delete(parseInt(id));

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除表征失败:", error);
    res.status(500).json({ error: error.message || "删除失败" });
  }
});

/**
 * @route POST /api/chemical/data/integrate
 * @desc 数据整合
 */
router.post("/integrate", async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ error: "请选择要整合的文献" });
    }

    // 获取所有文献数据
    const articlesData = await Promise.all(
      articleIds.map(async (id) => {
        const article = await Article.getById(parseInt(id));
        const materials = await Material.getByArticleId(parseInt(id));
        const processes = await Process.getByArticleId(parseInt(id));
        const characterizations = await Characterization.getByArticleId(parseInt(id));

        return {
          article,
          materials,
          processes,
          characterizations,
        };
      })
    );

    // 统计数据
    const summary = {
      totalArticles: articlesData.length,
      totalMaterials: articlesData.reduce((sum, d) => sum + d.materials.length, 0),
      totalProcesses: articlesData.reduce((sum, d) => sum + d.processes.length, 0),
      totalCharacterizations: articlesData.reduce(
        (sum, d) => sum + d.characterizations.length,
        0
      ),
    };

    // 材料名称汇总
    const materialNames = new Set();
    articlesData.forEach((d) => {
      d.materials.forEach((m) => materialNames.add(m.name));
    });

    // 表征技术汇总
    const techniques = {};
    articlesData.forEach((d) => {
      d.characterizations.forEach((c) => {
        techniques[c.technique] = (techniques[c.technique] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        articles: articlesData,
        summary,
        materialNames: Array.from(materialNames),
        techniques,
      },
    });
  } catch (error) {
    console.error("数据整合失败:", error);
    res.status(500).json({ error: error.message || "整合失败" });
  }
});

/**
 * @route GET /api/chemical/data/export/:articleId
 * @desc 导出数据
 */
router.get("/export/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const { format = "json" } = req.query;

    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    const [materials, processes, characterizations] = await Promise.all([
      Material.getByArticleId(parseInt(articleId)),
      Process.getByArticleId(parseInt(articleId)),
      Characterization.getByArticleId(parseInt(articleId)),
    ]);

    const exportData = {
      article: {
        title: article.title,
        doi: article.doi,
        journal: article.journal,
        publicationDate: article.publicationDate,
        authors: article.authors.map((a) => a.author.name),
      },
      materials,
      processes,
      characterizations,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="article_${articleId}.json"`
      );
      res.json(exportData);
    } else {
      res.json({
        success: true,
        data: exportData,
      });
    }
  } catch (error) {
    console.error("导出数据失败:", error);
    res.status(500).json({ error: error.message || "导出失败" });
  }
});

/**
 * @route GET /api/chemical/data/categories
 * @desc 获取材料分类列表
 */
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await MaterialCategory.getTree();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("获取分类失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/data/categories
 * @desc 创建材料分类
 */
router.post("/categories", async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "分类名称不能为空" });
    }

    const category = await MaterialCategory.create({
      name,
      description: description || null,
      parentId: parentId ? parseInt(parentId) : null,
    });

    res.json({
      success: true,
      data: category,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建分类失败:", error);
    res.status(500).json({ error: error.message || "创建失败" });
  }
});

/**
 * @route GET /api/chemical/data/techniques
 * @desc 获取表征技术列表
 */
router.get("/techniques/list", async (req, res) => {
  try {
    const techniques = await Characterization.getTechniques();

    res.json({
      success: true,
      data: techniques,
    });
  } catch (error) {
    console.error("获取技术列表失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route GET /api/chemical/data/:articleId/pre-extractions
 * @desc 获取文献的预提取结果（5 个模块的预提取文本）
 */
router.get("/:articleId/pre-extractions", async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.getById(parseInt(articleId));

    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取该文献的所有提取任务
    const extractionTasks = await Article.getExtractionTasks(parseInt(articleId));
    
    // 定义 5 个预提取模块
    const preExtractionModules = [
      {
        id: 1,
        name: "pre_extraction_materials_processes",
        title: "预提取 - 材料工艺信息",
        templateFile: "pre_extraction_materials_processes.txt",
        result: null,
      },
      {
        id: 2,
        name: "materials_table",
        title: "材料表",
        templateFile: "materials_table.txt",
        result: null,
      },
      {
        id: 3,
        name: "processes_table",
        title: "工艺表",
        templateFile: "processes_table.txt",
        result: null,
      },
      {
        id: 4,
        name: "pre_extraction_characterizations",
        title: "预提取 - 表征信息",
        templateFile: "pre_extraction_characterizations.txt",
        result: null,
      },
      {
        id: 5,
        name: "characterizations_table",
        title: "表征信息表",
        templateFile: "characterizations_table.txt",
        result: null,
      },
    ];

    // 从提取任务中查找对应的结果
    if (extractionTasks && extractionTasks.length > 0) {
      extractionTasks.forEach(task => {
        const moduleIndex = preExtractionModules.findIndex(
          m => m.name === task.promptName
        );
        if (moduleIndex !== -1 && task.rawResponse) {
          preExtractionModules[moduleIndex].result = task.rawResponse;
        }
      });
    }

    res.json({
      success: true,
      data: {
        articleId: parseInt(articleId),
        modules: preExtractionModules,
      },
    });
  } catch (error) {
    console.error("获取预提取结果失败:", error);
    res.status(500).json({ error: error.message || "获取失败" });
  }
});

/**
 * @route POST /api/chemical/data/:articleId/save-all-pre-extractions
 * @desc 使用 LLM 智能转换并保存所有预提取结果到数据库
 */
router.post("/:articleId/save-all-pre-extractions", async (req, res) => {
  try {
    const { articleId } = req.params;
    const { useLLM = true } = req.body; // 默认使用 LLM 转换

    console.log(`[save-all-pre-extractions] 开始保存文献 ${articleId} 的所有预提取数据，useLLM=${useLLM}`);

    // 验证文献是否存在
    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取该文献的所有提取任务
    const extractionTasks = await prisma.chemical_extraction_tasks.findMany({
      where: {
        articleId: parseInt(articleId),
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
    });

    if (!extractionTasks || extractionTasks.length === 0) {
      return res.status(404).json({ error: "未找到预提取结果" });
    }

    console.log(`[save-all-pre-extractions] 找到 ${extractionTasks.length} 个提取任务`);

    let materialsCount = 0;
    let processesCount = 0;
    let characterizationsCount = 0;
    let llmConversionCount = 0;

    const { ExtractionService } = require("../../services/chemical/extractionService");

    // 1. 首先处理结构化的数据表（materials_table, processes_table, characterizations_table）
    for (const task of extractionTasks) {
      if (!task.rawResponse) continue;

      const moduleName = task.promptName;
      
      // 解析原始响应
      let parsedData;
      try {
        parsedData = JSON.parse(task.rawResponse);
      } catch (e) {
        const jsonMatch = task.rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } else {
          continue;
        }
      }

      // 处理材料表
      if (moduleName === "materials_table") {
        let materials = [];
        if (Array.isArray(parsedData)) {
          materials = parsedData;
        } else if (parsedData['材料表'] && Array.isArray(parsedData['材料表'])) {
          materials = parsedData['材料表'];
        }

        console.log(`[save-all-pre-extractions] 从 materials_table 保存 ${materials.length} 个材料`);
        
        for (const item of materials) {
          try {
            const existingMaterial = await prisma.chemical_materials.findFirst({
              where: {
                articleId: parseInt(articleId),
                name: item.name || item['名称'] || "未知材料",
              },
            });
            
            if (!existingMaterial) {
              await Material.create({
                articleId: parseInt(articleId),
                name: item.name || item['名称'] || "未知材料",
                formula: item.formula || item['化学式'] || null,
                categoryId: null,
                composition: item.composition ? JSON.stringify(item.composition) : null,
                properties: item.properties ? JSON.stringify(item.properties) : null,
                notes: item.notes || null,
              });
              materialsCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存材料失败:', error.message);
          }
        }
      }

      // 处理工艺表
      if (moduleName === "processes_table") {
        let processes = [];
        if (Array.isArray(parsedData)) {
          processes = parsedData;
        } else if (parsedData['工艺表'] && Array.isArray(parsedData['工艺表'])) {
          processes = parsedData['工艺表'];
        }

        console.log(`[save-all-pre-extractions] 从 processes_table 保存 ${processes.length} 个工艺`);
        
        for (let i = 0; i < processes.length; i++) {
          const item = processes[i];
          try {
            const existingProcess = await prisma.chemical_processes.findFirst({
              where: {
                articleId: parseInt(articleId),
                name: item.name || item['名称'] || `工艺步骤 ${i + 1}`,
              },
            });
            
            if (!existingProcess) {
              await Process.create({
                articleId: parseInt(articleId),
                name: item.name || item['名称'] || `工艺步骤 ${i + 1}`,
                description: item.description || item['描述'] || null,
                sequence: item.stepNumber || item.sequence || item['编号'] || i + 1,
                conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                notes: item.notes || null,
              });
              processesCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存工艺失败:', error.message);
          }
        }
      }

      // 处理表征表
      if (moduleName === "characterizations_table") {
        let characterizations = [];
        if (Array.isArray(parsedData)) {
          characterizations = parsedData;
        } else if (parsedData['表征表'] && Array.isArray(parsedData['表征表'])) {
          characterizations = parsedData['表征表'];
        }

        console.log(`[save-all-pre-extractions] 从 characterizations_table 保存 ${characterizations.length} 个表征`);
        
        for (const item of characterizations) {
          try {
            const existingChar = await prisma.chemical_characterizations.findFirst({
              where: {
                articleId: parseInt(articleId),
                technique: item.technique || item['技术'] || item['名称'] || "未知技术",
              },
            });
            
            if (!existingChar) {
              await Characterization.create({
                articleId: parseInt(articleId),
                technique: item.technique || item['技术'] || item['名称'] || "未知技术",
                conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                results: item.results ? JSON.stringify(item.results) : null,
                notes: item.notes || null,
              });
              characterizationsCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存表征失败:', error.message);
          }
        }
      }
    }

    // 2. 如果需要，使用 LLM 转换预提取文本
    if (useLLM) {
      console.log('[save-all-pre-extractions] 开始使用 LLM 转换预提取文本...');

      for (const task of extractionTasks) {
        if (!task.rawResponse) continue;

        const moduleName = task.promptName;

        // 使用 LLM 转换材料工艺预提取
        if (moduleName === "pre_extraction_materials_processes") {
          try {
            console.log('[save-all-pre-extractions] 使用 LLM 转换材料工艺预提取...');
            
            // 转换材料
            const materials = await ExtractionService.transformPreExtractionToStructured(
              task.rawResponse,
              "materials"
            );
            
            console.log(`[save-all-pre-extractions] LLM 转换出 ${materials.length} 个材料`);
            
            for (const item of materials) {
              try {
                const existingMaterial = await prisma.chemical_materials.findFirst({
                  where: {
                    articleId: parseInt(articleId),
                    name: item.name || "未知材料",
                  },
                });
                
                if (!existingMaterial) {
                  await Material.create({
                    articleId: parseInt(articleId),
                    name: item.name || "未知材料",
                    formula: item.formula || null,
                    categoryId: null,
                    composition: item.composition ? JSON.stringify(item.composition) : null,
                    properties: item.properties ? JSON.stringify(item.properties) : null,
                    notes: item.notes || null,
                  });
                  materialsCount++;
                  llmConversionCount++;
                }
              } catch (error) {
                console.error('[save-all-pre-extractions] LLM 转换材料保存失败:', error.message);
              }
            }

            // 转换工艺
            const processes = await ExtractionService.transformPreExtractionToStructured(
              task.rawResponse,
              "processes"
            );
            
            console.log(`[save-all-pre-extractions] LLM 转换出 ${processes.length} 个工艺`);
            
            for (let i = 0; i < processes.length; i++) {
              const item = processes[i];
              try {
                const existingProcess = await prisma.chemical_processes.findFirst({
                  where: {
                    articleId: parseInt(articleId),
                    name: item.name || `工艺步骤 ${i + 1}`,
                  },
                });
                
                if (!existingProcess) {
                  await Process.create({
                    articleId: parseInt(articleId),
                    name: item.name || `工艺步骤 ${i + 1}`,
                    description: item.description || null,
                    sequence: item.sequence || i + 1,
                    conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                    notes: item.notes || null,
                  });
                  processesCount++;
                  llmConversionCount++;
                }
              } catch (error) {
                console.error('[save-all-pre-extractions] LLM 转换工艺保存失败:', error.message);
              }
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] LLM 转换材料工艺失败:', error.message);
          }
        }

        // 使用 LLM 转换表征预提取
        if (moduleName === "pre_extraction_characterizations" || 
            moduleName === "characterization_pre_extraction") {
          try {
            console.log('[save-all-pre-extractions] 使用 LLM 转换表征预提取...');
            
            const characterizations = await ExtractionService.transformPreExtractionToStructured(
              task.rawResponse,
              "characterizations"
            );
            
            console.log(`[save-all-pre-extractions] LLM 转换出 ${characterizations.length} 个表征`);
            
            for (const item of characterizations) {
              try {
                const existingChar = await prisma.chemical_characterizations.findFirst({
                  where: {
                    articleId: parseInt(articleId),
                    technique: item.technique || "未知技术",
                  },
                });
                
                if (!existingChar) {
                  await Characterization.create({
                    articleId: parseInt(articleId),
                    technique: item.technique || "未知技术",
                    conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                    results: item.results ? JSON.stringify(item.results) : null,
                    notes: item.notes || null,
                  });
                  characterizationsCount++;
                  llmConversionCount++;
                }
              } catch (error) {
                console.error('[save-all-pre-extractions] LLM 转换表征保存失败:', error.message);
              }
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] LLM 转换表征失败:', error.message);
          }
        }
      }
    }

    console.log(`[save-all-pre-extractions] 完成：材料 ${materialsCount}, 工艺 ${processesCount}, 表征 ${characterizationsCount}, LLM转换 ${llmConversionCount}`);

    res.json({
      success: true,
      data: {
        materialsCount,
        processesCount,
        characterizationsCount,
        llmConversionCount,
        totalCount: materialsCount + processesCount + characterizationsCount,
      },
      message: `成功保存 ${materialsCount + processesCount + characterizationsCount} 条记录到数据库（其中 ${llmConversionCount} 条由 LLM 智能转换）`,
    });
  } catch (error) {
    console.error("保存所有预提取数据失败:", error);
    res.status(500).json({ error: error.message || "保存失败" });
  }
});

/**
 * @route POST /api/chemical/data/:articleId/save-pre-extraction
 * @desc 将预提取结果保存到数据库
 */
router.post("/:articleId/save-pre-extraction", async (req, res) => {
  try {
    const { articleId } = req.params;
    const { moduleName } = req.body;

    console.log(`[save-pre-extraction] articleId=${articleId}, moduleName=${moduleName}`);

    // 验证文献是否存在
    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 根据模块名称确定要保存的数据类型
    const extractionService = require("../../services/chemical/extractionService");
    
    // 查找对应的提取任务
    const task = await prisma.chemical_extraction_tasks.findFirst({
      where: {
        articleId: parseInt(articleId),
        promptName: moduleName,
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
    });

    if (!task || !task.rawResponse) {
      return res.status(404).json({ error: "未找到预提取结果" });
    }

    console.log(`[save-pre-extraction] 找到任务 ID: ${task.id}`);

    // 解析原始响应
    let parsedData;
    try {
      // 尝试直接解析 JSON
      parsedData = JSON.parse(task.rawResponse);
    } catch (e) {
      // 如果失败，尝试提取 JSON 代码块
      const jsonMatch = task.rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1].trim());
      } else {
        // 尝试提取第一个 JSON 对象
        const jsonBlockMatch = task.rawResponse.match(/\{[\s\S]*\}/);
        if (jsonBlockMatch) {
          parsedData = JSON.parse(jsonBlockMatch[0].trim());
        } else {
          throw new Error("无法解析预提取数据");
        }
      }
    }

    console.log(`[save-pre-extraction] 解析后的数据类型:`, typeof parsedData, Array.isArray(parsedData) ? 'array' : 'object');

    // 根据模块名称保存到对应的数据库表
    let savedCount = 0;
    
    if (moduleName === "materials_table" || moduleName === "pre_extraction_materials_processes") {
      // 保存材料数据
      const materials = Array.isArray(parsedData) ? parsedData : (parsedData.materials || []);
      console.log(`[save-pre-extraction] 保存 ${materials.length} 个材料`);
      
      for (const item of materials) {
        try {
          await Material.create({
            articleId: parseInt(articleId),
            name: item.name || item.materialName || "未知材料",
            formula: item.formula || null,
            categoryId: null,
            composition: item.composition ? JSON.stringify(item.composition) : null,
            properties: item.properties ? JSON.stringify(item.properties) : null,
            notes: item.notes || null,
          });
          savedCount++;
        } catch (error) {
          console.error('[save-pre-extraction] 保存材料失败:', error.message, item);
        }
      }
    }

    if (moduleName === "processes_table" || moduleName === "pre_extraction_materials_processes") {
      // 保存工艺数据
      const processes = Array.isArray(parsedData) ? parsedData : (parsedData.processes || []);
      console.log(`[save-pre-extraction] 保存 ${processes.length} 个工艺`);
      
      for (let i = 0; i < processes.length; i++) {
        const item = processes[i];
        try {
          await Process.create({
            articleId: parseInt(articleId),
            name: item.name || item.processName || `工艺步骤 ${i + 1}`,
            description: item.description || null,
            sequence: item.stepNumber || item.sequence || i + 1,
            conditions: item.conditions ? JSON.stringify(item.conditions) : null,
            notes: item.notes || null,
          });
          savedCount++;
        } catch (error) {
          console.error('[save-pre-extraction] 保存工艺失败:', error.message, item);
        }
      }
    }

    if (moduleName === "characterizations_table" || moduleName === "pre_extraction_characterizations") {
      // 保存表征数据
      const characterizations = Array.isArray(parsedData) ? parsedData : (parsedData.characterizations || []);
      console.log(`[save-pre-extraction] 保存 ${characterizations.length} 个表征`);
      
      for (const item of characterizations) {
        try {
          await Characterization.create({
            articleId: parseInt(articleId),
            technique: item.technique || item.name || "未知技术",
            conditions: item.conditions ? JSON.stringify(item.conditions) : null,
            results: item.results ? JSON.stringify(item.results) : null,
            notes: item.notes || null,
          });
          savedCount++;
        } catch (error) {
          console.error('[save-pre-extraction] 保存表征失败:', error.message, item);
        }
      }
    }

    console.log(`[save-pre-extraction] 共保存 ${savedCount} 条记录`);

    res.json({
      success: true,
      data: {
        savedCount,
        moduleName,
      },
      message: `成功保存 ${savedCount} 条记录到数据库`,
    });
  } catch (error) {
    console.error("保存预提取数据失败:", error);
    res.status(500).json({ error: error.message || "保存失败" });
  }
});

/**
 * @route POST /api/chemical/data/:articleId/save-all-pre-extractions
 * @desc 将所有预提取结果保存到数据库（统一入口）
 */
router.post("/:articleId/save-all-pre-extractions", async (req, res) => {
  try {
    const { articleId } = req.params;

    console.log(`[save-all-pre-extractions] 开始保存文献 ${articleId} 的所有预提取数据`);

    // 验证文献是否存在
    const article = await Article.getById(parseInt(articleId));
    if (!article) {
      return res.status(404).json({ error: "文献不存在" });
    }

    // 获取该文献的所有提取任务
    const extractionTasks = await prisma.chemical_extraction_tasks.findMany({
      where: {
        articleId: parseInt(articleId),
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
    });

    if (!extractionTasks || extractionTasks.length === 0) {
      return res.status(404).json({ error: "未找到预提取结果" });
    }

    console.log(`[save-all-pre-extractions] 找到 ${extractionTasks.length} 个提取任务`);

    let materialsCount = 0;
    let processesCount = 0;
    let characterizationsCount = 0;

    // 处理所有提取任务
    for (const task of extractionTasks) {
      if (!task.rawResponse) continue;

      // 解析原始响应
      let parsedData;
      try {
        parsedData = JSON.parse(task.rawResponse);
      } catch (e) {
        const jsonMatch = task.rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } else {
          const jsonBlockMatch = task.rawResponse.match(/\{[\s\S]*\}/);
          if (jsonBlockMatch) {
            parsedData = JSON.parse(jsonBlockMatch[0].trim());
          } else {
            console.log(`[save-all-pre-extractions] 无法解析任务 ${task.id} 的数据`);
            continue;
          }
        }
      }

      const moduleName = task.promptName;
      console.log(`[save-all-pre-extractions] 处理模块: ${moduleName}`);

      // 保存材料数据
      if (moduleName === "materials_table" || 
          moduleName === "pre_extraction_materials_processes" ||
          moduleName === "material_structured_extraction") {
        // 支持多种数据格式
        let materials = [];
        if (Array.isArray(parsedData)) {
          materials = parsedData;
        } else if (parsedData.materials && Array.isArray(parsedData.materials)) {
          materials = parsedData.materials;
        } else if (parsedData['材料表'] && Array.isArray(parsedData['材料表'])) {
          materials = parsedData['材料表'];
        }
        console.log(`[save-all-pre-extractions] 保存 ${materials.length} 个材料`);
        
        for (const item of materials) {
          try {
            // 检查是否已存在相同名称的材料
            const existingMaterial = await prisma.chemical_materials.findFirst({
              where: {
                articleId: parseInt(articleId),
                name: item.name || item.materialName || item['名称'] || "未知材料",
              },
            });
            
            if (!existingMaterial) {
              await Material.create({
                articleId: parseInt(articleId),
                name: item.name || item.materialName || item['名称'] || "未知材料",
                formula: item.formula || item['化学式'] || null,
                categoryId: null,
                composition: item.composition ? JSON.stringify(item.composition) : null,
                properties: item.properties ? JSON.stringify(item.properties) : null,
                notes: item.notes || null,
              });
              materialsCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存材料失败:', error.message);
          }
        }
      }

      // 保存工艺数据
      if (moduleName === "processes_table" || 
          moduleName === "pre_extraction_materials_processes" ||
          moduleName === "process_flow_pre_extraction" ||
          moduleName === "process_structured_extraction") {
        // 支持多种数据格式
        let processes = [];
        if (Array.isArray(parsedData)) {
          processes = parsedData;
        } else if (parsedData.processes && Array.isArray(parsedData.processes)) {
          processes = parsedData.processes;
        } else if (parsedData.processSteps && Array.isArray(parsedData.processSteps)) {
          processes = parsedData.processSteps;
        } else if (parsedData['工艺表'] && Array.isArray(parsedData['工艺表'])) {
          processes = parsedData['工艺表'];
        }
        console.log(`[save-all-pre-extractions] 保存 ${processes.length} 个工艺`);
        
        for (let i = 0; i < processes.length; i++) {
          const item = processes[i];
          try {
            // 检查是否已存在相同名称的工艺
            const existingProcess = await prisma.chemical_processes.findFirst({
              where: {
                articleId: parseInt(articleId),
                name: item.name || item.processName || `工艺步骤 ${i + 1}`,
              },
            });
            
            if (!existingProcess) {
              await Process.create({
                articleId: parseInt(articleId),
                name: item.name || item.processName || item['名称'] || `工艺步骤 ${i + 1}`,
                description: item.description || item['描述'] || null,
                sequence: item.stepNumber || item.sequence || item['编号'] || i + 1,
                conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                notes: item.notes || null,
              });
              processesCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存工艺失败:', error.message);
          }
        }
      }

      // 保存表征数据
      if (moduleName === "characterizations_table" || 
          moduleName === "pre_extraction_characterizations" ||
          moduleName === "characterization_pre_extraction" ||
          moduleName === "characterization_structured_extraction") {
        const characterizations = Array.isArray(parsedData) ? parsedData : (parsedData.characterizations || []);
        console.log(`[save-all-pre-extractions] 保存 ${characterizations.length} 个表征`);
        
        for (const item of characterizations) {
          try {
            // 检查是否已存在相同技术的表征
            const existingChar = await prisma.chemical_characterizations.findFirst({
              where: {
                articleId: parseInt(articleId),
                technique: item.technique || item.name || "未知技术",
              },
            });
            
            if (!existingChar) {
              await Characterization.create({
                articleId: parseInt(articleId),
                technique: item.technique || item.name || "未知技术",
                conditions: item.conditions ? JSON.stringify(item.conditions) : null,
                results: item.results ? JSON.stringify(item.results) : null,
                notes: item.notes || null,
              });
              characterizationsCount++;
            }
          } catch (error) {
            console.error('[save-all-pre-extractions] 保存表征失败:', error.message);
          }
        }
      }
    }

    console.log(`[save-all-pre-extractions] 完成：材料 ${materialsCount}, 工艺 ${processesCount}, 表征 ${characterizationsCount}`);

    res.json({
      success: true,
      data: {
        materialsCount,
        processesCount,
        characterizationsCount,
        totalCount: materialsCount + processesCount + characterizationsCount,
      },
      message: `成功保存 ${materialsCount + processesCount + characterizationsCount} 条记录到数据库`,
    });
  } catch (error) {
    console.error("保存所有预提取数据失败:", error);
    res.status(500).json({ error: error.message || "保存失败" });
  }
});

module.exports = router;