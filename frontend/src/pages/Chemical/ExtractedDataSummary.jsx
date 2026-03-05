import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
  Science as MaterialIcon,
  Settings as ProcessIcon,
  Assessment as ChartIcon,
  Analytics as CharacterizationIcon,
} from '@mui/icons-material';
import { useChemicalExtraction } from './ChemicalExtractionContext';

/**
 * 已提取数据预览组件
 * 显示四类数据的统计卡片，支持展开查看详情
 */
const ExtractedDataSummary = () => {
  const { savedData, textExtractionResult } = useChemicalExtraction();

  const [expandedCard, setExpandedCard] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // 数据统计
  const stats = {
    materials: {
      label: '材料',
      count: savedData.materials?.length || 0,
      icon: <MaterialIcon />,
      color: 'primary',
      data: savedData.materials || [],
    },
    processes: {
      label: '工艺',
      count: savedData.processes?.length || 0,
      icon: <ProcessIcon />,
      color: 'success',
      data: savedData.processes || [],
    },
    charts: {
      label: '图表',
      count: savedData.charts?.length || 0,
      icon: <ChartIcon />,
      color: 'info',
      data: savedData.charts || [],
    },
    characterizations: {
      label: '表征数据',
      count: savedData.characterizations?.length || 0,
      icon: <CharacterizationIcon />,
      color: 'warning',
      data: savedData.characterizations || [],
    },
  };

  // 展开/收起卡片
  const handleToggleCard = (key) => {
    setExpandedCard(expandedCard === key ? null : key);
  };

  // 查看详情
  const handleViewDetail = (key, data) => {
    setDetailDialog(key);
    setDetailData(data);
  };

  // 关闭详情对话框
  const handleCloseDialog = () => {
    setDetailDialog(null);
    setDetailData(null);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        已提取数据预览
      </Typography>

      <Grid container spacing={2}>
        {Object.entries(stats).map(([key, stat]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {stat.icon}
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                  <Chip
                    label={stat.count}
                    color={stat.count > 0 ? stat.color : 'default'}
                    size="small"
                  />
                </Box>

                {stat.count > 0 ? (
                  <>
                    {/* 简要预览 */}
                    <Box sx={{ mt: 2, mb: 2 }}>
                      {stat.data.slice(0, 2).map((item, index) => (
                        <Chip
                          key={index}
                          label={
                            stat.label === '材料'
                              ? item.name
                              : stat.label === '工艺'
                              ? item.name
                              : stat.label === '图表'
                              ? item.chartNo || item.name
                              : item.technique
                          }
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {stat.count > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          还有 {stat.count - 2} 项...
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={
                          expandedCard === key ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )
                        }
                        onClick={() => handleToggleCard(key)}
                      >
                        {expandedCard === key ? '收起' : '展开'}
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewDetail(key, stat.data)}
                      >
                        详情
                      </Button>
                    </Box>

                    {/* 展开详情 */}
                    <Collapse in={expandedCard === key}>
                      <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  {stat.label === '材料'
                                    ? '名称'
                                    : stat.label === '工艺'
                                    ? '步骤'
                                    : stat.label === '图表'
                                    ? '编号'
                                    : '技术'}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {stat.data.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {stat.label === '材料'
                                      ? item.name
                                      : stat.label === '工艺'
                                      ? `${item.sequence || index + 1}. ${item.name}`
                                      : stat.label === '图表'
                                      ? item.chartNo || item.name
                                      : item.technique}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Collapse>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    暂无数据
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 详情对话框 */}
      {detailDialog && detailData && (
        <Dialog
          open={true}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {stats[detailDialog].label}详情 ({detailData.length} 项)
          </DialogTitle>
          <DialogContent>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {detailDialog === 'materials' && (
                      <>
                        <TableCell>名称</TableCell>
                        <TableCell>化学式</TableCell>
                        <TableCell>组成</TableCell>
                        <TableCell>属性</TableCell>
                      </>
                    )}
                    {detailDialog === 'processes' && (
                      <>
                        <TableCell>序号</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell>描述</TableCell>
                      </>
                    )}
                    {detailDialog === 'charts' && (
                      <>
                        <TableCell>编号</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell>描述</TableCell>
                      </>
                    )}
                    {detailDialog === 'characterizations' && (
                      <>
                        <TableCell>技术</TableCell>
                        <TableCell>条件</TableCell>
                        <TableCell>结果</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailData.map((item, index) => (
                    <TableRow key={index}>
                      {detailDialog === 'materials' && (
                        <>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.formula || '-'}</TableCell>
                          <TableCell>
                            {item.composition
                              ? Object.entries(item.composition)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .slice(0, 2)
                                  .join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {item.properties
                              ? Object.entries(item.properties)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .slice(0, 2)
                                  .join(', ')
                              : '-'}
                          </TableCell>
                        </>
                      )}
                      {detailDialog === 'processes' && (
                        <>
                          <TableCell>{item.sequence || index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            {(item.description || '').substring(0, 50)}
                            {item.description && item.description.length > 50
                              ? '...'
                              : ''}
                          </TableCell>
                        </>
                      )}
                      {detailDialog === 'charts' && (
                        <>
                          <TableCell>{item.chartNo || '-'}</TableCell>
                          <TableCell>{item.name || '-'}</TableCell>
                          <TableCell>
                            {(item.description || '').substring(0, 50)}
                            {item.description && item.description.length > 50
                              ? '...'
                              : ''}
                          </TableCell>
                        </>
                      )}
                      {detailDialog === 'characterizations' && (
                        <>
                          <TableCell>{item.technique}</TableCell>
                          <TableCell>
                            {item.conditions
                              ? JSON.stringify(item.conditions).substring(0, 30)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {item.results
                              ? JSON.stringify(item.results).substring(0, 30)
                              : '-'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default ExtractedDataSummary;
