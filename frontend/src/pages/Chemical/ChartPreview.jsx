import React from 'react';
import { Card, CardContent, Typography, Box, Tabs, Tab } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useChemicalExtraction } from './ChemicalExtractionContext';

/**
 * 曲线预览组件 - 支持多曲线
 */
const ChartPreview = () => {
  const { imageExtractionData } = useChemicalExtraction();
  const { curves, axisValues } = imageExtractionData;

  // 检查是否有数据
  const hasData = curves && curves.length > 0 && curves.some(c => c.points && c.points.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.50',
            }}
          >
            <Typography color="text.secondary">
              请先标定坐标点，此处将显示曲线预览
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          曲线预览
        </Typography>
        <MultiCurveChart curves={curves} axisValues={axisValues} />
      </CardContent>
    </Card>
  );
};

/**
 * 多曲线图表组件
 */
const MultiCurveChart = ({ curves, axisValues }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  // 过滤出有数据的曲线
  const validCurves = curves.filter(c => c.points && c.points.length > 0);

  if (validCurves.length === 0) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
        <Typography color="text.secondary">暂无数据</Typography>
      </Box>
    );
  }

  const currentCurve = validCurves[activeTab] || validCurves[0];
  const chartData = currentCurve.points.map((point, index) => ({
    index,
    x: point.dataX,
    y: point.dataY,
    label: `点 ${index + 1}`,
  })).sort((a, b) => a.x - b.x);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00ff00'];

  return (
    <Box>
      {validCurves.length > 1 && (
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 1 }}
        >
          {validCurves.map((curve, idx) => (
            <Tab key={curve.id} label={`${curve.name} (${curve.points.length})`} />
          ))}
        </Tabs>
      )}

      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              label={{ 
                value: axisValues.xUnit || 'X 轴', 
                position: 'insideBottom', 
                offset: -10 
              }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              dataKey="y"
              type="number"
              label={{ 
                value: axisValues.yUnit || 'Y 轴', 
                angle: -90, 
                position: 'insideLeft' 
              }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip
              labelFormatter={(value) => `X: ${value.toFixed(4)}`}
              formatter={(value, name) => [value.toFixed(4), name === 'y' ? 'Y' : 'X']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="y"
              stroke={colors[activeTab % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={currentCurve.name}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default ChartPreview;
