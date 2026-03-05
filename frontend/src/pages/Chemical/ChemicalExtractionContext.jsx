import React, { createContext, useState, useContext, useCallback } from 'react';
import { baseHeaders } from '../../utils/request';

const API_BASE = '/api/chemical';

const ChemicalExtractionContext = createContext();

/**
 * 化学提取状态管理 Provider
 * 管理两阶段提取流程的状态和数据流
 */
export function ChemicalExtractionProvider({ children, articleId }) {
  // 文献信息
  const [article, setArticle] = useState(null);

  // 第 1 部分：文本提取结果
  const [textExtractionResult, setTextExtractionResult] = useState({
    materials: [],       // 材料列表
    processes: [],       // 工艺列表
    charts: [],          // 图表列表
    characterizations: [], // 表征列表
  });

  // 第 2 部分：图片提取数据 - 重构为支持坐标轴标定
  const [imageExtractionData, setImageExtractionData] = useState({
    selectedChartId: null,
    selectedMaterialId: null,
    screenshot: null,           // 截图图片 base64
    
    // 坐标轴标定点（像素坐标）
    axisPoints: {
      origin: null,     // { pixelX, pixelY }
      xAxis: null,      // { pixelX, pixelY }
      yAxis: null,      // { pixelX, pixelY }
    },
    
    // 实际坐标值
    axisValues: {
      origin: { x: 0, y: 0 },
      xAxis: 100,
      yAxis: 100,
      xUnit: '',
      yUnit: '',
    },
    
    // 多曲线数据
    curves: [],  // [{ id, name, points: [{ pixelX, pixelY, dataX, dataY }] }]
    currentCurveIndex: -1,
    
    // 流程状态
    extractionStep: 0,  // 0: 未开始, 1: 坐标轴标定, 2: 数据点标定, 3: 完成
  });

  // 已保存到数据库的数据
  const [savedData, setSavedData] = useState({
    materials: [],
    processes: [],
    charts: [],
    characterizations: [],
  });

  // 加载状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 更新文本提取结果
  const updateTextExtractionResult = useCallback((data) => {
    setTextExtractionResult((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  // 清空文本提取结果
  const clearTextExtractionResult = useCallback(() => {
    setTextExtractionResult({
      materials: [],
      processes: [],
      charts: [],
      characterizations: [],
    });
  }, []);

  // 更新图片提取数据
  const updateImageExtractionData = useCallback((data) => {
    setImageExtractionData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  // 重置图片提取数据
  const resetImageExtractionData = useCallback(() => {
    setImageExtractionData({
      selectedChartId: null,
      selectedMaterialId: null,
      screenshot: null,
      axisPoints: {
        origin: null,
        xAxis: null,
        yAxis: null,
      },
      axisValues: {
        origin: { x: 0, y: 0 },
        xAxis: 100,
        yAxis: 100,
        xUnit: '',
        yUnit: '',
      },
      curves: [],
      currentCurveIndex: -1,
      extractionStep: 0,
    });
  }, []);

  // 设置坐标轴标定点
  const setAxisPoint = useCallback((pointType, point) => {
    setImageExtractionData((prev) => ({
      ...prev,
      axisPoints: {
        ...prev.axisPoints,
        [pointType]: point,
      },
    }));
  }, []);

  // 清除坐标轴标定点
  const clearAxisPoints = useCallback(() => {
    setImageExtractionData((prev) => ({
      ...prev,
      axisPoints: {
        origin: null,
        xAxis: null,
        yAxis: null,
      },
      extractionStep: 1,
    }));
  }, []);

  // 设置实际坐标值
  const setAxisValues = useCallback((values) => {
    setImageExtractionData((prev) => ({
      ...prev,
      axisValues: {
        ...prev.axisValues,
        ...values,
      },
    }));
  }, []);

  // 创建新曲线
  const createNewCurve = useCallback((name) => {
    setImageExtractionData((prev) => {
      const newCurve = {
        id: Date.now(),
        name: name || `曲线 ${prev.curves.length + 1}`,
        points: [],
      };
      return {
        ...prev,
        curves: [...prev.curves, newCurve],
        currentCurveIndex: prev.curves.length,
      };
    });
  }, []);

  // 切换当前曲线
  const selectCurve = useCallback((index) => {
    setImageExtractionData((prev) => ({
      ...prev,
      currentCurveIndex: index,
    }));
  }, []);

  // 添加数据点到当前曲线
  const addDataPoint = useCallback((point) => {
    setImageExtractionData((prev) => {
      if (prev.currentCurveIndex < 0 || prev.currentCurveIndex >= prev.curves.length) {
        return prev;
      }
      
      const newCurves = [...prev.curves];
      const currentCurve = { ...newCurves[prev.currentCurveIndex] };
      
      // 计算实际坐标
      const realCoords = calculateRealCoordinates(
        point.pixelX,
        point.pixelY,
        prev.axisPoints,
        prev.axisValues
      );
      
      currentCurve.points = [...currentCurve.points, {
        ...point,
        dataX: realCoords.x,
        dataY: realCoords.y,
      }];
      
      newCurves[prev.currentCurveIndex] = currentCurve;
      
      return {
        ...prev,
        curves: newCurves,
      };
    });
  }, []);

  // 从当前曲线删除数据点
  const removeDataPoint = useCallback((pointIndex) => {
    setImageExtractionData((prev) => {
      if (prev.currentCurveIndex < 0 || prev.currentCurveIndex >= prev.curves.length) {
        return prev;
      }
      
      const newCurves = [...prev.curves];
      const currentCurve = { ...newCurves[prev.currentCurveIndex] };
      currentCurve.points = currentCurve.points.filter((_, i) => i !== pointIndex);
      newCurves[prev.currentCurveIndex] = currentCurve;
      
      return {
        ...prev,
        curves: newCurves,
      };
    });
  }, []);

  // 清除当前曲线的所有数据点
  const clearCurrentCurve = useCallback(() => {
    setImageExtractionData((prev) => {
      if (prev.currentCurveIndex < 0 || prev.currentCurveIndex >= prev.curves.length) {
        return prev;
      }
      
      const newCurves = [...prev.curves];
      newCurves[prev.currentCurveIndex] = {
        ...newCurves[prev.currentCurveIndex],
        points: [],
      };
      
      return {
        ...prev,
        curves: newCurves,
      };
    });
  }, []);

  // 删除整条曲线
  const removeCurve = useCallback((index) => {
    setImageExtractionData((prev) => {
      const newCurves = prev.curves.filter((_, i) => i !== index);
      let newIndex = prev.currentCurveIndex;
      
      if (newIndex >= newCurves.length) {
        newIndex = newCurves.length - 1;
      }
      
      return {
        ...prev,
        curves: newCurves,
        currentCurveIndex: newIndex,
      };
    });
  }, []);

  // 设置提取步骤
  const setExtractionStep = useCallback((step) => {
    setImageExtractionData((prev) => ({
      ...prev,
      extractionStep: step,
    }));
  }, []);

  // 计算实际坐标的辅助函数
  const calculateRealCoordinates = (pixelX, pixelY, axisPoints, axisValues) => {
    if (!axisPoints.origin || !axisPoints.xAxis || !axisPoints.yAxis) {
      return { x: 0, y: 0 };
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

    // 计算当前点相对于原点的像素距离
    const currentDistX = pixelX - origin.pixelX;
    const currentDistY = origin.pixelY - pixelY;  // Y轴向上为正

    // 计算实际坐标
    const realX = originValue.x + (currentDistX / pixelDistX) * (xAxisValue - originValue.x);
    const realY = originValue.y + (currentDistY / pixelDistY) * (yAxisValue - originValue.y);

    return {
      x: Math.round(realX * 1000) / 1000,
      y: Math.round(realY * 1000) / 1000,
    };
  };

  // 保存文本提取结果到数据库
  const saveTextExtractionToDB = useCallback(async (extractionData) => {
    setSaving(true);
    try {
      // 这里调用现有的保存 API
      // 由于数据结构可能不同，需要先转换格式
      const response = await fetch(`${API_BASE}/data/save-extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          articleId: parseInt(articleId),
          data: extractionData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSavedData((prev) => ({
          ...prev,
          materials: data.data.materials || prev.materials,
          processes: data.data.processes || prev.processes,
          characterizations: data.data.characterizations || prev.characterizations,
        }));
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('保存文本提取结果失败:', error);
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [articleId]);

  // 保存图片提取数据到数据库
  const saveImageExtractionToDB = useCallback(async (extractionData) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/image-extraction/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...baseHeaders(),
        },
        body: JSON.stringify({
          articleId: parseInt(articleId),
          ...extractionData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSavedData((prev) => ({
          ...prev,
          characterizations: [...prev.characterizations, data.data],
        }));
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('保存图片提取数据失败:', error);
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [articleId]);

  // 获取已保存的数据
  const fetchSavedData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/data/${articleId}`, {
        headers: baseHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setSavedData({
          materials: data.data.materials || [],
          processes: data.data.processes || [],
          characterizations: data.data.characterizations || [],
          charts: data.data.charts || [],
        });
      }
    } catch (error) {
      console.error('获取已保存数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  const value = {
    // 状态
    article,
    setArticle,
    textExtractionResult,
    imageExtractionData,
    savedData,
    loading,
    saving,

    // 文本提取方法
    updateTextExtractionResult,
    clearTextExtractionResult,

    // 图片提取方法
    updateImageExtractionData,
    resetImageExtractionData,
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

    // 保存方法
    saveTextExtractionToDB,
    saveImageExtractionToDB,

    // 数据获取
    fetchSavedData,
  };

  return (
    <ChemicalExtractionContext.Provider value={value}>
      {children}
    </ChemicalExtractionContext.Provider>
  );
}

// Hook 用于消费 Context
export function useChemicalExtraction() {
  const context = useContext(ChemicalExtractionContext);
  if (!context) {
    throw new Error('useChemicalExtraction 必须在 ChemicalExtractionProvider 内部使用');
  }
  return context;
}

export default ChemicalExtractionContext;
