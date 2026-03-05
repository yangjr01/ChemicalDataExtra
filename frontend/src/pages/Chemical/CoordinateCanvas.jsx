import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Add as AddIcon,
  Straighten as StraightenIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useChemicalExtraction } from './ChemicalExtractionContext';
import CoordinateInputDialog from './CoordinateInputDialog';

/**
 * 坐标标定画布组件 - 重构版本
 * 
 * 流程：
 * 1. 坐标轴标定：标定原点、X轴点、Y轴点
 * 2. 输入实际坐标值
 * 3. 数据点标定：在曲线上点击标定数据点
 * 4. 系统自动计算实际坐标
 */
const CoordinateCanvas = ({
  imageSrc,
  width = 650,
  height = 450,
}) => {
  const {
    imageExtractionData,
    setAxisPoint,
    clearAxisPoints,
    setAxisValues,
    createNewCurve,
    selectCurve,
    addDataPoint,
    removeDataPoint,
    clearCurrentCurve,
    removeCurve,
    setExtractionStep,
    updateImageExtractionData,
  } = useChemicalExtraction();

  const {
    axisPoints,
    axisValues,
    curves,
    currentCurveIndex,
    extractionStep,
  } = imageExtractionData;

  const canvasRef = useRef(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [tempPoint, setTempPoint] = useState(null);
  const [showInputDialog, setShowInputDialog] = useState(false);

  // 获取当前曲线的数据点
  const getCurrentCurvePoints = () => {
    if (currentCurveIndex >= 0 && currentCurveIndex < curves.length) {
      return curves[currentCurveIndex].points;
    }
    return [];
  };

  // 计算实际坐标
  const calculateRealCoordinates = useCallback((pixelX, pixelY) => {
    if (!axisPoints.origin || !axisPoints.xAxis || !axisPoints.yAxis) {
      return null;
    }

    const { origin, xAxis, yAxis } = axisPoints;
    const { origin: originValue, xAxis: xAxisValue, yAxis: yAxisValue } = axisValues;

    // 计算像素距离
    const pixelDistX = Math.sqrt(
      Math.pow(xAxis.pixelX - origin.pixelX, 2) + 
      Math.pow(xAxis.pixelY - origin.pixelY, 2)
    );
    const pixelDistY = Math.sqrt(
      Math.pow(yAxis.pixelX - origin.pixelX, 2) + 
      Math.pow(yAxis.pixelY - origin.pixelY, 2)
    );

    if (pixelDistX === 0 || pixelDistY === 0) return null;

    // 计算当前点相对于原点的像素距离
    const currentDistX = pixelX - origin.pixelX;
    const currentDistY = origin.pixelY - pixelY;

    // 计算实际坐标
    const realX = originValue.x + (currentDistX / pixelDistX) * (xAxisValue - originValue.x);
    const realY = originValue.y + (currentDistY / pixelDistY) * (yAxisValue - originValue.y);

    return {
      x: Math.round(realX * 1000) / 1000,
      y: Math.round(realY * 1000) / 1000,
    };
  }, [axisPoints, axisValues]);

  // 绘制画布内容
  useEffect(() => {
    if (!canvasRef.current || !imageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制图片
    const img = new Image();
    img.onload = () => {
      // 计算缩放比例以适应画布
      const scaleX = width / img.width;
      const scaleY = height / img.height;
      const scale = Math.min(scaleX, scaleY);

      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // 保存绘图参数供后续使用
      canvas.drawParams = { scale, offsetX, offsetY, drawWidth, drawHeight };

      // 绘制坐标轴标定点
      drawAxisPoints(ctx);
      
      // 绘制数据点
      drawDataPoints(ctx);

      // 绘制临时点（鼠标位置）
      if (tempPoint) {
        drawTempPoint(ctx, tempPoint);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, axisPoints, curves, currentCurveIndex, tempPoint, width, height]);

  // 绘制坐标轴标定点
  const drawAxisPoints = (ctx) => {
    const pointRadius = 8;
    
    // 原点
    if (axisPoints.origin) {
      drawPoint(ctx, axisPoints.origin, pointRadius, '#4CAF50', 'O');
    }
    
    // X轴点
    if (axisPoints.xAxis) {
      drawPoint(ctx, axisPoints.xAxis, pointRadius, '#2196F3', 'X');
    }
    
    // Y轴点
    if (axisPoints.yAxis) {
      drawPoint(ctx, axisPoints.yAxis, pointRadius, '#FF9800', 'Y');
    }

    // 绘制连线
    if (axisPoints.origin && axisPoints.xAxis) {
      drawLine(ctx, axisPoints.origin, axisPoints.xAxis, '#2196F3');
    }
    if (axisPoints.origin && axisPoints.yAxis) {
      drawLine(ctx, axisPoints.origin, axisPoints.yAxis, '#FF9800');
    }
  };

  // 绘制数据点
  const drawDataPoints = (ctx) => {
    const currentPoints = getCurrentCurvePoints();
    
    curves.forEach((curve, curveIdx) => {
      const isCurrent = curveIdx === currentCurveIndex;
      const color = isCurrent ? '#f44336' : '#9e9e9e';
      
      curve.points.forEach((point, pointIdx) => {
        const isHovered = hoverPoint && hoverPoint.curveIndex === curveIdx && hoverPoint.pointIndex === pointIdx;
        drawPoint(ctx, point, isHovered ? 7 : 5, color, (pointIdx + 1).toString(), !isCurrent);
      });
    });
  };

  // 绘制点的辅助函数
  const drawPoint = (ctx, point, radius, color, label, dimmed = false) => {
    ctx.beginPath();
    ctx.arc(point.pixelX, point.pixelY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = dimmed ? color + '80' : color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制标签
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, point.pixelX, point.pixelY);
  };

  // 绘制线的辅助函数
  const drawLine = (ctx, start, end, color) => {
    ctx.beginPath();
    ctx.moveTo(start.pixelX, start.pixelY);
    ctx.lineTo(end.pixelX, end.pixelY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // 绘制临时点
  const drawTempPoint = (ctx, point) => {
    ctx.beginPath();
    ctx.arc(point.pixelX, point.pixelY, 5, 0, 2 * Math.PI);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // 处理画布点击
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;
    const point = { pixelX, pixelY };

    // 坐标轴标定模式
    if (extractionStep === 1) {
      if (!axisPoints.origin) {
        setAxisPoint('origin', point);
      } else if (!axisPoints.xAxis) {
        setAxisPoint('xAxis', point);
      } else if (!axisPoints.yAxis) {
        setAxisPoint('yAxis', point);
        // Y轴点标定完成，显示输入对话框
        setTimeout(() => setShowInputDialog(true), 100);
      }
      return;
    }

    // 数据点标定模式
    if (extractionStep === 2 && currentCurveIndex >= 0) {
      const realCoords = calculateRealCoordinates(pixelX, pixelY);
      if (realCoords) {
        addDataPoint({
          pixelX,
          pixelY,
          dataX: realCoords.x,
          dataY: realCoords.y,
        });
      }
    }
  };

  // 处理鼠标移动
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    setTempPoint({ pixelX, pixelY });

    // 检查是否悬停在数据点上
    const hoverRadius = 10;
    let found = null;
    
    curves.forEach((curve, curveIdx) => {
      curve.points.forEach((point, pointIdx) => {
        const dx = point.pixelX - pixelX;
        const dy = point.pixelY - pixelY;
        if (Math.sqrt(dx * dx + dy * dy) < hoverRadius) {
          found = { curveIndex: curveIdx, pointIndex: pointIdx };
        }
      });
    });
    
    setHoverPoint(found);
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setHoverPoint(null);
    setTempPoint(null);
  };

  // 处理右键点击（删除点）
  const handleContextMenu = (e) => {
    e.preventDefault();
    
    if (extractionStep === 2 && hoverPoint) {
      if (hoverPoint.curveIndex === currentCurveIndex) {
        removeDataPoint(hoverPoint.pointIndex);
      }
    }
  };

  // 开始提取流程
  const handleStartExtraction = () => {
    setExtractionStep(1);
  };

  // 撤销最后一个标定点
  const handleUndoAxisPoint = () => {
    if (axisPoints.yAxis) {
      setAxisPoint('yAxis', null);
    } else if (axisPoints.xAxis) {
      setAxisPoint('xAxis', null);
    } else if (axisPoints.origin) {
      setAxisPoint('origin', null);
    }
  };

  // 处理坐标值保存
  const handleSaveAxisValues = (values) => {
    setAxisValues(values);
    setExtractionStep(2);
    
    // 自动创建第一条曲线
    if (curves.length === 0) {
      createNewCurve('曲线 1');
    }
  };

  // 渲染状态提示
  const renderStatus = () => {
    if (!imageSrc) {
      return <Typography color="text.secondary">请先加载图片</Typography>;
    }

    if (extractionStep === 0) {
      return <Typography>点击"开始提取"开始坐标标定流程</Typography>;
    }

    if (extractionStep === 1) {
      if (!axisPoints.origin) {
        return <Typography color="primary">步骤 1/4: 请点击标定原点 (O)</Typography>;
      } else if (!axisPoints.xAxis) {
        return <Typography color="primary">步骤 2/4: 请点击标定X轴点 (X)</Typography>;
      } else if (!axisPoints.yAxis) {
        return <Typography color="primary">步骤 3/4: 请点击标定Y轴点 (Y)</Typography>;
      } else {
        return <Typography color="success.main">坐标轴标定完成，请输入实际坐标值</Typography>;
      }
    }

    if (extractionStep === 2) {
      const currentCurve = curves[currentCurveIndex];
      return (
        <Box>
          <Typography color="primary">
            数据点标定: 当前曲线 {currentCurve?.name || '无'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            已标定 {currentCurve?.points.length || 0} 个点
          </Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box>
      {/* 状态栏 */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
        {renderStatus()}
      </Box>

      {/* 工具栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {extractionStep === 0 && (
            <Button
              variant="contained"
              size="small"
              onClick={handleStartExtraction}
              startIcon={<StraightenIcon />}
            >
              开始提取
            </Button>
          )}
          
          {extractionStep === 1 && (
            <>
              <Tooltip title="撤销">
                <IconButton
                  size="small"
                  onClick={handleUndoAxisPoint}
                  disabled={!axisPoints.origin}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                onClick={clearAxisPoints}
                disabled={!axisPoints.origin}
              >
                清除标定
              </Button>
            </>
          )}

          {extractionStep === 2 && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => createNewCurve(`曲线 ${curves.length + 1}`)}
              >
                新建曲线
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => clearCurrentCurve()}
                disabled={!getCurrentCurvePoints().length}
              >
                清除当前曲线
              </Button>
            </>
          )}
        </Box>

        {/* 曲线选择 */}
        {extractionStep === 2 && curves.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {curves.map((curve, idx) => (
              <Chip
                key={curve.id}
                label={`${curve.name} (${curve.points.length})`}
                size="small"
                color={idx === currentCurveIndex ? 'primary' : 'default'}
                onClick={() => selectCurve(idx)}
                onDelete={curves.length > 1 ? () => removeCurve(idx) : undefined}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* 画布区域 */}
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          cursor: extractionStep >= 1 ? 'crosshair' : 'default',
          border: 2,
          borderColor: 'primary.main',
        }}
        onContextMenu={handleContextMenu}
      >
        {imageSrc ? (
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              width,
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
            }}
          >
            <Typography color="text.secondary">
              请先从 PDF 截图或上传图片
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 操作提示 */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {extractionStep === 1 && (
          <>
            <Typography variant="caption" color="text.secondary">
              • 依次点击标定：原点 → X轴点 → Y轴点
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • X轴点和Y轴点应分别在X轴和Y轴上，且与原点有明显距离
            </Typography>
          </>
        )}
        {extractionStep === 2 && (
          <>
            <Typography variant="caption" color="text.secondary">
              • 左键点击添加数据点，右键点击删除数据点
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • 可创建多条曲线分别提取不同数据系列
            </Typography>
          </>
        )}
      </Box>

      {/* 坐标输入对话框 */}
      <CoordinateInputDialog
        open={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onSave={handleSaveAxisValues}
        initialValues={axisValues}
      />
    </Box>
  );
};

export default CoordinateCanvas;
