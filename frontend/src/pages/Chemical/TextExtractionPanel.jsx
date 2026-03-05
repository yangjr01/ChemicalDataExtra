import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Storage as DatabaseIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useChemicalExtraction } from './ChemicalExtractionContext';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

// 预定义的提取步骤
const EXTRACTION_STEPS = [
  {
    id: 'process_flow_pre_extraction',
    name: '工艺流程预提取',
    description: '识别文献中的主要工艺步骤',
  },
  {
    id: 'material_structured_extraction',
    name: '材料信息提取',
    description: '提取材料的组成和性质信息',
  },
  {
    id: 'process_structured_extraction',
    name: '工艺参数提取',
    description: '提取详细的工艺参数',
  },
  {
    id: 'characterization_pre_extraction',
    name: '表征信息预提取',
    description: '识别使用的表征技术',
  },
  {
    id: 'characterization_structured_extraction',
    name: '表征数据提取',
    description: '提取表征测试条件和结果',
  },
];

const TextExtractionPanel = () => {
  const {
    article,
    textExtractionResult,
    updateTextExtractionResult,
    saveTextExtractionToDB,
    savedData,
  } = useChemicalExtraction();

  // 当前选中的提取步骤
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = EXTRACTION_STEPS[currentStepIndex];

  // 提示词列表
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  // 提取状态
  const [extracting, setExtracting] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [savingToDB, setSavingToDB] = useState(false);
  const [savedToDB, setSavedToDB] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingData, setEditingData] = useState(null);

  // 提取结果
  const [extractionResults, setExtractionResults] = useState({});

  // 获取提示词列表
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/prompts/list`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setPrompts(data.data);
      }
    } catch (error) {
      console.error('获取提示词列表失败:', error);
    }
  };

  // 开始提取
  const startExtraction = async (promptId, force = false) => {
    setExtracting(true);
    setChatHistory([]);
    setSavingToDB(false);
    setSavedToDB(false);

    try {
      const response = await fetch(`${API_BASE}/extraction/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          articleId: parseInt(article.id),
          promptId,
          force,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 如果是缓存结果，直接显示
        if (data.cached) {
          setCurrentTask(data.data);
          setChatHistory([
            {
              role: 'system',
              content: `使用缓存的提取结果（${currentStep.name}）`,
            },
          ]);
          // 解析并显示缓存结果
          try {
            const parsedData = data.data.parsedData
              ? (typeof data.data.parsedData === 'string'
                  ? JSON.parse(data.data.parsedData)
                  : data.data.parsedData)
              : null;
            if (parsedData) {
              setExtractionResults((prev) => ({
                ...prev,
                [currentStepIndex]: parsedData,
              }));
            }
          } catch (e) {
            console.log('解析缓存结果失败:', e);
          }
          setExtracting(false);
          return;
        }

        // 新任务，开始轮询
        setCurrentTask(data.data);
        setChatHistory([
          {
            role: 'system',
            content: `正在使用 ${currentStep.name} 进行提取...`,
          },
        ]);

        // 开始轮询任务状态
        pollTaskStatus(data.data.id);
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'system',
            content: `启动失败：${data.error || '未知错误'}`,
          },
        ]);
        setExtracting(false);
      }
    } catch (error) {
      console.error('启动提取失败:', error);
      setExtracting(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setExtracting(false);
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'system',
            content: '轮询超时，请稍后查看任务状态。',
          },
        ]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/extraction/task/${taskId}`, {
          headers: baseHeaders(),
        });
        const data = await response.json();

        if (data.success && data.data.conversations) {
          // 更新聊天记录
          const conversations = data.data.conversations;
          setChatHistory(
            conversations.map((conv) => ({
              role: conv.role,
              content: conv.content,
            }))
          );

          // 检查任务状态
          if (data.data.status === 'completed') {
            setExtracting(false);
            // 解析提取结果
            try {
              const parsedData = data.data.parsedData
                ? (typeof data.data.parsedData === 'string'
                    ? JSON.parse(data.data.parsedData)
                    : data.data.parsedData)
                : null;
              if (parsedData) {
                setExtractionResults((prev) => ({
                  ...prev,
                  [currentStepIndex]: parsedData,
                }));
              }
            } catch (e) {
              console.log('解析结果失败:', e);
            }
            return;
          } else if (data.data.status === 'failed') {
            setExtracting(false);
            setChatHistory((prev) => [
              ...prev,
              {
                role: 'system',
                content: `提取失败：${data.data.errorMessage || '未知错误'}`,
              },
            ]);
            return;
          }
        }

        // 继续轮询
        setTimeout(poll, 2000);
      } catch (error) {
        console.error('轮询失败:', error);
        setExtracting(false);
      }
    };

    poll();
  };

  // 发送消息
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentTask) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${API_BASE}/extraction/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          taskId: currentTask.id,
          message: userMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '正在处理您的请求...',
          },
        ]);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 保存结果
  const saveResult = async (taskId, parsedData) => {
    try {
      const response = await fetch(`${API_BASE}/extraction/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          taskId,
          parsedData,
          rawResponse: JSON.stringify(parsedData),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setExtractionResults((prev) => ({
          ...prev,
          [currentStepIndex]: parsedData,
        }));

        // 更新到 Context
        updateExtractionContext(parsedData);

        setCurrentTask(null);
        // 自动进入下一步
        if (currentStepIndex < EXTRACTION_STEPS.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }
    } catch (error) {
      console.error('保存结果失败:', error);
    }
  };

  // 更新 Context 中的提取结果
  const updateExtractionContext = (parsedData) => {
    const updateData = {};

    // 根据当前步骤类型更新相应的数据
    if (currentStep.id.includes('material')) {
      const materials = Array.isArray(parsedData) ? parsedData : [parsedData];
      updateData.materials = materials.filter((m) => m && (m.name || m.materialName));
    }

    if (currentStep.id.includes('process')) {
      let processes = [];
      if (Array.isArray(parsedData)) {
        processes = parsedData;
      } else if (parsedData.processSteps) {
        processes = parsedData.processSteps;
      }
      updateData.processes = processes.filter((p) => p && (p.name || p.processName));
    }

    if (currentStep.id.includes('characterization')) {
      const characterizations = Array.isArray(parsedData) ? parsedData : [parsedData];
      updateData.characterizations = characterizations.filter(
        (c) => c && (c.technique || c.name)
      );
    }

    // 图表信息（如果有）
    if (parsedData.charts || parsedData.figures) {
      const charts = parsedData.charts || parsedData.figures || [];
      updateData.charts = Array.isArray(charts) ? charts : [charts];
    }

    updateTextExtractionResult(updateData);
  };

  // 保存到数据库
  const handleSaveToDB = async () => {
    const currentResult = extractionResults[currentStepIndex];
    if (!currentResult || !currentTask) return;

    setSavingToDB(true);
    try {
      const response = await fetch(
        `${API_BASE}/extraction/save-to-db/${currentTask.id}`,
        {
          method: 'POST',
          headers: baseHeaders(),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSavedToDB(true);
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'system',
            content: '✅ 数据已成功保存到数据库！',
          },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'system',
            content: `❌ 保存失败：${data.error || '未知错误'}`,
          },
        ]);
      }
    } catch (error) {
      console.error('保存到数据库失败:', error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'system',
          content: `❌ 保存失败：${error.message}`,
        },
      ]);
    } finally {
      setSavingToDB(false);
    }
  };

  // 跳过当前步骤
  const skipStep = () => {
    if (currentStepIndex < EXTRACTION_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // 上一步
  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* 步骤选择器 */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
          >
            上一步
          </Button>

          <Select
            value={currentStepIndex}
            onChange={(e) => setCurrentStepIndex(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            {EXTRACTION_STEPS.map((step, index) => (
              <MenuItem key={step.id} value={index}>
                {step.name}
              </MenuItem>
            ))}
          </Select>

          <Button
            size="small"
            onClick={skipStep}
            disabled={currentStepIndex === EXTRACTION_STEPS.length - 1}
          >
            跳过
          </Button>

          {extractionResults[currentStepIndex] && (
            <Chip
              label="已完成"
              color="success"
              size="small"
              icon={<CheckIcon />}
            />
          )}
        </Box>

        {/* 步骤描述 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {currentStep.description}
        </Typography>

        {/* 提取状态指示器 */}
        {extracting && (
          <Card sx={{ mb: 2, bgcolor: 'info.lighter' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="subtitle2">正在提取中...</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                正在使用 {currentStep.name} 进行提取
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* 提取结果预览 */}
        {extractionResults[currentStepIndex] && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">提取结果</Typography>
                  <Chip label="已缓存" color="success" size="small" />
                  {savedToDB && (
                    <Chip
                      label="已保存到数据库"
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!savedToDB && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DatabaseIcon />}
                      onClick={handleSaveToDB}
                      disabled={savingToDB}
                    >
                      {savingToDB ? '保存中...' : '保存到数据库'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() =>
                      startExtraction(currentStep.id, true)
                    }
                    disabled={extracting}
                  >
                    重新提取
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setEditingData(extractionResults[currentStepIndex]);
                      setEditDialog(true);
                    }}
                  >
                    编辑
                  </Button>
                </Box>
              </Box>
              <Paper
                variant="outlined"
                sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50' }}
              >
                <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(extractionResults[currentStepIndex], null, 2)}
                </pre>
              </Paper>
            </CardContent>
          </Card>
        )}

        {/* 对话历史 */}
        {chatHistory.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {extracting ? '提取过程' : '对话记录'}
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                mb: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {chatHistory.map((msg, index) => (
                <Paper
                  key={index}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor:
                      msg.role === 'system'
                        ? 'info.lighter'
                        : msg.role === 'user'
                        ? 'action.hover'
                        : 'background.default',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mb: 0.5,
                      fontWeight: msg.role === 'system' ? 'bold' : 'normal',
                    }}
                  >
                    {msg.role === 'system'
                      ? '系统'
                      : msg.role === 'user'
                      ? '用户'
                      : '助手'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: msg.role === 'system' ? 'monospace' : 'inherit',
                      fontSize: msg.role === 'system' ? '0.8rem' : 'inherit',
                    }}
                  >
                    {msg.content}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* 输入框 */}
            {!extracting && currentTask && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="输入消息..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={sendMessage}
                >
                  <SendIcon />
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* 自定义提取 */}
        {!currentTask && !extractionResults[currentStepIndex] && (
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                自定义提取
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>选择提示词模板</InputLabel>
                <Select
                  value={selectedPrompt}
                  label="选择提示词模板"
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                >
                  <MenuItem value="">使用默认</MenuItem>
                  {prompts.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() =>
                  startExtraction(selectedPrompt || currentStep.id)
                }
              >
                开始提取
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default TextExtractionPanel;
