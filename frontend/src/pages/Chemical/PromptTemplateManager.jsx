import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Paper,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ToggleOn as ActiveIcon,
  ToggleOff as InactiveIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical/prompts';

// 预设提示词文件内容（用于快速创建）
const PRESET_TEMPLATES = [
  {
    name: 'material_structured_extraction',
    title: '材料结构化提取',
    category: 'extraction',
    description: '从文献中提取材料的结构化信息',
  },
  {
    name: 'process_structured_extraction',
    title: '工艺参数提取',
    category: 'extraction',
    description: '提取工艺步骤和参数的详细信息',
  },
  {
    name: 'characterization_structured_extraction',
    title: '表征数据提取',
    category: 'extraction',
    description: '提取表征测试条件和结果数据',
  },
  {
    name: 'process_flow_pre_extraction',
    title: '工艺流程预提取',
    category: 'pre-extraction',
    description: '识别文献中的主要工艺步骤',
  },
  {
    name: 'characterization_pre_extraction',
    title: '表征信息预提取',
    category: 'pre-extraction',
    description: '识别使用的表征技术',
  },
];

const PromptTemplateManager = () => {
  // 提示词列表
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 预设提示词
  const [presets, setPresets] = useState([]);

  // 选中的提示词
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // 编辑状态
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    title: '',
    description: '',
    content: '',
    category: 'custom',
  });

  // 创建对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    title: '',
    description: '',
    content: '',
    category: 'custom',
  });

  // 提示
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Tab 状态
  const [currentTab, setCurrentTab] = useState(0);

  // 获取提示词列表
  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/list`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setPrompts(data.data);
      }
    } catch (error) {
      showSnackbar('获取提示词列表失败：' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取预设提示词
  const fetchPresets = async () => {
    try {
      const response = await fetch(`${API_BASE}/presets`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setPresets(data.data);
      }
    } catch (error) {
      console.error('获取预设提示词失败:', error);
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchPresets();
  }, []);

  // 显示提示
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 创建提示词
  const handleCreate = async () => {
    if (!createData.name || !createData.title || !createData.content) {
      showSnackbar('请填写必填项', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify(createData),
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('创建成功！');
        setCreateDialogOpen(false);
        setCreateData({
          name: '',
          title: '',
          description: '',
          content: '',
          category: 'custom',
        });
        fetchPrompts();
      } else {
        showSnackbar(data.error || '创建失败', 'error');
      }
    } catch (error) {
      showSnackbar('创建失败：' + error.message, 'error');
    }
  };

  // 编辑提示词
  const handleEdit = (prompt) => {
    setSelectedPrompt(prompt);
    setEditData({
      name: prompt.name,
      title: prompt.title,
      description: prompt.description || '',
      content: prompt.content,
      category: prompt.category || 'custom',
    });
    setEditMode(true);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!selectedPrompt) return;

    try {
      const response = await fetch(`${API_BASE}/${selectedPrompt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('保存成功！');
        setEditMode(false);
        fetchPrompts();
      } else {
        showSnackbar(data.error || '保存失败', 'error');
      }
    } catch (error) {
      showSnackbar('保存失败：' + error.message, 'error');
    }
  };

  // 删除提示词
  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个提示词吗？')) return;

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: baseHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('删除成功！');
        if (selectedPrompt?.id === id) {
          setSelectedPrompt(null);
          setEditMode(false);
        }
        fetchPrompts();
      } else {
        showSnackbar(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showSnackbar('删除失败：' + error.message, 'error');
    }
  };

  // 切换激活状态
  const handleToggle = async (prompt) => {
    try {
      const response = await fetch(`${API_BASE}/${prompt.id}/toggle`, {
        method: 'PUT',
        headers: baseHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar(data.message);
        fetchPrompts();
      } else {
        showSnackbar(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showSnackbar('操作失败：' + error.message, 'error');
    }
  };

  // 从预设创建
  const handleCreateFromPreset = (preset) => {
    setCreateDialogOpen(true);
    setCreateData({
      name: preset.name + '_custom',
      title: preset.title + '（自定义）',
      description: preset.description,
      content: preset.content,
      category: 'custom',
    });
  };

  // 取消编辑
  const handleCancel = () => {
    setEditMode(false);
    setSelectedPrompt(null);
  };

  // 复制提示词
  const handleCopy = (prompt) => {
    navigator.clipboard.writeText(prompt.content);
    showSnackbar('已复制到剪贴板');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        提示词模板管理
      </Typography>

      <Grid container spacing={3}>
        {/* 左侧：提示词列表 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">提示词列表</Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  新建
                </Button>
              </Box>

              <Tabs
                value={currentTab}
                onChange={(e, v) => setCurrentTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab label="自定义" />
                <Tab label={`预设 (${presets.length})`} />
              </Tabs>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {currentTab === 0 ? (
                    // 自定义提示词列表
                    prompts.map((prompt) => (
                      <Paper
                        key={prompt.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 1,
                          cursor: 'pointer',
                          bgcolor: selectedPrompt?.id === prompt.id ? 'action.selected' : 'default',
                          opacity: prompt.isActive ? 1 : 0.6,
                        }}
                        onClick={() => handleEdit(prompt)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2">{prompt.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {prompt.name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              icon={prompt.isActive ? <CheckIcon /> : null}
                              label={prompt.isActive ? '已激活' : '已停用'}
                              color={prompt.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {prompt.description || '无描述'}
                        </Typography>
                      </Paper>
                    ))
                  ) : (
                    // 预设提示词列表
                    presets.map((preset) => (
                      <Paper
                        key={preset.name}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2">{preset.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {preset.name}
                            </Typography>
                          </Box>
                          <Chip label="预设" color="primary" size="small" />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {preset.description || '预设提示词模板'}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            startIcon={<CopyIcon />}
                            onClick={() => handleCreateFromPreset(preset)}
                          >
                            使用此模板
                          </Button>
                        </Box>
                      </Paper>
                    ))
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：编辑区域 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {selectedPrompt || editMode ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      {editMode ? '编辑提示词' : '查看提示词'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!editMode && (
                        <>
                          <IconButton onClick={() => handleCopy(selectedPrompt)} size="small">
                            <CopyIcon />
                          </IconButton>
                          <IconButton onClick={() => handleEdit(selectedPrompt)} size="small">
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleToggle(selectedPrompt)} size="small">
                            {selectedPrompt.isActive ? <ActiveIcon /> : <InactiveIcon />}
                          </IconButton>
                          <IconButton onClick={() => handleDelete(selectedPrompt.id)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="名称"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="标题"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="描述"
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        disabled={!editMode}
                        size="small"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>分类</InputLabel>
                        <Select
                          value={editData.category}
                          label="分类"
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          disabled={!editMode}
                        >
                          <MenuItem value="extraction">提取</MenuItem>
                          <MenuItem value="pre-extraction">预提取</MenuItem>
                          <MenuItem value="custom">自定义</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="提示词内容"
                        value={editData.content}
                        onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                        disabled={!editMode}
                        size="small"
                        multiline
                        rows={20}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </Grid>
                  </Grid>

                  {editMode && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                      <Button onClick={handleCancel}>取消</Button>
                      <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}>
                        保存
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    从左侧选择一个提示词，或点击"新建"创建自定义提示词
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 创建对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建自定义提示词</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="名称 *"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                size="small"
                helperText="英文字母和下划线，如：my_custom_extraction"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="标题 *"
                value={createData.title}
                onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="描述"
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>分类</InputLabel>
                <Select
                  value={createData.category}
                  label="分类"
                  onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                >
                  <MenuItem value="extraction">提取</MenuItem>
                  <MenuItem value="pre-extraction">预提取</MenuItem>
                  <MenuItem value="custom">自定义</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="提示词内容 *"
                value={createData.content}
                onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                size="small"
                multiline
                rows={15}
                sx={{ fontFamily: 'monospace' }}
                helperText="支持 Markdown 格式"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* 提示框 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptTemplateManager;
