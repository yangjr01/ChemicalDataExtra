import React, { useState, useRef, useEffect } from 'react';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useChemicalExtraction } from './ChemicalExtractionContext';
import CoordinateCanvas from './CoordinateCanvas';
import ChartPreview from './ChartPreview';
import { ChartSelector, MaterialSelector, CharacterizationSelector } from './ChartSelector';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

const ImageCalibrationPanel = () => {
  const { articleId } = useParams();
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

  // 表征数据相关状态
  const [characterizations, setCharacterizations] = useState([]);
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [charDataValues, setCharDataValues] = useState({}); // 存储提取的数据值 { charId: { value: '', unit: '', description: '' } }
  const [loadingChars, setLoadingChars] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [extractedValue, setExtractedValue] = useState('');
  const [extractedUnit, setExtractedUnit] = useState('');

  // 加载数据库中的表征数据
  useEffect(() => {
    loadCharacterizations();
  }, [articleId]);

  const loadCharacterizations = async () => {
    if (!articleId) return;
    
    setLoadingChars(true);
    try {
      const response = await fetch(`${API_BASE}/data/${articleId}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setCharacterizations(data.data.characterizations || []);
      }
    } catch (error) {
      console.error('加载表征数据失败:', error);
    } finally {
      setLoadingChars(false);
    }
  };

  // 保存提取的数据值到表征
  const saveValueToCharacterization = async (charId, value, unit) => {
    if (!charId || !value) return;

    const char = characterizations.find(c => c.id === charId);
    if (!char) return;

    try {
      // 解析现有 results 或创建新的
      let results = {};
      if (char.results) {
        try {
          results = typeof char.results === 'string' ? JSON.parse(char.results) : char.results;
        } catch (e) {
          results = {};
        }
      }

      // 添加从图片提取的数据值
      results.imageExtractedValue = value;
      results.imageExtractedUnit = unit;
      results.extractionTimestamp = new Date().toISOString();

      const response = await fetch(`${API_BASE}/data/characterization/${charId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          ...char,
          results: JSON.stringify(results),
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地数据
        setCharDataValues(prev => ({
          ...prev,
          [charId]: { value, unit, timestamp: new Date().toISOString() }
        }));
        // 刷新列表
        loadCharacterizations();
        return true;
      }
    } catch (error) {
      console.error('保存数据值失败:', error);
    }
    return false;
  };

  // 处理从曲线提取数据值
  const handleExtractFromCurve = () => {
    if (curves.length === 0 || curves[0].points.length === 0) {
      alert('请先在图片中标定至少一个数据点');
      return;
    }

    if (!selectedCharId) {
      alert('请先选择要填充的表征数据');
      return;
    }

    // 获取第一个曲线的第一个点作为示例
    const firstCurve = curves[0];
    const firstPoint = firstCurve.points[0];
    
    setExtractedValue(firstPoint.dataY.toFixed(2));
    setExtractedUnit(axisValues.yUnit || '');
    setEditingChar(selectedCharId);
    setEditDialogOpen(true);
  };

  // 确认保存提取的值
  const handleConfirmExtract = async () => {
    if (!editingChar || !extractedValue) return;

    const success = await saveValueToCharacterization(
      editingChar,
      extractedValue,
      extractedUnit
    );

    if (success) {
      setEditDialogOpen(false);
      setEditingChar(null);
      setExtractedValue('');
      setExtractedUnit('');
      alert('数据值已成功保存到表征！');
    } else {
      alert('保存失败，请重试');
    }
  };

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

  // 获取已保存的表征数据值显示
  const getCharExtractedValue = (char) => {
    if (!char.results) return null;
    try {
      const results = typeof char.results === 'string' ? JSON.parse(char.results) : char.results;
      if (results.imageExtractedValue) {
        return `${results.imageExtractedValue} ${results.imageExtractedUnit || ''}`;
      }
    } catch (e) {}
    return null;
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

      {/* 表征数据选择区域 */}
      <Card sx={{ mb: 2, bgcolor: 'primary.lighter' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary.main">
            数据库表征数据
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择已保存在数据库中的表征数据，从图片中提取具体数值并填充
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <CharacterizationSelector
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                characterizations={characterizations}
                label="选择要填充的表征数据"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleExtractFromCurve}
                disabled={!selectedCharId || curves.length === 0 || curves[0].points.length === 0}
                fullWidth
              >
                从图片提取数据值
              </Button>
            </Grid>
          </Grid>

          {/* 显示已有提取值的表征 */}
          {characterizations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                已有提取值的表征：
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {characterizations.map((char) => {
                  const extractedValue = getCharExtractedValue(char);
                  if (!extractedValue) return null;
                  return (
                    <Paper
                      key={char.id}
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'success.lighter',
                        border: 1,
                        borderColor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CheckIcon color="success" fontSize="small" />
                      <Typography variant="body2">
                        <strong>{char.technique}</strong>: {extractedValue}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

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

      {/* 提取数据值对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          提取数据值到表征
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将从图片中提取的数据值保存到选中的表征数据中
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="数据值"
                value={extractedValue}
                onChange={(e) => setExtractedValue(e.target.value)}
                placeholder="例如：42.5"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="单位"
                value={extractedUnit}
                onChange={(e) => setExtractedUnit(e.target.value)}
                placeholder="例如：dB, MPa, °C"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleConfirmExtract} variant="contained" color="primary">
            保存到表征
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageCalibrationPanel;
