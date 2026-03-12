'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Spin, Alert, Card, Tag, Button, Tooltip } from 'antd';
import { EnvironmentOutlined, CompassOutlined, AimOutlined } from '@ant-design/icons';
import { Equipment, statusColors, statusLabels } from '@/types/equipment';

interface EquipmentMapProps {
  equipments: Equipment[];
  height?: string;
  minHeight?: string;
  onEquipmentClick?: (equipment: Equipment) => void;
}

export interface EquipmentMapRef {
  fitView: () => void;
}

const EquipmentMap = forwardRef<EquipmentMapRef, EquipmentMapProps>(function EquipmentMap(
  {
    equipments,
    height = '500px',
    minHeight = '500px',
    onEquipmentClick
  },
  ref
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [useSimpleMap, setUseSimpleMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map()); // 存储设备 ID 到标记的映射
  const markerStatusRef = useRef<Map<number, string>>(new Map()); // 存储设备 ID 到状态的映射
  const hasAutoFitRef = useRef(false); // 标记是否已自动调整过视野

  // 只在组件挂载时加载一次地图脚本
  useEffect(() => {
    let isMounted = true;
    const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY;

    if (!apiKey || apiKey === 'your-amap-key') {
      setUseSimpleMap(true);
      setLoading(false);
      return;
    }

    // 检查是否已经加载过脚本
    const existingScript = document.querySelector(`script[src*="amap.com"]`);
    if (existingScript) {
      if ((window as any).AMap) {
        // 地图脚本已存在，等待数据和容器就绪
        const tryInit = () => {
          if (!isMounted) return;
          // 检查容器和数据是否就绪
          if (mapRef.current && equipments.some(e => e.latitude && e.longitude)) {
            initAMap(apiKey);
          } else {
            // 等待 200ms 后重试
            setTimeout(tryInit, 200);
          }
        };
        setTimeout(tryInit, 100);
      }
      return;
    }

    // 动态加载高德地图脚本
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`;
    script.async = true;
    script.onload = () => {
      if (!isMounted) return;
      // console.log('高德地图脚本加载成功');
      // 等待一小段时间让脚本完全初始化
      setTimeout(() => initAMap(apiKey), 300);
    };
    script.onerror = () => {
      if (!isMounted) return;
      console.warn('高德地图脚本加载失败，使用简化模式');
      setUseSimpleMap(true);
      setLoading(false);
    };
    document.head.appendChild(script);

    // 清理函数
    return () => {
      isMounted = false;
      // 清理所有标记
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      markerStatusRef.current.clear();
    };
  }, []); // 空依赖数组，只执行一次

  // 当设备数据到达且地图未初始化时，尝试初始化地图
  useEffect(() => {
    if (!mapLoaded && !mapInstanceRef.current && !useSimpleMap && equipments.length > 0) {
      const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY;
      if (apiKey && apiKey !== 'your-amap-key' && (window as any).AMap) {
        // 检查是否有有效坐标
        const hasValidCoordinates = equipments.some(e => e.latitude && e.longitude);
        if (hasValidCoordinates && mapRef.current) {
          console.log('🗺️ 设备数据已就绪，初始化地图...');
          initAMap(apiKey);
        } else {
          if (!hasValidCoordinates) {
            console.log('⚠️ 设备数据无有效坐标，使用简化模式');
            setUseSimpleMap(true);
            setLoading(false);
          }
        }
      }
    }
  }, [equipments, mapLoaded, useSimpleMap]);

  // 当地图已加载且设备数据变化时，增量更新标记
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || useSimpleMap) {
      return;
    }

    const AMap = (window as any).AMap;
    const map = mapInstanceRef.current;
    const validEquipments = equipments.filter(e => e.latitude && e.longitude);
    
    if (validEquipments.length === 0) {
      console.log('没有有效坐标的设备');
      return;
    }

    // 增量更新标记
    const currentIds = new Set<number>();
    const updates: number[] = [];
    const adds: Equipment[] = [];

    validEquipments.forEach(equipment => {
      currentIds.add(equipment.id);
      if (markersRef.current.has(equipment.id)) {
        // 标记已存在，检查状态是否变化
        const prevStatus = markerStatusRef.current.get(equipment.id);
        if (prevStatus !== equipment.status) {
          // 状态变化，需要更新
          updates.push(equipment.id);
          // 保存新状态
          markerStatusRef.current.set(equipment.id, equipment.status);
        }
      } else {
        // 标记不存在，需要添加
        adds.push(equipment);
      }
    });

    // 删除不存在的设备标记
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null); // 从地图上移除
        markersRef.current.delete(id);
        markerStatusRef.current.delete(id); // 同时清理状态
        console.log(`移除设备标记：${id}`);
      }
    });

    // 添加新设备标记
    if (adds.length > 0) {
      console.log(`添加 ${adds.length} 个新设备标记`);
      adds.forEach(equipment => {
        try {
          const marker = new AMap.Marker({
            position: [equipment.longitude!, equipment.latitude!],
            title: equipment.name,
            anchor: 'center',
            content: createMarkerContent(equipment.status),
            zIndex: 10,
          });

          // 保存状态到本地 Map
          markerStatusRef.current.set(equipment.id, equipment.status);

          // 添加信息窗体
          const infoWindow = new AMap.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${equipment.name}</h4>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>编号:</strong> ${equipment.code}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>状态:</strong>
                  <span style="color: ${statusColors[equipment.status]};">
                    ${statusLabels[equipment.status]}
                  </span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <strong>位置:</strong> ${equipment.location || '未设置'}
                </div>
                ${equipment.current_ship ? `<div style="font-size: 12px;"><strong>作业:</strong> ${equipment.current_ship}</div>` : ''}
              </div>
            `,
            offset: new AMap.Pixel(0, -15),
          });

          marker.on('click', () => {
            infoWindow.open(map, [equipment.longitude!, equipment.latitude!]);
            if (onEquipmentClick) {
              onEquipmentClick(equipment);
            }
          });

          marker.setMap(map);
          markersRef.current.set(equipment.id, marker);
        } catch (markerError) {
          console.error(`创建标记失败 (${equipment.code}):`, markerError);
        }
      });
    }

    // 更新现有标记的状态
    if (updates.length > 0) {
      console.log(`更新 ${updates.length} 个设备标记状态`);
      updates.forEach(id => {
        const equipment = validEquipments.find(e => e.id === id);
        const marker = markersRef.current.get(id);
        if (equipment && marker) {
          // 更新标记内容（状态颜色）
          marker.setContent(createMarkerContent(equipment.status));
        }
      });
    }

    // 只在第一次加载时自动调整视野
    if (!hasAutoFitRef.current && markersRef.current.size > 0) {
      hasAutoFitRef.current = true;
      setTimeout(() => {
        try {
          const markersArray = Array.from(markersRef.current.values());
          map.setFitView(markersArray, false, [50, 50, 50, 50]);
          console.log('地图视野已自动调整（仅一次）');
        } catch (fitViewError) {
          console.error('调整视野失败:', fitViewError);
        }
      }, 300);
    }
  }, [equipments, mapLoaded, useSimpleMap, onEquipmentClick]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    fitView,
  }), [equipments, useSimpleMap]);

  // 手动调整视野函数
  const fitView = () => {
    if (!mapInstanceRef.current || useSimpleMap) {
      return;
    }

    const AMap = (window as any).AMap;
    const map = mapInstanceRef.current;

    if (markersRef.current.size === 0) {
      return;
    }

    try {
      const markersArray = Array.from(markersRef.current.values());
      map.setFitView(markersArray, true, [50, 50, 50, 50]);
      console.log('手动调整视野完成');
    } catch (error) {
      // 如果 setFitView 失败，使用备用方案
      const validEquipments = equipments.filter(e => e.latitude && e.longitude);
      if (validEquipments.length === 0) return;

      const bounds = validEquipments.reduce((acc, e) => {
        if (!acc.minLat || e.latitude! < acc.minLat) acc.minLat = e.latitude!;
        if (!acc.maxLat || e.latitude! > acc.maxLat) acc.maxLat = e.latitude!;
        if (!acc.minLng || e.longitude! < acc.minLng) acc.minLng = e.longitude!;
        if (!acc.maxLng || e.longitude! > acc.maxLng) acc.maxLng = e.longitude!;
        return acc;
      }, { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 });

      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;

      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;
      const maxRange = Math.max(latRange, lngRange);

      let zoom = 15;
      if (maxRange > 0.1) zoom = 11;
      else if (maxRange > 0.05) zoom = 12;
      else if (maxRange > 0.02) zoom = 13;
      else if (maxRange > 0.01) zoom = 14;
      else if (maxRange > 0.005) zoom = 15;
      else if (maxRange > 0.002) zoom = 16;
      else zoom = 17;

      map.setCenter([centerLng, centerLat]);
      map.setZoom(zoom);
      console.log('手动调整视野完成（备用方案）');
    }
  };

  const initAMap = (apiKey: string) => {
    if (typeof window === 'undefined' || !(window as any).AMap) {
      console.warn('AMap 未定义，使用简化模式');
      setUseSimpleMap(true);
      setLoading(false);
      return;
    }

    const AMap = (window as any).AMap;

    // 检查容器是否存在
    if (!mapRef.current) {
      console.warn('地图容器未就绪，使用简化模式');
      setUseSimpleMap(true);
      setLoading(false);
      return;
    }

    // 检查是否已经初始化过
    if (mapInstanceRef.current) {
      console.log('地图已初始化，跳过');
      setLoading(false);
      return;
    }

    // 获取所有有效坐标
    const validEquipments = equipments.filter(e => e.latitude && e.longitude);
    if (validEquipments.length === 0) {
      // 数据未就绪，等待数据到达后再初始化
      console.log('设备数据未就绪，等待中...');
      return;
    }

    try {
      // 计算中心点
      const centerLat = validEquipments.reduce((sum, e) => sum + (e.latitude || 0), 0) / validEquipments.length;
      const centerLng = validEquipments.reduce((sum, e) => sum + (e.longitude || 0), 0) / validEquipments.length;

      try {
        // 创建地图
        const map = new AMap.Map('map-container', {
          center: [centerLng, centerLat],
          zoom: 15,
          viewMode: '2D',
        });

        // 保存地图实例
        mapInstanceRef.current = map;

        // 添加标记并存储到 markersRef
        validEquipments.forEach(equipment => {
          try {
            const marker = new AMap.Marker({
              position: [equipment.longitude!, equipment.latitude!],
              title: equipment.name,
              anchor: 'center',
              content: createMarkerContent(equipment.status),
            });

            // 保存状态到本地 Map
            markerStatusRef.current.set(equipment.id, equipment.status);

            marker.on('click', () => {
              if (onEquipmentClick) {
                onEquipmentClick(equipment);
              }
            });

            marker.setMap(map);
            markersRef.current.set(equipment.id, marker);
          } catch (markerError) {
            console.error('创建标记失败:', markerError);
          }
        });

        setMapLoaded(true);
        setLoading(false);
        // console.log('地图初始化成功');
      } catch (mapError: any) {
        console.error('创建地图实例失败:', mapError);
        // 如果是 WebGL 或认证错误，使用简化模式
        if (mapError.message?.includes('WebGL') || 
            mapError.message?.includes('USERKEY') ||
            mapError.message?.includes('auth')) {
          console.warn('地图认证或 WebGL 错误，使用简化模式');
          setUseSimpleMap(true);
          setLoading(false);
        } else {
          // 重试一次
          setTimeout(() => {
            try {
              const retryMap = new AMap.Map('map-container', {
                center: [centerLng, centerLat],
                zoom: 15,
                viewMode: '2D',
              });
              mapInstanceRef.current = retryMap;
              setMapLoaded(true);
              setLoading(false);
            } catch (retryError) {
              console.error('重试失败，使用简化模式:', retryError);
              setUseSimpleMap(true);
              setLoading(false);
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('地图初始化失败:', err);
      setUseSimpleMap(true);
      setLoading(false);
    }
  };

  const createMarkerContent = (status: string) => {
    const color = statusColors[status];
    return `
      <div style="
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'"></div>
    `;
  };

  // 简化地图模式（无 API Key 时显示）
  if (useSimpleMap) {
    // 计算状态统计
    const stats = {
      total: equipments.length,
      working: equipments.filter(e => e.status === 'working').length,
      standby: equipments.filter(e => e.status === 'standby').length,
      maintenance: equipments.filter(e => e.status === 'maintenance').length,
      fault: equipments.filter(e => e.status === 'fault').length,
    };

    return (
      <div style={{
        height,
        minHeight,
        background: 'linear-gradient(135deg, #1a2a4a 0%, #0c1929 100%)',
        borderRadius: 12,
        padding: 24,
        overflow: 'auto',
      }}>
        {/* 状态统计 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            padding: 12,
            background: 'rgba(24, 144, 255, 0.15)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4 }}>总数</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.total}</div>
          </div>
          <div style={{
            padding: 12,
            background: 'rgba(82, 196, 26, 0.15)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4 }}>作业</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.working}</div>
          </div>
          <div style={{
            padding: 12,
            background: 'rgba(250, 173, 20, 0.15)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#faad14', marginBottom: 4 }}>待命</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.standby}</div>
          </div>
          <div style={{
            padding: 12,
            background: 'rgba(255, 77, 79, 0.15)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#ff4d4f', marginBottom: 4 }}>故障</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.fault}</div>
          </div>
          <div style={{
            padding: 12,
            background: 'rgba(114, 46, 218, 0.15)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#722eda', marginBottom: 4 }}>维保</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.maintenance}</div>
          </div>
        </div>

        {/* 设备卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {equipments.map(equipment => (
            <Card
              key={equipment.id}
              hoverable
              onClick={() => onEquipmentClick?.(equipment)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${statusColors[equipment.status]}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                borderRadius: 8,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: statusColors[equipment.status],
                    marginRight: 10,
                    boxShadow: `0 0 8px ${statusColors[equipment.status]}`,
                  }} />
                  <span style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {equipment.name}
                  </span>
                </div>
                <Tag color={statusColors[equipment.status]} style={{ fontSize: 11 }}>
                  {statusLabels[equipment.status]}
                </Tag>
              </div>

              <div style={{ marginBottom: 8, fontSize: 13, color: '#ccc' }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#999', marginRight: 8 }}>编号:</span>
                  <span style={{ color: '#fff' }}>{equipment.code}</span>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#999', marginRight: 8 }}>位置:</span>
                  <span style={{ color: '#fff' }}>{equipment.location || '未设置'}</span>
                </div>
                {equipment.type && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#999', marginRight: 8 }}>类型:</span>
                    <span style={{ color: '#fff' }}>{equipment.type}</span>
                  </div>
                )}
                {equipment.latitude && equipment.longitude && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {equipment.latitude.toFixed(4)}, {equipment.longitude.toFixed(4)}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {equipments.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '100px 0',
            color: '#666',
          }}>
            <EnvironmentOutlined style={{ fontSize: 64, marginBottom: 16 }} />
            <div style={{ fontSize: 18 }}>暂无设备数据</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              请先添加设备信息
            </div>
          </div>
        )}
      </div>
    );
  }

  // 高德地图模式
  return (
    <div style={{ position: 'relative', height }}>
      {/* 调整视野按钮 */}
      {!loading && !useSimpleMap && mapLoaded && (
        <Tooltip title="调整视野以显示所有设备">
          <Button
            type="primary"
            icon={<AimOutlined />}
            onClick={fitView}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1000,
              background: 'rgba(24, 144, 255, 0.9)',
              border: 'none',
            }}
          >
            调整视野
          </Button>
        </Tooltip>
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}>
          <Spin size="large" description="地图加载中..." />
        </div>
      )}

      {/* 地图容器 - 始终渲染，等待数据到达 */}
      <div
        id="map-container"
        ref={mapRef}
        style={{ width: '100%', height, minHeight, visibility: useSimpleMap ? 'hidden' : 'visible' }}
      />
    </div>
  );
});

export default EquipmentMap;
