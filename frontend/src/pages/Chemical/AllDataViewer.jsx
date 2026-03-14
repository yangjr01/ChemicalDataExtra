import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Science as ScienceIcon,
  PrecisionManufacturing as ProcessIcon,
  Biotech as CharIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { baseHeaders } from '../../utils/request';
import paths from '../../utils/paths';

const API_BASE = '/api/chemical';

// 可显示的字段配置
const FIELD_CONFIG = {
  materials: [
    { key: 'articleTitle', label: '文献标题', default: true },
    { key: 'name', label: '材料名称', default: true },
    { key: 'formula', label: '化学式', default: true },
    { key: 'category', label: '材料类型', default: true },
    { key: 'composition', label: '组成成分', default: false },
    { key: 'properties', label: '材料属性', default: false },
    { key: 'notes', label: '备注', default: false },
  ],
  processes: [
    { key: 'articleTitle', label: '文献标题', default: true },
    { key: 'name', label: '工艺名称', default: true },
    { key: 'sequence', label: '步骤序号', default: true },
    { key: 'description', label: '工艺描述', default: true },
    { key: 'conditions', label: '工艺条件', default: false },
    { key: 'parameters', label: '工艺参数', default: false },
    { key: 'notes', label: '备注', default: false },
  ],
  characterizations: [
    { key: 'articleTitle', label: '文献标题', default: true },
    { key: 'technique', label: '表征技术', default: true },
    { key: 'material', label: '测试材料', default: true },
    { key: 'process', label: '关联工艺', default: false },
    { key: 'conditions', label: '测试条件', default: false },
    { key: 'results', label: '测试结果', default: false },
    { key: 'notes', label: '备注', default: false },
  ],
};

const AllDataViewer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    materials: [],
    processes: [],
    characterizations: [],
  });
  
  // 筛选条件
  const [filters, setFilters] = useState({
    articleId: '',
    materialName: '',
    processName: '',
    technique: '',
    search: '',
  });
  
  // 自定义显示字段
  const [visibleFields, setVisibleFields] = useState({
    materials: FIELD_CONFIG.materials.filter(f => f.default).map(f => f.key),
    processes: FIELD_CONFIG.processes.filter(f => f.default).map(f => f.key),
    characterizations: FIELD_CONFIG.characterizations.filter(f => f.default).map(f => f.key),
  });
  
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [articles, setArticles] = useState([]);

  // 获取所有数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.articleId) params.append('articleId', filters.articleId);
      if (filters.materialName) params.append('materialName', filters.materialName);
      if (filters.processName) params.append('processName', filters.processName);
      if (filters.technique) params.append('technique', filters.technique);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`${API_BASE}/alldata?${params}`, {
        headers: baseHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取文献列表
  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_BASE}/literature/list?pageSize=1000`, {
        headers: baseHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        setArticles(result.data.items);
      }
    } catch (error) {
      console.error('获取文献列表失败:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchArticles();
  }, []);

  // 导出数据
  const exportData = async (format) => {
    try {
      const response = await fetch(`${API_BASE}/alldata/export?format=${format}`, {
        headers: baseHeaders(),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chemical_data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败');
    }
  };

  // 处理筛选
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 应用筛选
  const applyFilters = () => {
    fetchData();
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters({
      articleId: '',
      materialName: '',
      processName: '',
      technique: '',
      search: '',
    });
    fetchData();
  };

  // 切换字段显示
  const toggleField = (type, fieldKey) => {
    setVisibleFields(prev => ({
      ...prev,
      [type]: prev[type].includes(fieldKey)
        ? prev[type].filter(k => k !== fieldKey)
        : [...prev[type], fieldKey],
    }));
  };

  // 渲染表格单元格
  const renderCell = (item, field) => {
    const value = item[field.key];
    if (field.key === 'articleTitle') {
      return (
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {value}
        </Typography>
      );
    }
    if (field.key === 'composition' || field.key === 'properties' || 
        field.key === 'conditions' || field.key === 'results') {
      if (!value) return '-';
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return (
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {JSON.stringify(parsed).slice(0, 50)}...
          </Typography>
        );
      } catch {
        return String(value).slice(0, 50);
      }
    }
    if (field.key === 'category' && value) {
      return value.name || '-';
    }
    if (field.key === 'material' && value) {
      return value.name || '-';
    }
    if (field.key === 'process' && value) {
      return value.name || '-';
    }
    if (field.key === 'parameters' && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} 个参数` : '-';
    }
    return value || '-';
  };

  // 材料表格
  const MaterialsTable = () => {
    const fields = FIELD_CONFIG.materials.filter(f => visibleFields.materials.includes(f.key));
    
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {fields.map(field => (
                <TableCell key={field.key}>{field.label}</TableCell>
              ))}
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.materials.map((material) => (
              <TableRow key={material.id}>
                {fields.map(field => (
                  <TableCell key={field.key}>
                    {renderCell(material, field)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="查看文献">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/chemical/data/${material.articleId}`)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data.materials.length === 0 && (
              <TableRow>
                <TableCell colSpan={fields.length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无材料数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // 工艺表格
  const ProcessesTable = () => {
    const fields = FIELD_CONFIG.processes.filter(f => visibleFields.processes.includes(f.key));
    
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {fields.map(field => (
                <TableCell key={field.key}>{field.label}</TableCell>
              ))}
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.processes.map((process) => (
              <TableRow key={process.id}>
                {fields.map(field => (
                  <TableCell key={field.key}>
                    {renderCell(process, field)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="查看文献">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/chemical/data/${process.articleId}`)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data.processes.length === 0 && (
              <TableRow>
                <TableCell colSpan={fields.length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无工艺数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // 表征表格
  const CharacterizationsTable = () => {
    const fields = FIELD_CONFIG.characterizations.filter(f => visibleFields.characterizations.includes(f.key));
    
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {fields.map(field => (
                <TableCell key={field.key}>{field.label}</TableCell>
              ))}
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.characterizations.map((char) => (
              <TableRow key={char.id}>
                {fields.map(field => (
                  <TableCell key={field.key}>
                    {renderCell(char, field)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="查看文献">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/chemical/data/${char.articleId}`)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data.characterizations.length === 0 && (
              <TableRow>
                <TableCell colSpan={fields.length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无表征数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate(paths.chemical.literature())}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            所有文献数据汇总
          </Typography>
          <Button
            color="inherit"
            startIcon={<SettingsIcon />}
            onClick={() => setFieldDialogOpen(true)}
          >
            自定义字段
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={() => exportData('json')}
          >
            导出JSON
          </Button>
          <Button
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={() => exportData('csv')}
          >
            导出CSV
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* 统计信息 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScienceIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary">材料总数</Typography>
                    <Typography variant="h4">{data.materials.length}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ProcessIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary">工艺总数</Typography>
                    <Typography variant="h4">{data.processes.length}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CharIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary">表征总数</Typography>
                    <Typography variant="h4">{data.characterizations.length}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 筛选区域 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>筛选文献</InputLabel>
                  <Select
                    value={filters.articleId}
                    label="筛选文献"
                    onChange={(e) => handleFilterChange('articleId', e.target.value)}
                  >
                    <MenuItem value="">全部文献</MenuItem>
                    {articles.map((article) => (
                      <MenuItem key={article.id} value={article.id}>
                        {article.title.slice(0, 50)}...
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="搜索关键词"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="搜索文献标题..."
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={applyFilters}
                >
                  应用筛选
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={clearFilters}
                >
                  清除筛选
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 标签页 */}
        <Card>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label={`材料表 (${data.materials.length})`}
              icon={<ScienceIcon />}
              iconPosition="start"
            />
            <Tab
              label={`工艺表 (${data.processes.length})`}
              icon={<ProcessIcon />}
              iconPosition="start"
            />
            <Tab
              label={`表征表 (${data.characterizations.length})`}
              icon={<CharIcon />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ p: 2 }}>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && activeTab === 0 && <MaterialsTable />}
            {!loading && activeTab === 1 && <ProcessesTable />}
            {!loading && activeTab === 2 && <CharacterizationsTable />}
          </Box>
        </Card>
      </Container>

      {/* 字段自定义对话框 */}
      <Dialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>自定义显示字段</DialogTitle>
        <DialogContent>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{ mb: 2 }}
          >
            <Tab label="材料字段" />
            <Tab label="工艺字段" />
            <Tab label="表征字段" />
          </Tabs>

          <FormGroup>
            {FIELD_CONFIG[['materials', 'processes', 'characterizations'][activeTab]].map((field) => (
              <FormControlLabel
                key={field.key}
                control={
                  <Checkbox
                    checked={visibleFields[['materials', 'processes', 'characterizations'][activeTab]].includes(field.key)}
                    onChange={() => toggleField(['materials', 'processes', 'characterizations'][activeTab], field.key)}
                  />
                }
                label={field.label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllDataViewer;
