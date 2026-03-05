/**
 * PDFViewer 组件 - 支持框选截图功能
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  ZoomIn,
  ZoomOut,
  FitScreen,
  CropFree,
  Check,
  Close,
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({
  pdfUrl,
  onPageChange,
  onScreenshot,
  initialPage = 1,
}) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [pageJumpDialog, setPageJumpDialog] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const scrollRef = useRef(null);
  
  // 使用 ref 保存最新状态，供事件处理器使用
  const cropModeRef = useRef(cropMode);
  const cropStartRef = useRef(cropStart);
  const cropEndRef = useRef(cropEnd);
  
  // 同步 ref 和 state
  useEffect(() => {
    cropModeRef.current = cropMode;
  }, [cropMode]);
  
  useEffect(() => {
    cropStartRef.current = cropStart;
  }, [cropStart]);
  
  useEffect(() => {
    cropEndRef.current = cropEnd;
  }, [cropEnd]);

  // PDF 加载成功
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(initialPage);
    setLoading(false);
    onPageChange?.(initialPage);
  };

  // PDF 加载失败
  const onDocumentLoadError = (error) => {
    console.error('PDF 加载失败:', error);
    setLoading(false);
    showSnackbar('PDF 加载失败', 'error');
  };

  // 显示提示
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 上一页
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      onPageChange?.(currentPage - 1);
    }
  };

  // 下一页
  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
      onPageChange?.(currentPage + 1);
    }
  };

  // 跳转页面
  const goToPage = () => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
      onPageChange?.(page);
      setPageJumpDialog(false);
      setPageInput('');
    }
  };

  // 放大 - 使用按钮控制
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  }, []);

  // 缩小
  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  // 适应屏幕
  const fitToScreen = () => {
    setScale(1.0);
  };

  // 切换裁剪模式
  const toggleCropMode = () => {
    if (cropMode) {
      setCropMode(false);
      setCropStart(null);
      setCropEnd(null);
    } else {
      setCropMode(true);
      showSnackbar('请在 PDF 上拖动鼠标框选要截图的区域', 'info');
    }
  };

  // 处理鼠标按下
  const handleMouseDown = (e) => {
    console.log('MouseDown triggered', { cropMode: cropModeRef.current, button: e.button, target: e.target.tagName });
    
    if (!cropModeRef.current || e.button !== 0) {
      console.log('MouseDown ignored: cropMode or button check failed');
      return;
    }

    // 获取 canvas 元素
    const canvasEl = pageRef.current?.querySelector('.react-pdf__page__canvas') || 
                     pageRef.current?.querySelector('canvas');
    
    if (!canvasEl) {
      console.log('Canvas element not found');
      return;
    }

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查点击是否在 canvas 范围内
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      console.log('Click outside canvas bounds');
      return;
    }

    console.log('鼠标按下成功:', { x, y, rect });
    setCropStart({ x, y });
    
    // 阻止事件冒泡
    e.stopPropagation();
  };

  // 处理鼠标移动
  const handleMouseMove = (e) => {
    if (!cropModeRef.current || !cropStartRef.current) return;

    const canvasEl = pageRef.current?.querySelector('.react-pdf__page__canvas') || 
                     pageRef.current?.querySelector('canvas');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    setCropEnd({ x, y });
  };

  // 处理鼠标释放
  const handleMouseUp = async (e) => {
    const currentCropMode = cropModeRef.current;
    const currentStart = cropStartRef.current;
    const currentEnd = cropEndRef.current;
    
    console.log('MouseUp triggered', { cropMode: currentCropMode, cropStart: currentStart, cropEnd: currentEnd });
    
    if (!currentCropMode || !currentStart) {
      console.log('MouseUp ignored: not in crop mode or no start position');
      return;
    }

    // 如果没有 cropEnd，使用当前鼠标位置
    let endPos = currentEnd;
    if (!endPos && e) {
      const canvasEl = pageRef.current?.querySelector('.react-pdf__page__canvas') || 
                       pageRef.current?.querySelector('canvas');
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        endPos = {
          x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
          y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        };
      }
    }

    if (!endPos) {
      console.log('No end position available');
      setCropStart(null);
      return;
    }

    const width = Math.abs(endPos.x - currentStart.x);
    const height = Math.abs(endPos.y - currentStart.y);

    console.log('裁剪区域:', { start: currentStart, end: endPos, width, height });

    if (width < 10 || height < 10) {
      showSnackbar('选择区域太小，请重新选择', 'warning');
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    try {
      setLoading(true);

      const canvasEl = pageRef.current?.querySelector('.react-pdf__page__canvas') || 
                       pageRef.current?.querySelector('canvas');
      if (!canvasEl) {
        throw new Error('未找到 PDF 画布');
      }

      const x = Math.min(currentStart.x, endPos.x);
      const y = Math.min(currentStart.y, endPos.y);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width * 2;
      tempCanvas.height = height * 2;
      const ctx = tempCanvas.getContext('2d');

      ctx.drawImage(
        canvasEl,
        x, y, width, height,
        0, 0, tempCanvas.width, tempCanvas.height
      );

      const screenshotData = tempCanvas.toDataURL('image/png');
      console.log('截图成功，数据长度:', screenshotData.length);

      onScreenshot?.(screenshotData, currentPage);

      setCropMode(false);
      setCropStart(null);
      setCropEnd(null);
      showSnackbar('截图成功！', 'success');
    } catch (error) {
      console.error('截图失败:', error);
      showSnackbar('截图失败：' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 计算裁剪框样式
  const getCropStyle = () => {
    if (!cropStart || !cropEnd) return {};
    const left = Math.min(cropStart.x, cropEnd.x);
    const top = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    return { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` };
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut]);

  // 全局鼠标事件监听（用于截图模式）
  useEffect(() => {
    if (!cropMode) return;

    console.log('Setting up global mouse listeners for crop mode');

    const handleGlobalMouseUp = (e) => {
      console.log('Global mouse up');
      // 使用 setTimeout 确保在 state 更新后再执行
      setTimeout(() => handleMouseUp(e), 0);
    };

    const handleGlobalMouseMove = (e) => {
      handleMouseMove(e);
    };

    // 使用 capture 阶段确保能捕获到事件
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('mousemove', handleGlobalMouseMove, true);

    return () => {
      console.log('Cleaning up global mouse listeners');
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('mousemove', handleGlobalMouseMove, true);
    };
  }, [cropMode]); // 只在 cropMode 变化时重新设置

  return (
    <Paper
      elevation={3}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* 工具栏 */}
      <Box
        sx={{
          p: 1, borderBottom: 1, borderColor: 'divider',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap',
        }}
      >
        {/* 翻页 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="上一页"><IconButton size="small" onClick={goToPrevPage} disabled={currentPage <= 1}><NavigateBefore /></IconButton></Tooltip>
          <Tooltip title="下一页"><IconButton size="small" onClick={goToNextPage} disabled={currentPage >= numPages}><NavigateNext /></IconButton></Tooltip>
          <Typography variant="body2" sx={{ mx: 1, minWidth: 80, textAlign: 'center' }}>{currentPage} / {numPages || '-'}</Typography>
          <Tooltip title="跳转页面"><IconButton size="small" onClick={() => { setPageInput(currentPage.toString()); setPageJumpDialog(true); }}><FitScreen fontSize="small" /></IconButton></Tooltip>
        </Box>

        {/* 缩放 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="缩小 (Ctrl+-)"><IconButton size="small" onClick={zoomOut} disabled={scale <= 0.25}><ZoomOut fontSize="small" /></IconButton></Tooltip>
          <Box sx={{ minWidth: 70, textAlign: 'center' }}>
            <TextField size="small" type="number" value={Math.round(scale * 100)}
              onChange={(e) => { const v = parseInt(e.target.value); if (v >= 25 && v <= 500) setScale(v / 100); }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment>, inputProps: { min: 25, max: 500 }, sx: { textAlign: 'center', fontSize: '0.875rem' } }}
              sx={{ '& .MuiOutlinedInput-input': { py: 0.75 } }} />
          </Box>
          <Tooltip title="放大 (Ctrl+=)"><IconButton size="small" onClick={zoomIn} disabled={scale >= 5}><ZoomIn fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="适应屏幕"><IconButton size="small" onClick={fitToScreen}><FitScreen fontSize="small" /></IconButton></Tooltip>
        </Box>

        {/* 截图按钮 */}
        <Button variant={cropMode ? 'contained' : 'outlined'} size="small"
          startIcon={cropMode ? <Check fontSize="small" /> : <CropFree fontSize="small" />}
          onClick={toggleCropMode} disabled={loading || !numPages} color={cropMode ? 'warning' : 'primary'}>
          {cropMode ? '取消' : '框选截图'}
        </Button>
      </Box>

      {/* PDF 内容区 */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
          p: 2, bgcolor: '#f5f5f5', cursor: cropMode ? 'crosshair' : 'default',
          position: 'relative',
          '& .react-pdf__Page': {
            position: 'relative',
          },
          '& .react-pdf__Page__canvas': {
            userSelect: 'none',
          },
          '& .react-pdf__Page__annotations': {
            pointerEvents: cropMode ? 'none' : 'auto',
          },
          '& .react-pdf__Page__textContent': {
            pointerEvents: cropMode ? 'none' : 'auto',
          },
        }}
        onMouseDown={handleMouseDown}
      >
        <Box ref={containerRef} sx={{ position: 'relative' }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <Box sx={{ py: 4, textAlign: 'center' }}>
                {loading ? <CircularProgress /> : <Typography color="text.secondary">请上传 PDF 文件</Typography>}
              </Box>
            }
          >
            <div ref={pageRef}>
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={true}
                loading=""
                canvasRef={(canvas) => {
                  if (canvas) {
                    console.log('Canvas ref set:', canvas);
                  }
                }}
              />
            </div>
          </Document>

          {/* 裁剪框 */}
          {cropMode && cropStart && cropEnd && (
            <Box
              sx={{
                position: 'absolute', top: 0, left: 0,
                border: 2, borderColor: 'primary.main',
                bgcolor: 'rgba(25, 118, 210, 0.2)',
                pointerEvents: 'none',
                zIndex: 100,
                ...getCropStyle(),
              }}
            />
          )}
        </Box>

        {/* 裁剪提示 */}
        {cropMode && (
          <Box
            sx={{
              position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)',
              bgcolor: 'warning.main', color: 'warning.contrastText',
              px: 2, py: 1, borderRadius: 1, zIndex: 1000,
              display: 'flex', alignItems: 'center', gap: 1, boxShadow: 2,
            }}
          >
            <CropFree fontSize="small" />
            <Typography variant="body2">拖动鼠标框选区域，松开完成截图</Typography>
            <IconButton size="small" onClick={() => { setCropMode(false); setCropStart(null); setCropEnd(null); }} sx={{ color: 'inherit', ml: 1 }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* 页面跳转对话框 */}
      <Dialog open={pageJumpDialog} onClose={() => setPageJumpDialog(false)}>
        <DialogTitle>跳转页面</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth type="number" label="页码" value={pageInput}
            onChange={(e) => setPageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && goToPage()}
            InputProps={{ inputProps: { min: 1, max: numPages }, startAdornment: <InputAdornment position="start">页</InputAdornment> }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPageJumpDialog(false)}>取消</Button>
          <Button variant="contained" onClick={goToPage}>跳转</Button>
        </DialogActions>
      </Dialog>

      {/* 提示 */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
};

export default PDFViewer;
