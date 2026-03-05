import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
} from '@mui/material';

/**
 * 实际坐标输入对话框
 * 用于输入坐标轴标定点的实际数值
 */
const CoordinateInputDialog = ({ open, onClose, onSave, initialValues }) => {
  const [values, setValues] = useState({
    originX: initialValues?.originX ?? 0,
    originY: initialValues?.originY ?? 0,
    xAxisValue: initialValues?.xAxisValue ?? 100,
    yAxisValue: initialValues?.yAxisValue ?? 100,
    xUnit: initialValues?.xUnit ?? '',
    yUnit: initialValues?.yUnit ?? '',
  });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setValues((prev) => ({
      ...prev,
      [field]: field.includes('Unit') ? value : parseFloat(value) || 0,
    }));
  };

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>输入实际坐标</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            请输入坐标轴标定点对应的实际数值，用于计算数据点的实际坐标。
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* 原点坐标 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              原点实际坐标
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="X 坐标"
              type="number"
              value={values.originX}
              onChange={handleChange('originX')}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Y 坐标"
              type="number"
              value={values.originY}
              onChange={handleChange('originY')}
            />
          </Grid>

          {/* X轴点 */}
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              X轴参考点实际值
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              size="small"
              label="数值"
              type="number"
              value={values.xAxisValue}
              onChange={handleChange('xAxisValue')}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              label="单位"
              value={values.xUnit}
              onChange={handleChange('xUnit')}
              placeholder="如: MPa"
            />
          </Grid>

          {/* Y轴点 */}
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Y轴参考点实际值
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              size="small"
              label="数值"
              type="number"
              value={values.yAxisValue}
              onChange={handleChange('yAxisValue')}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              label="单位"
              value={values.yUnit}
              onChange={handleChange('yUnit')}
              placeholder="如: %"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoordinateInputDialog;
