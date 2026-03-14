import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  AutoFixHigh as AutoFixIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

const DataViewer = () => {
  const { articleId } = useParams();
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [characterizations, setCharacterizations] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState(false);
  const [editType, setEditType] = useState('');
  const [editData, setEditData] = useState({});
  const [addDialog, setAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({});
  const [preExtractions, setPreExtractions] = useState([]);
  const [showPreExtractions, setShowPreExtractions] = useState(false);
  const [materialsPreExtraction, setMaterialsPreExtraction] = useState(null);
  const [characterizationsPreExtraction, setCharacterizationsPreExtraction] = useState(null);
  const [savingToDB, setSavingToDB] = useState(false);

  // 保存所有预提取数据到数据库（统一入口）
  const saveAllPreExtractionsToDB = async () => {
    if (!window.confirm('确定要将所有预提取的材料和工艺数据保存到数据库吗？\n\n这将调用 AI 整理并保存数据。')) return;

    setSavingToDB(true);
    try {
      const response = await fetch(`${API_BASE}/data/${articleId}/save-all-pre-extractions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        alert(`保存成功！\n\n材料：${data.data.materialsCount} 条\n工艺：${data.data.processesCount} 条\n表征：${data.data.characterizationsCount} 条`);
        // 刷新数据
        fetchData();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败：' + error.message);
    } finally {
      setSavingToDB(false);
    }
  };

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/data/${articleId}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setArticle(data.data.article);
        setMaterials(data.data.materials);
        setProcesses(data.data.processes);
        setCharacterizations(data.data.characterizations);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取预提取结果
  const fetchPreExtractions = async () => {
    try {
      const response = await fetch(`${API_BASE}/data/${articleId}/pre-extractions`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setPreExtractions(data.data.modules);
        // 提取 5 个模块的结果
        const materialsPreExt = data.data.modules.find(
          m => m.name === 'pre_extraction_materials_processes'
        );
        const charPreExt = data.data.modules.find(
          m => m.name === 'pre_extraction_characterizations'
        );
        setMaterialsPreExtraction(materialsPreExt?.result || null);
        setCharacterizationsPreExtraction(charPreExt?.result || null);
        // 如果有任何预提取结果，自动显示
        const hasResults = data.data.modules.some(m => m.result !== null);
        setShowPreExtractions(hasResults);
      }
    } catch (error) {
      console.error('获取预提取结果失败:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPreExtractions();
  }, [articleId]);

  // 导出数据
  const exportData = async () => {
    window.open(`${API_BASE}/data/export/${articleId}?format=json`, '_blank');
  };

  // 删除项目
  const deleteItem = async (type, id) => {
    if (!window.confirm('确定要删除吗？')) return;

    try {
      const response = await fetch(`${API_BASE}/data/${type}/${id}`, {
        method: 'DELETE',
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 添加项目
  const addItem = async () => {
    try {
      const response = await fetch(`${API_BASE}/data/${editType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({ articleId: parseInt(articleId), ...newItem }),
      });
      const data = await response.json();
      if (data.success) {
        setAddDialog(false);
        setNewItem({});
        fetchData();
      }
    } catch (error) {
      console.error('添加失败:', error);
    }
  };

  // 更新项目
  const updateItem = async () => {
    try {
      const response = await fetch(`${API_BASE}/data/${editType}/${editData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify(editData),
      });
      const data = await response.json();
      if (data.success) {
        setEditDialog(false);
        fetchData();
      }
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 标题区域 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            数据查看
          </Typography>
          {article && (
            <Typography variant="body2" color="text.secondary">
              文献: {article.title}
            </Typography>
          )}
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportData}>
          导出数据
        </Button>
      </Box>

      {/* 预提取结果显示 */}
      {preExtractions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixIcon color="primary" />
                <Typography variant="h6">预提取结果（5 个模块）</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* 统一的保存到数据库按钮 */}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<StorageIcon />}
                  onClick={saveAllPreExtractionsToDB}
                  disabled={savingToDB || !preExtractions.some(m => m.result)}
                >
                  {savingToDB ? '保存中...' : '保存到数据库'}
                </Button>
                <Button
                  size="small"
                  onClick={() => setShowPreExtractions(!showPreExtractions)}
                >
                  {showPreExtractions ? '收起' : '展开'}
                </Button>
              </Box>
            </Box>

            {showPreExtractions && (
              <Grid container spacing={2}>
                {preExtractions.map((module, index) => (
                  <Grid item xs={12} key={module.id}>
                    <Accordion defaultExpanded={false}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Chip
                          label={`${index + 1}. ${module.title}`}
                          color={module.result ? 'success' : 'default'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {module.result ? '已提取' : '未提取'}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {module.result ? (
                          <Box>
                            <Box
                              sx={{
                                p: 2,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                maxHeight: 400,
                                overflow: 'auto',
                              }}
                            >
                              <pre
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  wordWrap: 'break-word',
                                  margin: 0,
                                  fontFamily: 'monospace',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {module.result}
                              </pre>
                            </Box>
                          </Box>
                        ) : (
                          <Alert severity="info">
                            该模块尚未进行预提取，请在提取流程中选择对应的提示词模板进行提取。
                          </Alert>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                材料数量
              </Typography>
              <Typography variant="h3">{materials.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                工艺步骤
              </Typography>
              <Typography variant="h3">{processes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                表征数据
              </Typography>
              <Typography variant="h3">{characterizations.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 标签页 */}
      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`材料 (${materials.length})`} />
          <Tab label={`工艺 (${processes.length})`} />
          <Tab label={`表征 (${characterizations.length})`} />
        </Tabs>

        {/* 材料列表 */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {/* 预提取 - 材料工艺信息 */}
            {materialsPreExtraction && (
              <Card sx={{ mb: 3, bgcolor: 'blue.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AutoFixIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">预提取 - 材料工艺信息</Typography>
                    <Chip label="AI 预提取" color="primary" size="small" sx={{ ml: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    以下是 AI 从文献中预提取的材料和工艺信息（原始文本）：
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      maxHeight: 500,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        margin: 0,
                      }}
                    >
                      {materialsPreExtraction}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            <Box sx={{ mb: 2, textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditType('material');
                  setNewItem({ name: '', formula: '', composition: {}, properties: {} });
                  setAddDialog(true);
                }}
              >
                添加材料
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>名称</TableCell>
                    <TableCell>化学式</TableCell>
                    <TableCell>组成</TableCell>
                    <TableCell>属性</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{material.name}</TableCell>
                      <TableCell>{material.formula || '-'}</TableCell>
                      <TableCell>
                        {material.composition
                          ? JSON.stringify(material.composition).slice(0, 50) + '...'
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {material.properties
                          ? JSON.stringify(material.properties).slice(0, 50) + '...'
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditType('material');
                              setEditData(material);
                              setEditDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteItem('material', material.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* 工艺列表 */}
        {activeTab === 1 && (
          <Box sx={{ p: 2 }}>
            {/* 预提取 - 材料工艺信息（工艺部分） */}
            {materialsPreExtraction && (
              <Card sx={{ mb: 3, bgcolor: 'blue.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AutoFixIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">预提取 - 材料工艺信息</Typography>
                    <Chip label="AI 预提取" color="primary" size="small" sx={{ ml: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    以下是 AI 从文献中预提取的工艺信息（原始文本）：
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      maxHeight: 500,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        margin: 0,
                      }}
                    >
                      {materialsPreExtraction}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            <Box sx={{ mb: 2, textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditType('process');
                  setNewItem({ name: '', description: '', sequence: processes.length + 1 });
                  setAddDialog(true);
                }}
              >
                添加工艺
              </Button>
            </Box>
            {processes.map((process, index) => (
              <Accordion key={process.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Chip label={process.sequence || index + 1} sx={{ mr: 2 }} />
                    <Typography>{process.name}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {process.description}
                  </Typography>

                  {/* 工艺参数 */}
                  {process.parameters && process.parameters.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">工艺参数</Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>参数</TableCell>
                              <TableCell>值</TableCell>
                              <TableCell>单位</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {process.parameters.map((param) => (
                              <TableRow key={param.id}>
                                <TableCell>{param.name}</TableCell>
                                <TableCell>{param.value}</TableCell>
                                <TableCell>{param.unit || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditType('process');
                          setEditData(process);
                          setEditDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteItem('process', process.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* 表征列表 */}
        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            {/* 预提取 - 表征信息 */}
            {characterizationsPreExtraction && (
              <Card sx={{ mb: 3, bgcolor: 'blue.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AutoFixIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">预提取 - 表征信息</Typography>
                    <Chip label="AI 预提取" color="primary" size="small" sx={{ ml: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    以下是 AI 从文献中预提取的表征信息（原始文本）：
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      maxHeight: 500,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        margin: 0,
                      }}
                    >
                      {characterizationsPreExtraction}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            <Box sx={{ mb: 2, textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditType('characterization');
                  setNewItem({ technique: '', conditions: {}, results: {} });
                  setAddDialog(true);
                }}
              >
                添加表征
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>表征技术</TableCell>
                    <TableCell>材料</TableCell>
                    <TableCell>测试条件</TableCell>
                    <TableCell>主要结果</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {characterizations.map((char) => (
                    <TableRow key={char.id}>
                      <TableCell>
                        <Chip label={char.technique} size="small" />
                      </TableCell>
                      <TableCell>{char.material?.name || '-'}</TableCell>
                      <TableCell>
                        {char.conditions
                          ? JSON.stringify(char.conditions).slice(0, 50) + '...'
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {char.results
                          ? JSON.stringify(char.results).slice(0, 50) + '...'
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditType('characterization');
                              setEditData(char);
                              setEditDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteItem('characterization', char.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Card>

      {/* 添加对话框 */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加{editType === 'material' ? '材料' : editType === 'process' ? '工艺' : '表征'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {editType === 'material' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="材料名称"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="化学式"
                    value={newItem.formula || ''}
                    onChange={(e) => setNewItem({ ...newItem, formula: e.target.value })}
                  />
                </Grid>
              </>
            )}
            {editType === 'process' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="工艺名称"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="描述"
                    multiline
                    rows={3}
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </Grid>
              </>
            )}
            {editType === 'characterization' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="表征技术"
                    value={newItem.technique || ''}
                    onChange={(e) => setNewItem({ ...newItem, technique: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>取消</Button>
          <Button variant="contained" onClick={addItem}>
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>编辑数据</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={JSON.stringify(editData, null, 2)}
            onChange={(e) => {
              try {
                setEditData(JSON.parse(e.target.value));
              } catch (err) {
                // 忽略解析错误
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={updateItem}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DataViewer;