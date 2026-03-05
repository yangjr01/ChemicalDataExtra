const { PromptTemplate, ExtractionTask, Article } = require("../../models/chemical");
const fs = require("fs");
const path = require("path");

// 预设提示词目录
const PRESET_PROMPTS_DIR = path.join(__dirname, "../../../storage/prompts/chemical");

/**
 * 提示词服务
 */
const PromptService = {
  /**
   * 初始化预设提示词到数据库
   */
  async initializePresets() {
    try {
      // 确保目录存在
      if (!fs.existsSync(PRESET_PROMPTS_DIR)) {
        fs.mkdirSync(PRESET_PROMPTS_DIR, { recursive: true });
      }

      // 读取预设提示词文件
      const presetFiles = [
        {
          name: "process_flow_pre_extraction",
          title: "工艺流程信息预提取",
          category: "extraction",
          content: `你是一个专业的材料科学文献分析助手。请从给定的文献内容中识别和提取工艺流程相关的信息。

请按以下结构输出：
1. 主要工艺步骤
2. 每个步骤的关键参数
3. 输入材料和输出材料
4. 特殊条件或注意事项

请用中文回答，输出格式为 JSON。`,
        },
        {
          name: "material_structured_extraction",
          title: "材料结构化信息提取",
          category: "extraction",
          content: `你是一个专业的材料科学文献分析助手。请从给定的文献内容中提取材料的结构化信息。

请提取以下信息：
1. 材料名称
2. 化学式/分子式
3. 组成成分
4. 材料类型
5. 关键性能参数

请用中文回答，输出格式为 JSON 数组。`,
        },
        {
          name: "process_structured_extraction",
          title: "工艺结构化信息提取",
          category: "extraction",
          content: `你是一个专业的材料科学文献分析助手。请从给定的文献内容中提取工艺的结构化信息。

请提取以下信息：
1. 工艺名称
2. 工艺步骤序列
3. 工艺参数（温度、压力、时间等）
4. 使用设备
5. 工艺条件

请用中文回答，输出格式为 JSON。`,
        },
        {
          name: "characterization_pre_extraction",
          title: "表征信息预提取",
          category: "extraction",
          content: `你是一个专业的材料科学文献分析助手。请从给定的文献内容中识别和提取表征相关信息。

请提取以下信息：
1. 表征技术（XRD, SEM, TEM, BET等）
2. 表征目的
3. 测试条件
4. 关键结果

请用中文回答，输出格式为 JSON 数组。`,
        },
        {
          name: "characterization_structured_extraction",
          title: "表征结构化信息提取",
          category: "extraction",
          content: `你是一个专业的材料科学文献分析助手。请从给定的文献内容中提取表征的结构化信息。

请提取以下信息：
1. 表征技术名称
2. 测试条件（温度、气氛、扫描范围等）
3. 测试结果（峰值、形貌描述、比表面积等）
4. 数据解读
5. 对应的材料或工艺

请用中文回答，输出格式为 JSON 数组。`,
        },
      ];

      // 写入预设提示词文件
      for (const preset of presetFiles) {
        const filePath = path.join(PRESET_PROMPTS_DIR, `${preset.name}.txt`);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, preset.content, "utf-8");
        }

        // 检查数据库中是否已存在
        const existing = await PromptTemplate.getByName(preset.name);
        if (!existing) {
          await PromptTemplate.create(preset);
        }
      }

      console.log("预设提示词初始化完成");
      return true;
    } catch (error) {
      console.error("初始化预设提示词失败:", error);
      return false;
    }
  },

  /**
   * 获取提示词内容
   * @param {string} promptId - 提示词ID或名称
   * @returns {Promise<string|null>}
   */
  async getPromptContent(promptId) {
    try {
      // 先尝试从数据库获取
      const template = await PromptTemplate.getById(parseInt(promptId));
      if (template) {
        return template.content;
      }

      // 再尝试按名称获取
      const byName = await PromptTemplate.getByName(promptId);
      if (byName) {
        return byName.content;
      }

      // 最后尝试从文件系统获取预设提示词
      const filePath = path.join(PRESET_PROMPTS_DIR, `${promptId}.txt`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf-8");
      }

      return null;
    } catch (error) {
      console.error("获取提示词内容失败:", error);
      return null;
    }
  },

  /**
   * 获取所有可用的提示词
   * @returns {Promise<Array>}
   */
  async getAllPrompts() {
    try {
      // 获取数据库中的提示词
      const dbTemplates = await PromptTemplate.getActive();

      // 获取预设提示词文件
      const presetPrompts = [];
      if (fs.existsSync(PRESET_PROMPTS_DIR)) {
        const files = fs.readdirSync(PRESET_PROMPTS_DIR).filter((f) => f.endsWith(".txt"));
        for (const file of files) {
          const name = file.replace(".txt", "");
          // 检查是否已在数据库中
          const exists = dbTemplates.some((t) => t.name === name);
          if (!exists) {
            const content = fs.readFileSync(path.join(PRESET_PROMPTS_DIR, file), "utf-8");
            presetPrompts.push({
              id: `preset_${name}`,
              name,
              title: name.replace(/_/g, " "),
              content,
              category: "extraction",
              source: "preset",
            });
          }
        }
      }

      return [...dbTemplates, ...presetPrompts];
    } catch (error) {
      console.error("获取提示词列表失败:", error);
      return [];
    }
  },

  /**
   * 构建完整的提示词
   * @param {string} promptId - 提示词ID
   * @param {string} content - 文献内容
   * @param {Object} context - 上下文信息
   * @returns {Promise<string>}
   */
  async buildPrompt(promptId, content, context = {}) {
    const basePrompt = await this.getPromptContent(promptId);
    if (!basePrompt) {
      throw new Error(`提示词 ${promptId} 不存在`);
    }

    let fullPrompt = basePrompt;

    // 添加上下文信息
    if (context.articleTitle) {
      fullPrompt = `文献标题: ${context.articleTitle}\n\n${fullPrompt}`;
    }

    // 添加文献内容
    fullPrompt += `\n\n--- 文献内容 ---\n${content}\n--- 文献内容结束 ---`;

    return fullPrompt;
  },
};

module.exports = {
  PromptService,
};