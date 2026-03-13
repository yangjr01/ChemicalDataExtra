const { ExtractionTask, Article, PromptTemplate } = require("../../models/chemical");
const { PromptService } = require("./promptService");

/**
 * 提取服务
 */
const ExtractionService = {
  /**
   * 执行提取任务
   * @param {number} taskId - 任务 ID
   * @param {string} content - 文献内容
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async executeExtraction(taskId, content, options = {}) {
    try {
      // 获取任务
      const task = await ExtractionTask.getById(taskId);
      if (!task) {
        throw new Error("任务不存在");
      }

      // 获取提示词模板
      const prompt = await PromptService.getPromptContent(task.promptId);
      if (!prompt) {
        throw new Error("提示词不存在");
      }

      // 构建完整提示词 - 使用传入的 content 参数
      const fullPrompt = `${prompt}\n\n请从以下文献中提取信息：\n\n${content}`;

      // 更新状态为运行中
      await ExtractionTask.updateStatus(taskId, "running");

      // 记录用户消息
      await ExtractionTask.addConversation(taskId, {
        role: "user",
        content: fullPrompt,
        tokens: 0,
      });

      // 调用 LLM
      const response = await this.callLLM(fullPrompt, options);

      // 记录助手响应
      await ExtractionTask.addConversation(taskId, {
        role: "assistant",
        content: response.content,
        tokens: response.outputTokens || 0,
      });

      // 解析结果
      const parsedData = this.parseResponse(response.content);

      console.log(`[ExtractionTask ${taskId}] 解析结果:`, JSON.stringify(parsedData).substring(0, 200) + '...');

      // 更新任务状态
      await ExtractionTask.update(taskId, {
        rawResponse: response.content,
        parsedData: parsedData,  // 直接传入对象，update 方法会处理 JSON.stringify
        inputTokens: response.inputTokens || 0,
        outputTokens: response.outputTokens || 0,
        status: "completed",
        completedAt: new Date(),
      });

      console.log(`[ExtractionTask ${taskId}] 任务已更新`);

      // 注意：不再自动保存到数据库，让用户手动点击"保存到数据库"按钮
      // 这样可以给用户审查和编辑数据的机会
      console.log(`[ExtractionTask ${taskId}] 等待用户手动保存到数据库`);

      return {
        success: true,
        data: parsedData,
        rawResponse: response.content,
      };
    } catch (error) {
      console.error("执行提取任务失败:", error);

      // 更新任务失败状态
      await ExtractionTask.updateStatus(taskId, "failed", {
        errorMessage: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * 调用 LLM
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async callLLM(prompt, options = {}) {
    try {
      const provider = process.env.LLM_PROVIDER;
      let client;

      // 根据 LLM 提供商选择客户端
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
        { role: "system", content: "你是一个专业的材料科学文献分析助手。" },
        { role: "user", content: prompt },
      ];

      const result = await client.getChatCompletion(messages, {
        temperature: options.temperature || 0.1,
        maxTokens: options.maxTokens || 8000,
      });

      if (!result || !result.textResponse) {
        throw new Error("LLM 返回为空");
      }

      return {
        content: result.textResponse,
        inputTokens: result.metrics?.prompt_tokens || 0,
        outputTokens: result.metrics?.completion_tokens || 0,
      };
    } catch (error) {
      console.error("调用 LLM 失败:", error);
      throw new Error(`LLM 调用失败：${error.message}`);
    }
  },

  /**
   * 解析 LLM 响应
   * @param {string} content - 响应内容
   * @returns {Object|Array|null}
   */
  parseResponse(content) {
    try {
      // 1. 尝试提取 ```json 代码块
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1].trim();
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.log('JSON 代码块解析失败，尝试修复...');
          const repaired = this.tryRepairJSON(jsonStr);
          if (repaired) return repaired;
        }
      }

      // 2. 尝试提取 JSON 数组或对象
      const jsonBlockMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonBlockMatch) {
        const jsonStr = jsonBlockMatch[0].trim();
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.log('JSON 块解析失败，尝试修复...');
          const repaired = this.tryRepairJSON(jsonStr);
          if (repaired) return repaired;
        }
      }

      // 3. 如果无法解析，返回原始内容
      return { raw: content };
    } catch (error) {
      console.error("解析响应失败:", error);
      return { raw: content, parseError: error.message };
    }
  },

  /**
   * 尝试修复不完整的 JSON
   * @param {string} jsonStr - JSON 字符串
   * @returns {Object|Array|null}
   */
  tryRepairJSON(jsonStr) {
    try {
      // 尝试 1: 移除最后一个不完整的字段
      let cleaned = jsonStr.trim();
      
      // 处理被截断的字符串值
      const lastQuoteIndex = cleaned.lastIndexOf('"');
      const lastColonIndex = cleaned.lastIndexOf(':');
      
      if (lastQuoteIndex > lastColonIndex && cleaned.endsWith('"')) {
        // 字符串值被截断，尝试找到前一个完整的键值对
        const prevCommaIndex = cleaned.slice(0, lastQuoteIndex).lastIndexOf(',');
        if (prevCommaIndex > lastColonIndex) {
          cleaned = cleaned.slice(0, prevCommaIndex);
        }
      }
      
      // 处理被截断的数组或对象
      const openBraces = (cleaned.match(/\{/g) || []).length;
      const closeBraces = (cleaned.match(/\}/g) || []).length;
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      
      // 补充缺少的闭合括号
      while (openBraces > closeBraces) {
        cleaned = cleaned.trimEnd();
        if (!cleaned.endsWith(',') && !cleaned.endsWith('}')) {
          cleaned += ',';
        }
        cleaned += '}';
        closeBraces++;
      }
      
      while (openBrackets > closeBrackets) {
        cleaned = cleaned.trimEnd();
        if (!cleaned.endsWith(',') && !cleaned.endsWith(']')) {
          cleaned += ',';
        }
        cleaned += ']';
        closeBrackets++;
      }
      
      // 移除末尾多余的逗号
      cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');
      
      console.log('尝试修复后的 JSON:', cleaned.substring(0, 200) + '...');
      return JSON.parse(cleaned);
    } catch (e) {
      console.log('JSON 修复失败:', e.message);
      return null;
    }
  },

  /**
   * 批量提取
   * @param {number} articleId - 文献 ID
   * @param {Array<string>} promptIds - 提示词 ID 列表
   * @param {string} content - 文献内容
   * @returns {Promise<Object>}
   */
  async batchExtraction(articleId, promptIds, content) {
    const results = [];

    for (const promptId of promptIds) {
      // 创建任务
      const prompt = await PromptTemplate.getById(parseInt(promptId)) ||
        await PromptTemplate.getByName(promptId);

      if (!prompt) {
        results.push({
          promptId,
          success: false,
          error: "提示词不存在",
        });
        continue;
      }

      const task = await ExtractionTask.create({
        articleId,
        promptId: prompt.id?.toString() || promptId,
        promptName: prompt.name,
      });

      // 执行提取
      const result = await this.executeExtraction(task.id, content);

      results.push({
        promptId,
        promptName: prompt.name,
        taskId: task.id,
        ...result,
      });
    }

    return {
      success: true,
      results,
    };
  },

  /**
   * 人工校对保存
   * @param {number} taskId - 任务 ID
   * @param {Object} correctedData - 校对后的数据
   * @returns {Promise<Object>}
   */
  async saveCorrectedData(taskId, correctedData) {
    try {
      const task = await ExtractionTask.getById(taskId);
      if (!task) {
        throw new Error("任务不存在");
      }

      // 更新任务
      await ExtractionTask.update(taskId, {
        parsedData: correctedData,
      });

      // 根据提示词类型，将数据保存到相应的表中
      await this.saveToDatabase(task.articleId, task.promptName, correctedData);

      return {
        success: true,
        message: "数据保存成功",
      };
    } catch (error) {
      console.error("保存校对数据失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * 使用 LLM 将提取的数据转换为数据库格式并保存
   * @param {number} articleId - 文献 ID
   * @param {string} promptName - 提示词名称
   * @param {Object} extractedData - 提取的原始数据
   * @param {string} rawResponse - LLM 原始响应
   * @returns {Promise<Object>}
   */
  async saveToDatabaseWithLLM(articleId, promptName, extractedData, rawResponse) {
    const { Material, Process, Characterization } = require("../../models/chemical");
    
    console.log(`[saveToDatabaseWithLLM] 开始转换并保存数据，promptName=${promptName}`);
    
    // 构建转换提示词
    const transformPrompt = this.buildTransformPrompt(promptName, extractedData, rawResponse);
    
    try {
      // 调用 LLM 转换数据格式
      const transformResult = await this.callLLM(transformPrompt, { temperature: 0.1 });
      const transformedData = this.parseResponse(transformResult.content);
      
      console.log(`[saveToDatabaseWithLLM] LLM 转换后的数据:`, JSON.stringify(transformedData).substring(0, 300) + '...');
      
      // 根据数据类型保存到相应表
      if (promptName.includes("material")) {
        await this.saveMaterialsToDB(articleId, transformedData);
      }
      
      if (promptName.includes("process")) {
        await this.saveProcessesToDB(articleId, transformedData);
      }
      
      if (promptName.includes("characterization")) {
        await this.saveCharacterizationsToDB(articleId, transformedData);
      }
      
      console.log('[saveToDatabaseWithLLM] 数据保存完成');
      return { success: true };
    } catch (error) {
      console.error(`[saveToDatabaseWithLLM] 转换或保存失败:`, error.message);
      // 如果 LLM 转换失败，尝试直接保存
      console.log('[saveToDatabaseWithLLM] 尝试使用备用方案直接保存...');
      return await this.saveToDatabase(articleId, promptName, extractedData);
    }
  },
  
  /**
   * 构建数据转换提示词
   */
  buildTransformPrompt(promptName, extractedData, rawResponse) {
    let prompt = `你是一个专业的材料科学数据结构化助手。请将以下提取的数据转换为标准的数据库格式。

---

## 任务说明
请分析以下从材料科学文献中提取的数据，并将其转换为规范的 JSON 格式以便存入数据库。

## 输出格式要求
`;

    if (promptName.includes("material")) {
      prompt += `请输出材料数据数组，每个材料包含以下字段：
- name: 材料名称（必填）
- formula: 化学式/分子式（可选）
- composition: 组成成分（对象或 null）
- properties: 性能属性（对象或 null）

示例格式：
[
  {
    "name": "材料名称",
    "formula": "化学式",
    "composition": {"key": "value"},
    "properties": {"key": "value"}
  }
]

只返回 JSON 数组，不要其他说明文字。`;
    } else if (promptName.includes("process")) {
      prompt += `请输出工艺步骤数组，每个步骤包含以下字段：
- name: 工艺名称（必填）
- description: 步骤描述（可选）
- sequence: 步骤序号（从 1 开始）
- conditions: 工艺条件（对象或 null）
- parameters: 参数数组（可选）

示例格式：
[
  {
    "name": "工艺名称",
    "description": "详细描述",
    "sequence": 1,
    "conditions": {"temperature": "80°C"},
    "parameters": [{"name": "时间", "value": "2", "unit": "h"}]
  }
]

只返回 JSON 数组，不要其他说明文字。`;
    } else if (promptName.includes("characterization")) {
      prompt += `请输出表征数据数组，每个表征包含以下字段：
- technique: 表征技术名称（必填）
- conditions: 测试条件（对象或 null）
- results: 测试结果（对象或 null）

示例格式：
[
  {
    "technique": "XRD",
    "conditions": {"temperature": "室温"},
    "results": {"peakPosition": "26.5°"}
  }
]

只返回 JSON 数组，不要其他说明文字。`;
    }

    prompt += `

## 待转换的原始数据
${JSON.stringify(extractedData, null, 2)}

## LLM 原始响应（供参考）
${rawResponse.substring(0, 2000)}

---

请只返回标准 JSON 格式，不要任何其他文字：`;

    return prompt;
  },
  
  /**
   * 保存材料数据到数据库
   */
  async saveMaterialsToDB(articleId, data) {
    const { Material } = require("../../models/chemical");
    
    console.log('[saveMaterialsToDB] 开始保存材料数据...');
    
    const materials = Array.isArray(data) ? data : [data];
    
    for (const item of materials) {
      if (!item || (!item.name && !item.materialName)) {
        console.log('[saveMaterialsToDB] 跳过无效材料数据:', item);
        continue;
      }
      
      try {
        await Material.create({
          articleId,
          name: item.name || item.materialName || "未知材料",
          formula: item.formula || null,
          composition: item.composition || null,
          properties: item.properties || null,
        });
        console.log(`[saveMaterialsToDB] 已保存材料：${item.name || item.materialName}`);
      } catch (error) {
        console.error('[saveMaterialsToDB] 保存材料失败:', error.message, item);
      }
    }
  },
  
  /**
   * 保存工艺数据到数据库
   */
  async saveProcessesToDB(articleId, data) {
    const { Process } = require("../../models/chemical");
    
    console.log('[saveProcessesToDB] 开始保存工艺数据...');
    
    // 处理不同格式的数据
    let processes = [];
    
    if (Array.isArray(data)) {
      processes = data;
    } else if (data.processSteps && Array.isArray(data.processSteps)) {
      processes = data.processSteps;
    } else if (data.steps && Array.isArray(data.steps)) {
      processes = data.steps;
    }
    
    for (let i = 0; i < processes.length; i++) {
      const item = processes[i];
      if (!item || (!item.name && !item.processName)) {
        console.log('[saveProcessesToDB] 跳过无效工艺数据:', item);
        continue;
      }
      
      try {
        await Process.create({
          articleId,
          name: item.name || item.processName || `工艺步骤 ${i + 1}`,
          description: item.description || null,
          sequence: item.sequence || i + 1,
          conditions: item.conditions || null,
          parameters: item.parameters || [],
        });
        console.log(`[saveProcessesToDB] 已保存工艺：${item.name || item.processName}`);
      } catch (error) {
        console.error('[saveProcessesToDB] 保存工艺失败:', error.message, item);
      }
    }
  },
  
  /**
   * 保存表征数据到数据库
   */
  async saveCharacterizationsToDB(articleId, data) {
    const { Characterization } = require("../../models/chemical");
    
    console.log('[saveCharacterizationsToDB] 开始保存表征数据...');
    
    const chars = Array.isArray(data) ? data : [data];
    
    for (const item of chars) {
      if (!item || (!item.technique && !item.name)) {
        console.log('[saveCharacterizationsToDB] 跳过无效表征数据:', item);
        continue;
      }
      
      try {
        await Characterization.create({
          articleId,
          technique: item.technique || item.name || "未知技术",
          conditions: item.conditions || null,
          results: item.results || null,
        });
        console.log(`[saveCharacterizationsToDB] 已保存表征：${item.technique || item.name}`);
      } catch (error) {
        console.error('[saveCharacterizationsToDB] 保存表征失败:', error.message, item);
      }
    }
  },

  /**
   * 保存数据到数据库（备用方案）
   * @param {number} articleId - 文献 ID
   * @param {string} promptName - 提示词名称
   * @param {Object} data - 数据
   */
  async saveToDatabase(articleId, promptName, data) {
    const { Material, Process, Characterization } = require("../../models/chemical");

    console.log(`[saveToDatabase] articleId=${articleId}, promptName=${promptName}, dataType=${typeof data}`);

    // 根据提示词名称判断数据类型
    if (promptName.includes("material")) {
      // 保存材料数据
      console.log('[saveToDatabase] 保存材料数据...');
      if (Array.isArray(data)) {
        for (const item of data) {
          await Material.create({
            articleId,
            name: item.name || item.materialName || "未知材料",
            formula: item.formula || null,
            composition: item.composition || null,
            properties: item.properties || null,
          });
        }
      } else if (data.name || data.materialName) {
        await Material.create({
          articleId,
          name: data.name || data.materialName,
          formula: data.formula || null,
          composition: data.composition || null,
          properties: data.properties || null,
        });
      }
    }

    if (promptName.includes("process")) {
      // 保存工艺数据
      console.log('[saveToDatabase] 保存工艺数据...');
      if (Array.isArray(data)) {
        // 如果是数组，直接保存
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          await Process.create({
            articleId,
            name: item.name || item.processName || `工艺步骤 ${i + 1}`,
            description: item.description || null,
            sequence: i + 1,
            conditions: item.conditions || null,
            parameters: item.parameters || [],
          });
        }
      } else if (data.processSteps && Array.isArray(data.processSteps)) {
        // 如果是工艺流程预提取的格式
        for (let i = 0; i < data.processSteps.length; i++) {
          const step = data.processSteps[i];
          await Process.create({
            articleId,
            name: step.name || `工艺步骤 ${i + 1}`,
            description: step.description || null,
            sequence: i + 1,
            conditions: step.conditions || null,
            parameters: step.parameters || [],
          });
        }
      }
    }

    if (promptName.includes("characterization")) {
      // 保存表征数据
      console.log('[saveToDatabase] 保存表征数据...');
      if (Array.isArray(data)) {
        for (const item of data) {
          await Characterization.create({
            articleId,
            technique: item.technique || item.name || "未知技术",
            conditions: item.conditions || null,
            results: item.results || null,
          });
        }
      }
    }

    console.log('[saveToDatabase] 数据保存完成');
  },
};

module.exports = {
  ExtractionService,
};
