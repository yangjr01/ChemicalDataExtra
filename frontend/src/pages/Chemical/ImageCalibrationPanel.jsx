import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useChemicalExtraction } from './ChemicalExtractionContext';
import CoordinateCanvas from './CoordinateCanvas';
import ChartPreview from './ChartPreview';
import { ChartSelector, MaterialSelector } from './ChartSelector';

const ImageCalibrationPanel = () => {
  const {
    imageExtractionData,
    updateImageExtractionData,
    resetImageExtractionData,
    saveImageExtractionToDB,
  } = useChemicalExtraction();

  const { selectedChartId, selectedMaterialId, screenshot, curves, axisPoints, axisValues } =
    imageExtractionData;

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // 处理图片上传
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        resetImageExtractionData();
        updateImageExtractionData({
          screenshot: event.target.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 触发文件选择
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 获取所有数据点总数
  const getTotalPoints = () => {
    return curves.reduce((total, curve) => total + curve.points.length, 0);
  };

  // 保存提取数据
  const handleSave = async () => {
    if (!screenshot) {
      alert('请先上传或截图图片');
      return;
    }

    if (!axisPoints.origin || !axisPoints.xAxis || !axisPoints.yAxis) {
      alert('请先完成坐标轴标定');
      return;
    }

    if (curves.length === 0 || getTotalPoints() < 2) {
      alert('请至少标定 2 个数据点');
      return;
    }

    setSaving(true);
    setSaveSuccess(null);

    try {
      const allCoordinates = [];
      curves.forEach((curve) => {
        curve.points.forEach((point) => {
          allCoordinates.push({
            x: point.dataX,
            y: point.dataY,
            curve: curve.name,
          });
        });
      });

      const result = await saveImageExtractionToDB({
        chartId: selectedChartId,
        materialId: selectedMaterialId,
        coordinates: allCoordinates,
        axisPoints,
        axisValues,
        curves: curves.map(c => ({ name: c.name, pointCount: c.points.length })),
        screenshot,
      });

      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setSaveSuccess(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      setSaveSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  // 导出数据
  const handleExport = () => {
    if (curves.length === 0) return;

    let csvContent = '# 坐标轴信息\n';
    csvContent += `# 原点：(${axisPoints.origin?.pixelX}, ${axisPoints.origin?.pixelY}) -> (${axisValues.origin.x}, ${axisValues.origin.y})\n`;
    csvContent += `# X 轴点：(${axisPoints.xAxis?.pixelX}, ${axisPoints.xAxis?.pixelY}) -> ${axisValues.xAxis} ${axisValues.xUnit}\n`;
    csvContent += `# Y 轴点：(${axisPoints.yAxis?.pixelX}, ${axisPoints.yAxis?.pixelY}) -> ${axisValues.yAxis} ${axisValues.yUnit}\n\n`;

    curves.forEach((curve) => {
      if (curve.points.length > 0) {
        csvContent += `# ${curve.name}\n`;
        csvContent += 'Index,X,Y\n';
        curve.points.forEach((p, i) => {
          csvContent += `${i + 1},${p.dataX},${p.dataY}\n`;
        });
        csvContent += '\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extracted_data_${Date.now()}.csv`;
    link.click();
  };

  return (
    <Box sx={{ p: 2 }}>
      {saveSuccess === true && (
        <Alert severity="success" sx={{ mb: 2 }}>
          数据保存成功！
        </Alert>
      )}
      {saveSuccess === false && (
        <Alert severity="error" sx={{ mb: 2 }}>
          数据保存失败，请重试
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <ChartSelector
            value={selectedChartId}
            onChange={(e) =>
              updateImageExtractionData({ selectedChartId: e.target.value })
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MaterialSelector
            value={selectedMaterialId}
            onChange={(e) =>
              updateImageExtractionData({ selectedMaterialId: e.target.value })
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                图片数据提取
              </Typography>

              {!screenshot && (
                <Box
                  sx={{
                    mb: 2,
                    p: 3,
                    border: 2,
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.lighter',
                    },
                  }}
                  onClick={handleUploadClick}
                >
                  <ImageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography>点击上传图片</Typography>
                  <Typography variant="caption" color="text.secondary">
                    或从 PDF 截图
                  </Typography>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                  />
                </Box>
              )}

              {screenshot && (
                <CoordinateCanvas
                  imageSrc={screenshot}
                  width={650}
                  height={450}
                />
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={handleUploadClick}
                >
                  上传图片
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || getTotalPoints() < 2}
                >
                  {saving ? '保存中...' : '保存提取数据'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={getTotalPoints() === 0}
                >
                  导出 CSV
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                坐标数据 ({getTotalPoints()} 个点，{curves.length} 条曲线)
              </Typography>
              {curves.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width={80}>曲线</TableCell>
                        <TableCell width={50}>序号</TableCell>
                        <TableCell>X 值</TableCell>
                        <TableCell>Y 值</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {curves.map((curve) =>
                        curve.points.map((point, index) => (
                          <TableRow key={`${curve.id}-${index}`}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {curve.name}
                            </TableCell>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{point.dataX.toFixed(4)}</TableCell>
                            <TableCell>{point.dataY.toFixed(4)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 2, textAlign: 'center' }}
                >
                  暂无标定的坐标点
                </Typography>
              )}
            </CardContent>
          </Card>

          {axisPoints.origin && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  坐标轴标定信息
                </Typography>
                <Box sx={{ fontSize: '0.875rem' }}>
                  <Typography variant="body2" color="text.secondary">
                    原点：({axisPoints.origin.pixelX.toFixed(1)}, {axisPoints.origin.pixelY.toFixed(1)}) → ({axisValues.origin.x}, {axisValues.origin.y})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    X 轴点：({axisPoints.xAxis?.pixelX.toFixed(1)}, {axisPoints.xAxis?.pixelY.toFixed(1)}) → {axisValues.xAxis} {axisValues.xUnit}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Y 轴点：({axisPoints.yAxis?.pixelX.toFixed(1)}, {axisPoints.yAxis?.pixelY.toFixed(1)}) → {axisValues.yAxis} {axisValues.yUnit}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <ChartPreview />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImageCalibrationPanel;
