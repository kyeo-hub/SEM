'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Modal, Descriptions, Button, Switch, Badge } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CompassOutlined,
  AimOutlined,
  WifiOutlined,
  DisconnectOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import EquipmentMap, { EquipmentMapRef } from '@/components/dashboard/EquipmentMap';
import { useRouter } from 'next/navigation';

import { Equipment, statusColors, statusLabels } from '@/types/equipment';

// SSE 事件类型
interface SSEEventData {
  list: Equipment[];
  timestamp: number;
}

// 设备变更事件类型
interface EquipmentChangeEvent {
  equipment: Equipment;
  action: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    working: 0,
    standby: 0,
    maintenance: 0,
    fault: 0,
  });
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const mapRef = useRef<EquipmentMapRef>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 计算统计数据
  const calculateStats = useCallback((equipmentList: Equipment[]) => {
    const total = equipmentList.length;
    const working = equipmentList.filter((e) => e.status === 'working').length;
    const standby = equipmentList.filter((e) => e.status === 'standby').length;
    const maintenance = equipmentList.filter((e) => e.status === 'maintenance').length;
    const fault = equipmentList.filter((e) => e.status === 'fault').length;
    return { total, working, standby, maintenance, fault };
  }, []);

  // 处理设备数据更新（全量）- 只在数据真正变化时更新
  const handleEquipmentUpdate = useCallback((equipmentList: Equipment[]) => {
    setEquipments(prev => {
      // 检查是否真的需要更新（避免不必要的重渲染）
      if (prev.length === equipmentList.length) {
        const allSame = prev.every((p, i) => {
          const eq = equipmentList[i];
          return p.id === eq.id && 
                 p.status === eq.status && 
                 p.name === eq.name && 
                 p.code === eq.code &&
                 p.latitude === eq.latitude &&
                 p.longitude === eq.longitude;
        });
        if (allSame) {
          // 数据完全相同，不更新
          return prev;
        }
      }
      // 数据有变化，更新
      setStats(calculateStats(equipmentList));
      return equipmentList;
    });
    setLoading(false);
  }, [calculateStats]);

  // 处理单个设备变更（增量更新）- 只在状态真正变化时更新
  const handleEquipmentChange = useCallback((equipment: Equipment, action: string) => {
    console.log(`收到设备${action}事件:`, equipment.code);

    setEquipments(prev => {
      let newList = [...prev];

      if (action === 'delete') {
        // 删除设备
        const filtered = newList.filter(e => e.id !== equipment.id);
        if (filtered.length === newList.length) {
          // 设备不存在，无需更新
          return prev;
        }
        newList = filtered;
      } else {
        // 新增或更新设备
        const index = newList.findIndex(e => e.id === equipment.id);
        if (index >= 0) {
          // 检查状态是否真的变化
          if (newList[index].status === equipment.status &&
              newList[index].name === equipment.name &&
              newList[index].code === equipment.code &&
              newList[index].latitude === equipment.latitude &&
              newList[index].longitude === equipment.longitude) {
            // 状态无变化，不更新
            return prev;
          }
          // 状态有变化，更新
          newList[index] = equipment;
        } else {
          newList.push(equipment);
        }
      }

      // 更新统计数据
      setStats(calculateStats(newList));
      return newList;
    });
  }, [calculateStats]);

  // 连接 SSE
  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const sseUrl = `${apiUrl}/events/equipments`;

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // 创建 EventSource 连接，通过 URL 传递 token
    const eventSource = new EventSource(`${sseUrl}?token=${token}`);
    eventSourceRef.current = eventSource;

    // 连接成功
    eventSource.addEventListener('connected', (event) => {
      console.log('SSE 已连接:', event.data);
      setSseConnected(true);
    });

    // 接收初始设备列表
    eventSource.addEventListener('equipments-init', (event) => {
      try {
        const data: SSEEventData = JSON.parse(event.data);
        handleEquipmentUpdate(data.list);
        console.log(`SSE 初始数据：${data.list.length} 台设备`);
      } catch (err) {
        console.error('解析 SSE 初始数据失败:', err);
      }
    });

    // 接收设备变更事件（增量更新）
    eventSource.addEventListener('equipment-change', (event) => {
      try {
        const data: EquipmentChangeEvent = JSON.parse(event.data);
        if (data.equipment && data.action) {
          handleEquipmentChange(data.equipment, data.action);
        }
      } catch (err) {
        console.error('解析 SSE 变更事件失败:', err);
      }
    });

    // 心跳
    eventSource.addEventListener('heartbeat', () => {
      // 心跳正常，保持连接状态
    });

    // 连接错误
    eventSource.onerror = (err) => {
      console.error('SSE 连接错误:', err);
      setSseConnected(false);

      // 连接断开后尝试重连
      setTimeout(() => {
        if (authChecked) {
          console.log('尝试重新连接 SSE...');
          connectSSE();
        }
      }, 5000);
    };
  }, [authChecked, handleEquipmentUpdate, handleEquipmentChange, router]);

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // SSE 连接和时钟更新
  useEffect(() => {
    if (authChecked) {
      // 连接 SSE
      connectSSE();

      // 时钟更新
      const timeInterval = setInterval(() => {
        setCurrentTime(new Date().toLocaleString('zh-CN'));
      }, 1000);

      return () => {
        // 清理 SSE 连接
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        clearInterval(timeInterval);
      };
    }
  }, [authChecked, connectSSE]);

  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setDetailModalVisible(true);
  };

  // 处理分页变化
  const handleTableChange = (pag: any) => {
    setPagination({
      current: pag.current,
      pageSize: pag.pageSize,
    });
  };

  const columns = [
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '坐标',
      key: 'coordinate',
      width: 180,
      render: (_: unknown, record: Equipment) =>
        record.latitude && record.longitude
          ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
          : '未设置',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Equipment) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleEquipmentClick(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c1929 0%, #1a2a4a 50%, #0c1929 100%)',
      padding: 24,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 标题区域 */}
      <div style={{
        textAlign: 'center',
        marginBottom: 24,
        padding: '20px 0',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: 48,
          margin: 0,
          background: 'linear-gradient(90deg, #00f5ff, #007bff, #00f5ff)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
        }}>
          设备管理大屏
        </h1>
        <p style={{
          fontSize: 18,
          color: '#00f5ff',
          margin: '16px 0 0',
        }}>
          Equipment Inspection & Operation Management System
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 8 }}>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {currentTime || '加载中...'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sseConnected ? (
              <Badge status="success" text={<span style={{ color: '#52c41a' }}><WifiOutlined /> 实时连接</span>} />
            ) : (
              <Badge status="error" text={<span style={{ color: '#ff4d4f' }}><DisconnectOutlined /> 连接断开</span>} />
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ flexShrink: 0 }}>
        <Row gutter={[16, 16]} justify="center">
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card
            style={{
              background: 'rgba(24, 144, 255, 0.15)',
              border: '1px solid rgba(24, 144, 255, 0.5)',
              borderRadius: 16,
              boxShadow: '0 0 20px rgba(24, 144, 255, 0.3)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Statistic
              title={<span style={{ color: '#1890ff', fontSize: 14 }}>设备总数</span>}
              value={stats.total}
              prefix={<DashboardOutlined style={{ color: '#1890ff', fontSize: 20 }} />}
              styles={{
                content: { color: '#1890ff', fontSize: 28, fontWeight: 'bold' }
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card
            style={{
              background: 'rgba(82, 196, 26, 0.15)',
              border: '1px solid rgba(82, 196, 26, 0.5)',
              borderRadius: 16,
              boxShadow: '0 0 20px rgba(82, 196, 26, 0.3)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Statistic
              title={<span style={{ color: '#52c41a', fontSize: 14 }}>作业中</span>}
              value={stats.working}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
              styles={{
                content: { color: '#52c41a', fontSize: 28, fontWeight: 'bold' }
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card
            style={{
              background: 'rgba(250, 173, 20, 0.15)',
              border: '1px solid rgba(250, 173, 20, 0.5)',
              borderRadius: 16,
              boxShadow: '0 0 20px rgba(250, 173, 20, 0.3)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Statistic
              title={<span style={{ color: '#faad14', fontSize: 14 }}>待命</span>}
              value={stats.standby}
              prefix={<ToolOutlined style={{ color: '#faad14', fontSize: 20 }} />}
              styles={{
                content: { color: '#faad14', fontSize: 28, fontWeight: 'bold' }
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card
            style={{
              background: 'rgba(255, 77, 79, 0.15)',
              border: '1px solid rgba(255, 77, 79, 0.5)',
              borderRadius: 16,
              boxShadow: '0 0 20px rgba(255, 77, 79, 0.3)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Statistic
              title={<span style={{ color: '#ff4d4f', fontSize: 14 }}>故障</span>}
              value={stats.fault}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />}
              styles={{
                content: { color: '#ff4d4f', fontSize: 28, fontWeight: 'bold' }
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card
            style={{
              background: 'rgba(114, 46, 218, 0.15)',
              border: '1px solid rgba(114, 46, 218, 0.5)',
              borderRadius: 16,
              boxShadow: '0 0 20px rgba(114, 46, 218, 0.3)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Statistic
              title={<span style={{ color: '#722eda', fontSize: 14 }}>维保中</span>}
              value={stats.maintenance}
              prefix={<SettingOutlined style={{ color: '#722eda', fontSize: 20 }} />}
              styles={{
                content: { color: '#722eda', fontSize: 28, fontWeight: 'bold' }
              }}
            />
          </Card>
        </Col>
      </Row>
      </div>

      {/* 地图区域 */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 18 }}><CompassOutlined /> 设备分布地图</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showMap && (
                <Button
                  type="primary"
                  icon={<AimOutlined />}
                  onClick={() => mapRef.current?.fitView()}
                  size="small"
                  style={{ background: 'rgba(24, 144, 255, 0.9)', border: 'none' }}
                >
                  调整视野
                </Button>
              )}
              <Switch
                checkedChildren="地图"
                unCheckedChildren="列表"
                checked={showMap}
                onChange={setShowMap}
                size="small"
              />
            </div>
          </div>
        }
        style={{
          marginTop: 24,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 16,
          flex: 1,
          minHeight: '500px',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 16, height: '100%', boxSizing: 'border-box' } }}
      >
        {showMap ? (
          <EquipmentMap
            ref={mapRef}
            equipments={equipments}
            height="calc(100vh - 400px)"
            minHeight="500px"
            onEquipmentClick={handleEquipmentClick}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={equipments}
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showTotal: (total) => `共 ${total} 台`,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* 设备详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 18 }}>{selectedEquipment?.name}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedEquipment && (
          <Descriptions
            bordered
            column={2}
            styles={{ label: { color: '#999' } }}
          >
            <Descriptions.Item label="设备编号">{selectedEquipment.code}</Descriptions.Item>
            <Descriptions.Item label="设备名称">{selectedEquipment.name}</Descriptions.Item>
            <Descriptions.Item label="设备类型">{selectedEquipment.type}</Descriptions.Item>
            <Descriptions.Item label="所属公司">{selectedEquipment.company}</Descriptions.Item>
            <Descriptions.Item label="位置" span={2}>{selectedEquipment.location}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[selectedEquipment.status]}>
                {statusLabels[selectedEquipment.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="坐标">
              {selectedEquipment.latitude && selectedEquipment.longitude
                ? `${selectedEquipment.latitude.toFixed(4)}, ${selectedEquipment.longitude.toFixed(4)}`
                : '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="船名">{selectedEquipment.current_ship || '-'}</Descriptions.Item>
            <Descriptions.Item label="货品">{selectedEquipment.current_cargo || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
