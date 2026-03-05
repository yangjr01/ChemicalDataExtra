import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { useChemicalExtraction } from './ChemicalExtractionContext';

/**
 * 图表选择器组件
 * 从第 1 部分提取的图表列表中选择
 */
export const ChartSelector = ({ value, onChange, label = '选择图表' }) => {
  const { textExtractionResult } = useChemicalExtraction();
  const { charts = [] } = textExtractionResult;

  if (charts.length === 0) {
    return (
      <TextField
        fullWidth
        size="small"
        disabled
        value="请先在第 1 部分提取图表信息"
        InputProps={{
          readOnly: true,
        }}
      />
    );
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={onChange}>
        {charts.map((chart, index) => (
          <MenuItem key={chart.id || index} value={chart.id || index}>
            {chart.chartNo || chart.figureNo || chart.name || `图表 ${index + 1}`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

/**
 * 材料选择器组件
 * 从第 1 部分提取的材料列表中选择
 */
export const MaterialSelector = ({ value, onChange, label = '选择材料' }) => {
  const { textExtractionResult } = useChemicalExtraction();
  const { materials = [] } = textExtractionResult;

  if (materials.length === 0) {
    return (
      <TextField
        fullWidth
        size="small"
        disabled
        value="请先在第 1 部分提取材料信息"
        InputProps={{
          readOnly: true,
        }}
      />
    );
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={onChange}>
        {materials.map((material, index) => (
          <MenuItem key={material.id || index} value={material.id || index}>
            {material.name || `材料 ${index + 1}`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default { ChartSelector, MaterialSelector };
