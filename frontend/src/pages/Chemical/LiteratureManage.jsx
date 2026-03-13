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
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">{article.title}</Typography>
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
            <CardActions>
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>标题</TableCell>
            <TableCell>DOI</TableCell>
            <TableCell>期刊</TableCell>
            <TableCell>作者</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>数据</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {articles.map((article) => (
            <TableRow key={article.id}>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
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
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              文献管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理和查看上传的材料科学文献
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate(paths.home())}
          >
            返回首页
          </Button>
        </Box>
      </Box>

      {/* 工具栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
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
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={status}
                  label="状态"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="pending">待处理</MenuItem>
                  <MenuItem value="processing">处理中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="failed">失败</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5} sx={{ textAlign: 'right' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchArticles}
                sx={{ mr: 1 }}
                disabled={loading}
              >
                刷新
              </Button>
              <Button
                variant="outlined"
                startIcon={viewMode === 'card' ? <ViewListIcon /> : <ViewModuleIcon />}
                onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                sx={{ mr: 1 }}
              >
                {viewMode === 'card' ? '列表视图' : '卡片视图'}
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialog(true)}
              >
                上传文献
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 加载状态 */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 空状态提示 */}
      {!loading && articles.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          暂无文献，请上传或搜索
        </Alert>
      )}

      {/* 视图内容 */}
      {viewMode === 'card' ? <CardView /> : <ListView />}

      {/* 分页 */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <Typography sx={{ mx: 2, lineHeight: '36px' }}>
            {page} / {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </Box>
      )}

      {/* 上传对话框 */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>上传文献</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth>
                选择文件 (PDF/DOC/DOCX)
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                />
              </Button>
              {uploadForm.file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  已选择：{uploadForm.file.name}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="标题"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="DOI"
                value={uploadForm.doi}
                onChange={(e) => setUploadForm({ ...uploadForm, doi: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="期刊"
                value={uploadForm.journal}
                onChange={(e) => setUploadForm({ ...uploadForm, journal: e.target.value })}
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
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}>
            {uploading ? '上传中...' : '上传'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LiteratureManage;
