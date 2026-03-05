import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChemicalExtractionProvider,
  useChemicalExtraction,
} from './ChemicalExtractionContext';
import PDFViewer from './PDFViewer';
import TextExtractionPanel from './TextExtractionPanel';
import ImageCalibrationPanel from './ImageCalibrationPanel';
import ExtractedDataSummary from './ExtractedDataSummary';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

// 可调整大小的分隔条组件
const ResizableSplit = ({
  leftChild,
  rightChild,
  initialLeftWidth = 450,
  minLeftWidth = 300,
  maxLeftWidth = 800,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;

    if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
      setLeftWidth(newLeftWidth);
    }
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* 左侧面板 */}
      <Box
        sx={{
          width: `${leftWidth}px`,
          flexShrink: 0,
          height: '100%',
          position: 'relative',
        }}
      >
        {leftChild}
      </Box>

      {/* 拖拽分隔条 */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          width: 8,
          flexShrink: 0,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isDragging ? 'primary.light' : 'transparent',
          '&:hover': {
            bgcolor: 'primary.lighter',
          },
          transition: 'background-color 0.2s',
          zIndex: 100,
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 40,
            bgcolor: isDragging ? 'primary.main' : 'grey.400',
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DragIcon sx={{ fontSize: 16, color: 'grey.600', transform: 'rotate(90deg)' }} />
        </Box>
      </Box>

      {/* 右侧面板 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          height: '100%',
          minWidth: 0,
        }}
      >
        {rightChild}
      </Box>
    </Box>
  );
};

// 内部页面内容组件
const ExtractionPageContent = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();

  const {
    article,
    setArticle,
    textExtractionResult,
    imageExtractionData,
    updateImageExtractionData,
    fetchSavedData,
    savedData,
  } = useChemicalExtraction();

  const [activeTab, setActiveTab] = useState(0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);

  // 获取文献详情
  useEffect(() => {
    fetchArticle();
    fetchSavedData();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`${API_BASE}/literature/${articleId}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setArticle(data.data);
        // 设置 PDF URL
        if (data.data.sourceFile) {
          setPdfUrl(`/api/chemical/literature/${articleId}/pdf`);
        }
      }
    } catch (error) {
      console.error('获取文献详情失败:', error);
    }
  };

  // 处理 PDF 翻页
  const handlePageChange = (page) => {
    console.log('PDF 页码变更:', page);
  };

  // 处理截图
  const handleScreenshot = (screenshotData, pageNum) => {
    setCurrentScreenshot({
      data: screenshotData,
      page: pageNum,
    });
    setScreenshotDialog(true);
  };

  // 确认使用截图
  const handleUseScreenshot = () => {
    if (currentScreenshot) {
      updateImageExtractionData({
        screenshot: currentScreenshot.data,
      });
    }
    setScreenshotDialog(false);
    setCurrentScreenshot(null);
    // 切换到第 2 部分
    setActiveTab(1);
  };

  // 切换选项卡
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      {/* 顶部工具栏 */}
      <Paper elevation={2} sx={{ p: 2, mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<BackIcon />}
              onClick={() => navigate('/chemical/literature')}
            >
              返回文献列表
            </Button>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h6" noWrap sx={{ maxWidth: 600 }}>
                {article?.title || '加载中...'}
              </Typography>
              {article && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {article.journal || ''}
                  {article.doi ? ` | DOI: ${article.doi}` : ''}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                window.open(
                  `${API_BASE}/data/export/${articleId}?format=json`,
                  '_blank'
                );
              }}
            >
              导出
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 主内容区域 - 可调整大小 */}
      <Box sx={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
        <ResizableSplit
          leftChild={<PDFViewer
            pdfUrl={pdfUrl}
            onPageChange={handlePageChange}
            onScreenshot={handleScreenshot}
          />}
          rightChild={
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                p: 1,
                gap: 1,
              }}
            >
              {/* 选项卡面板 */}
              <Paper
                elevation={2}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab label="第 1 部分：文本信息提取" />
                  <Tab
                    label={`第 2 部分：图片数据提取 ${
                      textExtractionResult.charts?.length > 0 ||
                      textExtractionResult.materials?.length > 0
                        ? `(图表：${textExtractionResult.charts?.length || 0}, 材料：${
                            textExtractionResult.materials?.length || 0
                          })`
                        : ''
                    }`}
                  />
                </Tabs>

                {/* 面板内容 */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                  }}
                >
                  {activeTab === 0 ? (
                    <TextExtractionPanel />
                  ) : (
                    <ImageCalibrationPanel />
                  )}
                </Box>
              </Paper>

              {/* 底部：已提取数据预览 */}
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: 180,
                  flexShrink: 0,
                  overflow: 'auto',
                }}
              >
                <ExtractedDataSummary />
              </Paper>
            </Box>
          }
          initialLeftWidth={450}
          minLeftWidth={350}
          maxLeftWidth={700}
        />
      </Box>

      {/* 截图确认对话框 */}
      <Dialog
        open={screenshotDialog}
        onClose={() => setScreenshotDialog(false)}
        maxWidth="md"
      >
        <DialogTitle>截图已捕获</DialogTitle>
        <DialogContent>
          {currentScreenshot && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <img
                src={currentScreenshot.data}
                alt="截图"
                style={{ maxWidth: '100%', maxHeight: 400 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                第 {currentScreenshot.page} 页截图
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScreenshotDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleUseScreenshot}>
            使用此截图
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 主页面组件（带 Provider）
const ChemicalExtractionPage = () => {
  const { articleId } = useParams();

  return (
    <ChemicalExtractionProvider articleId={articleId}>
      <ExtractionPageContent />
    </ChemicalExtractionProvider>
  );
};

export default ChemicalExtractionPage;
