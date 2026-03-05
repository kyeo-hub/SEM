'use client';

import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Spin, Alert } from 'antd';

interface Equipment {
  id: number;
  name: string;
  code: string;
  status: 'working' | 'standby' | 'maintenance' | 'fault';
  latitude?: number;
  longitude?: number;
  location?: string;
  current_ship?: string;
  current_cargo?: string;
}

interface EquipmentMapProps {
  equipments: Equipment[];
  height?: string;
  onEquipmentClick?: (equipment: Equipment) => void;
}

const statusColors: Record<string, string> = {
  working: '#52c41a',
  standby: '#1890ff',
  maintenance: '#faad14',
  fault: '#ff4d4f',
};

const statusLabels: Record<string, string> = {
  working: '作业中',
  standby: '待命',
  maintenance: '维保',
  fault: '故障',
};

let mapInstance: AMap.Map | null = null;
let AMapInstance: any = null;
let markers: any[] = [];

export default function EquipmentMap({ 
  equipments, 
  height = '600px',
  onEquipmentClick 
}: EquipmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        const AMap = await AMapLoader.load({
          key: process.env.NEXT_PUBLIC_AMAP_KEY || 'your-amap-key',
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow'],
        });

        AMapInstance = AMap;

        // 创建地图
        mapInstance = new AMap.Map('map-container', {
          center: [121.59238, 30.51771], // 默认中心点 (外贸码头)
          zoom: 14,
          viewMode: '3D',
        });

        // 添加比例尺和工具栏
        mapInstance.addControl(new AMap.Scale());
        mapInstance.addControl(new AMap.ToolBar());

        setLoading(false);
      } catch (err) {
        console.error('地图加载失败:', err);
        setError('地图加载失败，请检查高德地图 Key 配置');
        setLoading(false);
      }
    };

    initMap();

    // 清理函数
    return () => {
      if (mapInstance) {
        mapInstance.destroy();
        mapInstance = null;
      }
    };
  }, []);

  // 更新设备标记
  useEffect(() => {
    if (!mapInstance || !AMapInstance) return;

    // 清除旧标记
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // 添加新标记
    equipments.forEach(equipment => {
      if (!equipment.latitude || !equipment.longitude) return;

      const marker = new AMapInstance.Marker({
        position: [equipment.longitude, equipment.latitude],
        title: equipment.name,
        anchor: 'center',
        content: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${statusColors[equipment.status]};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            cursor: pointer;
          "></div>
        `,
        extData: equipment,
      });

      // 点击事件
      marker.on('click', () => {
        if (onEquipmentClick) {
          onEquipmentClick(equipment);
        } else {
          // 默认显示信息窗体
          const infoContent = `
            <div style="padding: 10px; min-width: 200px;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px;">${equipment.name}</h4>
              <div style="margin-bottom: 6px;">
                <strong>状态：</strong>
                <span style="color: ${statusColors[equipment.status]};">
                  ${statusLabels[equipment.status]}
                </span>
              </div>
              ${equipment.location ? `<div style="margin-bottom: 6px;"><strong>位置：</strong>${equipment.location}</div>` : ''}
              ${equipment.current_ship ? `<div style="margin-bottom: 6px;"><strong>船名：</strong>${equipment.current_ship}</div>` : ''}
              ${equipment.current_cargo ? `<div style="margin-bottom: 6px;"><strong>货品：</strong>${equipment.current_cargo}</div>` : ''}
              <div style="margin-top: 8px; font-size: 12px; color: #999;">
                编号：${equipment.code}
              </div>
            </div>
          `;

          const infoWindow = new AMapInstance.InfoWindow({
            content: infoContent,
            offset: new AMapInstance.Pixel(0, -30),
          });
          infoWindow.open(mapInstance!, marker.getPosition());
        }
      });

      marker.setMap(mapInstance);
      markers.push(marker);
    });

    // 自动缩放适配所有设备
    if (equipments.length > 0 && equipments.some(e => e.latitude && e.longitude)) {
      const validEquipments = equipments.filter(e => e.latitude && e.longitude);
      if (validEquipments.length > 0) {
        const bounds = new AMapInstance.Bounds(
          validEquipments.map(e => [e.longitude!, e.latitude!])
        );
        mapInstance.setBounds(bounds, {
          padding: 50,
          maxZoom: 16,
        });
      }
    }
  }, [equipments, onEquipmentClick]);

  return (
    <div style={{ position: 'relative', height }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}>
          <Spin size="large" tip="地图加载中..." />
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          maxWidth: 400,
        }}>
          <Alert
            message="地图加载失败"
            description={error}
            type="error"
            showIcon
          />
        </div>
      )}

      <div
        id="map-container"
        ref={mapRef}
        style={{ width: '100%', height, background: '#f0f0f0' }}
      />
    </div>
  );
}
