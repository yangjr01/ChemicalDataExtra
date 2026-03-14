import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  AppBar,
  Toolbar,
  Fab,
  Zoom,
  Fade,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as AutoFixIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Subject as SubjectIcon,
  Storage as StorageIcon,
  Home as HomeIcon,
  Science as ScienceIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { baseHeaders } from '../../utils/request';
import paths from '../../utils/paths';

// API 服务
const API_BASE = '/api/chemical';

const LiteratureManage = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    doi: '',
    journal: '',
    abstract: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);
  
  // 视图模式：'card' 或 'list'
  const [viewMode, setViewMode] = useState('card');
  
  // 提取状态
  const [extractingId, setExtractingId] = useState(null);
  
  // 上传模式：'normal' 或 'processed'
  const [uploadMode, setUploadMode] = useState('normal');
  const [processedFiles, setProcessedFiles] = useState([]);

  // 获取文献列表
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await fetch(`${API_BASE}/literature/list?${params}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setArticles(data.data.items);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('获取文献列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, status]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    fetchArticles();
  };

  // 上传文献
  const handleUpload = async () => {
    if (uploadMode === 'normal') {
      // 普通上传模式
      if (!uploadForm.file) {
        alert('请选择文件');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', uploadForm.file);
        if (uploadForm.title) formData.append('title', uploadForm.title);
        if (uploadForm.doi) formData.append('doi', uploadForm.doi);
        if (uploadForm.journal) formData.append('journal', uploadForm.journal);
        if (uploadForm.abstract) formData.append('abstract', uploadForm.abstract);

        const response = await fetch(`${API_BASE}/literature/upload`, {
          method: 'POST',
          headers: {
            ...baseHeaders(null, false),
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          alert('上传成功');
          setUploadDialog(false);
          setUploadForm({ title: '', doi: '', journal: '', abstract: '', file: null });
          fetchArticles();
        } else {
          alert(data.error || '上传失败');
        }
      } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败');
      } finally {
        setUploading(false);
      }
    } else {
      // 预处理数据上传模式
      if (processedFiles.length === 0) {
        alert('请选择文件');
        return;
      }

      // 检查是否包含 PDF 文件
      const pdfFile = processedFiles.find(f => f.name.toLowerCase().endsWith('.pdf'));
      if (!pdfFile) {
        alert('必须包含一个 PDF 文件');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        
        // 添加所有文件
        processedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        // 添加表单数据
        if (uploadForm.title) formData.append('title', uploadForm.title);
        if (uploadForm.doi) formData.append('doi', uploadForm.doi);
        if (uploadForm.journal) formData.append('journal', uploadForm.journal);
        if (uploadForm.abstract) formData.append('abstract', uploadForm.abstract);

        const response = await fetch(`${API_BASE}/literature/upload-processed`, {
          method: 'POST',
          headers: {
            ...baseHeaders(null, false),
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          alert(`上传成功！共处理 ${data.data.processedFiles} 个预提取文件`);
          setUploadDialog(false);
          setUploadMode('normal');
          setProcessedFiles([]);
          setUploadForm({ title: '', doi: '', journal: '', abstract: '', file: null });
          fetchArticles();
        } else {
          alert(data.error || '上传失败');
        }
      } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败：' + error.message);
      } finally {
        setUploading(false);
      }
    }
  };

  // 删除文献
  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这篇文献吗？')) return;

    try {
      const response = await fetch(`${API_BASE}/literature/${id}`, {
        method: 'DELETE',
        headers: baseHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        fetchArticles();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 提取文章信息
  const handleExtractInfo = async (id) => {
    if (!window.confirm('将调用 AI 提取论文信息，这可能会产生 API 费用。继续？')) return;

    setExtractingId(id);
    try {
      const response = await fetch(`${API_BASE}/literature/${id}/extract`, {
        method: 'POST',
        headers: baseHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        alert('提取成功！已更新论文信息。');
        fetchArticles();
      } else {
        alert(data.error || '提取失败');
      }
    } catch (error) {
      console.error('提取失败:', error);
      alert('提取失败：' + error.message);
    } finally {
      setExtractingId(null);
    }
  };

  // 状态颜色
  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      processing: 'primary',
      completed: 'success',
      failed: 'error',
    };
    return colors[status] || 'default';
  };

  // 状态文本
  const getStatusText = (status) => {
    const texts = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return texts[status] || status;
  };

  // 卡片视图
  const CardView = () => (
    <Grid container spacing={3}>
      {articles.map((article) => (
        <Grid item xs={12} key={article.id}>
          <Card elevation={2} sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{article.title}</Typography>
                <Chip
                  label={getStatusText(article.status)}
                  color={getStatusColor(article.status)}
                  size="small"
                />
              </Box>

              {article.doi && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  DOI: {article.doi}
                </Typography>
              )}

              {article.journal && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  期刊：{article.journal}
                </Typography>
              )}

              {article.abstract && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  摘要：{article.abstract.substring(0, 150)}...
                </Typography>
              )}

              {article.authors && article.authors.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  作者：{article.authors.map((a) => a.author.name).join(', ')}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  材料：{article._count?.materials || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  工艺：{article._count?.processes || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  表征：{article._count?.characterizations || 0}
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
              <Button
                size="small"
                startIcon={<AutoFixIcon />}
                onClick={() => navigate(`/chemical/extract/${article.id}`)}
              >
                开始提取
              </Button>
              <Button
                size="small"
                startIcon={<SubjectIcon />}
                onClick={() => handleExtractInfo(article.id)}
                disabled={extractingId === article.id}
              >
                {extractingId === article.id ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                提取文章信息
              </Button>
              <Button
                size="small"
                startIcon={<ViewIcon />}
                onClick={() => navigate(`/chemical/data/${article.id}`)}
              >
                查看数据
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDelete(article.id)}
              >
                删除
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // 列表视图
  const ListView = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>标题</TableCell>
            <TableCell>DOI</TableCell>
            <TableCell>期刊</TableCell>
            <TableCell>作者</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>数据</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {articles.map((article) => (
            <TableRow key={article.id} hover>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 300, fontWeight: 500 }}>
                  {article.title}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                  {article.doi || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                  {article.journal || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                  {article.authors && article.authors.length > 0
                    ? article.authors.map((a) => a.author.name).join(', ')
                    : '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={getStatusText(article.status)}
                  color={getStatusColor(article.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  材料:{article._count?.materials || 0} | 
                  工艺:{article._count?.processes || 0} | 
                  表征:{article._count?.characterizations || 0}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                  <Tooltip title="开始提取">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/chemical/extract/${article.id}`)}
                    >
                      <AutoFixIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="提取文章信息">
                    <IconButton
                      size="small"
                      onClick={() => handleExtractInfo(article.id)}
                      disabled={extractingId === article.id}
                    >
                      {extractingId === article.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SubjectIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="查看数据">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/chemical/data/${article.id}`)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(article.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* 顶部导航栏 */}
      <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ScienceIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              文献管理
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HomeIcon />}
              onClick={() => navigate(paths.home())}
            >
              返回首页
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<StorageIcon />}
              onClick={() => navigate(paths.chemical.allData())}
            >
              数据汇总
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 标题区域 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            文献管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理和查看上传的材料科学文献
          </Typography>
        </Box>

        {/* 工具栏 */}
        <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ pb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="搜索文献..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={status}
                    label="状态"
                    onChange={(e) => setStatus(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="pending">待处理</MenuItem>
                    <MenuItem value="processing">处理中</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="failed">失败</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchArticles}
                  disabled={loading}
                >
                  刷新
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={viewMode === 'card' ? <ViewListIcon /> : <ViewModuleIcon />}
                  onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                >
                  {viewMode === 'card' ? '列表' : '卡片'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <Paper elevation={1} sx={{ mb: 2, borderRadius: 2, bgcolor: 'primary.main', color: 'white', py: 1, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ScienceIcon sx={{ fontSize: 24, opacity: 0.9 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '1.25rem' }}>
                  {articles.length}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                  文献总数
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                第 {page} / {totalPages} 页
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 加载状态 */}
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* 空状态提示 */}
        {!loading && articles.length === 0 && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            暂无文献，请上传或搜索
          </Alert>
        )}

        {/* 视图内容 */}
        <Fade in={!loading}>
          <Box>
            {viewMode === 'card' ? <CardView /> : <ListView />}
          </Box>
        </Fade>

        {/* 分页 */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
            <Button
              variant="outlined"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Typography sx={{ lineHeight: '36px', px: 2, bgcolor: 'white', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              {page} / {totalPages}
            </Typography>
            <Button
              variant="outlined"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </Box>
        )}
      </Container>

      {/* 浮动上传按钮 */}
      <Zoom in={true}>
        <Fab
          color="primary"
          aria-label="upload"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setUploadDialog(true)}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* 上传对话框 */}
      <Dialog 
        open={uploadDialog} 
        onClose={() => {
          setUploadDialog(false);
          setUploadMode('normal');
          setProcessedFiles([]);
          setUploadForm({ title: '', doi: '', journal: '', abstract: '', file: null });
        }} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>上传文献</DialogTitle>
        <DialogContent>
          {/* 上传模式选择 */}
          <FormControl component="fieldset" sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>上传模式</Typography>
            <RadioGroup
              value={uploadMode}
              onChange={(e) => {
                setUploadMode(e.target.value);
                setProcessedFiles([]);
                setUploadForm({ title: '', doi: '', journal: '', abstract: '', file: null });
              }}
            >
              <FormControlLabel 
                value="normal" 
                control={<Radio />} 
                label="普通上传（上传PDF后自动调用LLM提取信息）"
              />
              <FormControlLabel 
                value="processed" 
                control={<Radio />} 
                label="上传预处理过的数据（已包含5套提示词处理结果）"
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            {uploadMode === 'normal' ? (
              // 普通上传模式
              <>
                <Grid item xs={12}>
                  <Button variant="outlined" component="label" fullWidth sx={{ py: 2, borderRadius: 2 }}>
                    选择文件 (PDF/DOC/DOCX)
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    />
                  </Button>
                  {uploadForm.file && (
                    <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                      已选择：{uploadForm.file.name}
                    </Typography>
                  )}
                </Grid>
              </>
            ) : (
              // 预处理数据上传模式
              <>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    请上传包含以下文件的文件夹：<br/>
                    • PDF文件（必需）<br/>
                    • 1预提取-材料工艺信息.txt<br/>
                    • 2材料表.txt<br/>
                    • 3工艺表.txt<br/>
                    • 4预提取-表征信息.txt<br/>
                    • 5表征信息表.txt
                  </Alert>
                  <Button variant="outlined" component="label" fullWidth sx={{ py: 2, borderRadius: 2 }}>
                    选择文件夹（可多选）
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.txt"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setProcessedFiles(files);
                        // 自动从PDF文件名提取标题
                        const pdfFile = files.find(f => f.name.toLowerCase().endsWith('.pdf'));
                        if (pdfFile && !uploadForm.title) {
                          setUploadForm(prev => ({ 
                            ...prev, 
                            title: pdfFile.name.replace('.pdf', '') 
                          }));
                        }
                      }}
                    />
                  </Button>
                </Grid>
                {processedFiles.length > 0 && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        已选择 {processedFiles.length} 个文件：
                      </Typography>
                      <List dense>
                        {processedFiles.map((file, index) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <Chip 
                              label={file.name} 
                              size="small" 
                              color={file.name.toLowerCase().endsWith('.pdf') ? 'primary' : 'default'}
                              sx={{ maxWidth: '100%' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                )}
              </>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="标题"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="DOI"
                value={uploadForm.doi}
                onChange={(e) => setUploadForm({ ...uploadForm, doi: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="期刊"
                value={uploadForm.journal}
                onChange={(e) => setUploadForm({ ...uploadForm, journal: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="摘要"
                multiline
                rows={3}
                value={uploadForm.abstract}
                onChange={(e) => setUploadForm({ ...uploadForm, abstract: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => {
              setUploadDialog(false);
              setUploadMode('normal');
              setProcessedFiles([]);
              setUploadForm({ title: '', doi: '', journal: '', abstract: '', file: null });
            }} 
            variant="outlined"
          >
            取消
          </Button>
          <Button 
            variant="contained" 
            onClick={handleUpload} 
            disabled={uploading || (uploadMode === 'normal' ? !uploadForm.file : processedFiles.length === 0)}
          >
            {uploading ? '上传中...' : '上传'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiteratureManage;
