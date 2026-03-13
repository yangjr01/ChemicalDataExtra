import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

// 提取步骤
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

const ExtractionFlow = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [results, setResults] = useState({});
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [savingToDB, setSavingToDB] = useState(false);
  const [savedToDB, setSavedToDB] = useState(false);

  // 获取文献详情
  const fetchArticle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/literature/${articleId}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setArticle(data.data);
      }
    } catch (error) {
      console.error('获取文献详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取提示词列表
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

  useEffect(() => {
    fetchArticle();
    fetchPrompts();
  }, [articleId]);

  // 开始提取
  const startExtraction = async (promptId, force = false) => {
    setExtracting(true);
    setChatHistory([]);
    setResults({});
    try {
      const response = await fetch(`${API_BASE}/extraction/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          articleId: parseInt(articleId),
          promptId,
          force,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 如果是缓存结果，直接显示
        if (data.cached) {
          // 不设置 currentTask，直接显示结果
          setCurrentTask(null);
          setChatHistory([]);
          // 解析并显示缓存结果
          try {
            const parsedData = data.data.parsedData
              ? (typeof data.data.parsedData === 'string' ? JSON.parse(data.data.parsedData) : data.data.parsedData)
              : null;
            if (parsedData) {
              setResults((prev) => ({
                ...prev,
                [activeStep]: parsedData,
              }));
              setChatHistory([
                {
                  role: 'system',
                  content: `✅ 数据已成功保存到数据库！`,
                },
              ]);
              setSavedToDB(true);
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
            content: `正在使用 ${EXTRACTION_STEPS[activeStep].name} 进行提取...`,
          },
        ]);

        // 开始轮询任务状态
        pollTaskStatus(data.data.id);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: 'system', content: `启动失败：${data.error || '未知错误'}` },
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
    const maxAttempts = 60; // 最多轮询 60 次
    let attempts = 0;

    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setExtracting(false);
        setChatHistory((prev) => [
          ...prev,
          { role: 'system', content: '轮询超时，请稍后查看任务状态。' },
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
                ? (typeof data.data.parsedData === 'string' ? JSON.parse(data.data.parsedData) : data.data.parsedData)
                : null;
              if (parsedData) {
                setResults((prev) => ({
                  ...prev,
                  [activeStep]: parsedData,
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
              { role: 'system', content: `提取失败：${data.data.errorMessage || '未知错误'}` },
            ]);
            return;
          }
        }

        // 继续轮询
        setTimeout(poll, 2000); // 每 2 秒轮询一次
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
        // 这里应该通过 WebSocket 或轮询获取响应
        // 简化处理，直接显示处理中状态
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
        setResults((prev) => ({
          ...prev,
          [activeStep]: parsedData,
        }));
        setActiveStep((prev) => prev + 1);
        setCurrentTask(null);
      }
    } catch (error) {
      console.error('保存结果失败:', error);
    }
  };

  // 保存到数据库
  const saveToDatabase = async () => {
    if (!currentTask) return;
    
    setSavingToDB(true);
    try {
      const response = await fetch(`${API_BASE}/extraction/save-to-db/${currentTask.id}`, {
        method: 'POST',
        headers: baseHeaders(),
      });
      
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
    setActiveStep((prev) => prev + 1);
    setCurrentTask(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 标题区域 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          数据提取流程
        </Typography>
        {article && (
          <Typography variant="body2" color="text.secondary">
            文献：{article.title}
          </Typography>
        )}
      </Box>

      {/* 加载状态 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 提取步骤 */}
      {!loading && (
        <Grid container spacing={3}>
          {/* 顶部：进度条 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">提取进度</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activeStep} / {EXTRACTION_STEPS.length}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(activeStep / EXTRACTION_STEPS.length) * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                
                {/* 步骤标签 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  {EXTRACTION_STEPS.map((step, index) => (
                    <Box
                      key={step.id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        position: 'relative',
                      }}
                    >
                      <CheckCircleIcon
                        color={index < activeStep ? 'success' : index === activeStep ? 'primary' : 'disabled'}
                        sx={{ fontSize: index === activeStep ? 40 : 30 }}
                      />
                      <Typography
                        variant="caption"
                        color={index === activeStep ? 'primary' : index < activeStep ? 'success.main' : 'text.secondary'}
                        sx={{ mt: 0.5, textAlign: 'center', maxWidth: 80 }}
                      >
                        {step.name}
                      </Typography>
                      {index < activeStep && (
                        <Chip label="完成" size="small" color="success" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 交互区域 */}
          <Grid item xs={12}>
            {/* 提取状态指示器 */}
            {extracting && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography variant="h6">正在提取中...</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    正在使用 {EXTRACTION_STEPS[activeStep]?.name} 进行提取
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* 提取结果预览 */}
            {results[activeStep] && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">提取结果</Typography>
                      <Chip label="已缓存" color="success" size="small" />
                      {savedToDB && <Chip label="已保存到数据库" color="primary" size="small" />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!savedToDB && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<StorageIcon />}
                          onClick={saveToDatabase}
                          disabled={savingToDB}
                        >
                          {savingToDB ? '保存中...' : '保存到数据库'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          startExtraction(EXTRACTION_STEPS[activeStep].id, true);
                        }}
                        disabled={extracting}
                      >
                        重新提取
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setEditingData(results[activeStep]);
                          setEditDialog(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => {
                          setActiveStep((prev) => prev + 1);
                          setCurrentTask(null);
                          setSavedToDB(false);
                        }}
                      >
                        下一步
                      </Button>
                    </Box>
                  </Box>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(results[activeStep], null, 2)}
                    </pre>
                  </Paper>
                </CardContent>
              </Card>
            )}

            {/* 聊天交互区域 - 只在提取进行时显示 */}
            {currentTask && !results[activeStep] && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">提取会话</Typography>
                    <Typography variant="body2" color="text.secondary">
                      任务 ID: {currentTask.id} | 状态：{currentTask.status}
                    </Typography>
                  </Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      maxHeight: 400,
                      overflow: 'auto',
                      bgcolor: 'grey.50',
                    }}
                  >
                    {chatHistory.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        正在等待响应...
                      </Typography>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 1,
                            bgcolor:
                              msg.role === 'user' ? 'primary.light' : msg.role === 'system' ? 'warning.light' : 'grey.200',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {msg.role === 'user' ? '用户' : msg.role === 'system' ? '系统' : 'AI'}
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                            {msg.content}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Paper>
                  {!['completed', 'failed'].includes(currentTask?.status) && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="输入额外指令..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button variant="contained" onClick={sendMessage}>
                        发送
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 自定义提示词选择 - 始终显示 */}
            {!currentTask && !results[activeStep] && activeStep < EXTRACTION_STEPS.length && (
              <Card>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {EXTRACTION_STEPS[activeStep].name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {EXTRACTION_STEPS[activeStep].description}
                    </Typography>
                  </Box>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    请选择提示词模板或输入自定义提示词开始提取
                  </Alert>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>选择提示词模板</InputLabel>
                    <Select
                      value={selectedPrompt}
                      label="选择提示词模板"
                      onChange={(e) => setSelectedPrompt(e.target.value)}
                    >
                      <MenuItem value="">使用默认提示词</MenuItem>
                      {prompts.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="自定义提示词（可选，留空使用模板）"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayIcon />}
                      onClick={() =>
                        startExtraction(selectedPrompt || EXTRACTION_STEPS[activeStep].id)
                      }
                      disabled={extracting}
                    >
                      开始提取
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={skipStep}
                      disabled={extracting}
                    >
                      跳过此步骤
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 所有步骤完成 */}
            {activeStep === EXTRACTION_STEPS.length && (
              <Card>
                <CardContent>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      🎉 所有提取步骤已完成！
                    </Typography>
                    <Typography variant="body2">
                      所有 5 个模块的提取都已完成，您可以查看提取的数据或保存结果。
                    </Typography>
                  </Alert>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate(`/chemical/data/${articleId}`)}
                  >
                    查看提取的数据
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setActiveStep(0)}
                    sx={{ ml: 1 }}
                  >
                    重新开始
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* 编辑对话框 */}
      <Dialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑提取数据</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={JSON.stringify(editingData, null, 2)}
            onChange={(e) => {
              try {
                setEditingData(JSON.parse(e.target.value));
              } catch (err) {
                // 忽略解析错误
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={() => {
              saveResult(currentTask?.id, editingData);
              setEditDialog(false);
            }}
          >
            保存并进入下一步
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExtractionFlow;