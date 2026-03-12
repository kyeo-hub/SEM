'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  InputNumber,
  Descriptions,
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import type { FormInstance } from 'antd';
import { Suspense } from 'react';
import dayjs from 'dayjs';

interface OperationRecord {
  id: number;
  equipment_id: number;
  equipment?: {
    code: string;
    name: string;
  };
  ship_name: string;
  cargo_name: string;
  cargo_weight: number;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  operator_name: string;
  has_fault: boolean;
  fault_level?: {
    level_code: string;
    level_name: string;
    color: string;
  };
  fault_description?: string;
  status: string;
  qr_scan: boolean;
  created_at: string;
}

interface Equipment {
  id: number;
  code: string;
  name: string;
}

const statusColors: Record<string, string> = {
  working: 'green',
  completed: 'blue',
};

const statusLabels: Record<string, string> = {
  working: '作业中',
  completed: '已完成',
};

export default function OperationsPage() {
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<OperationRecord | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchEquipment, setSearchEquipment] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const form = Form.useForm<FormInstance>();

  // 统计信息
  const [stats, setStats] = useState({
    totalCount: 0,
    totalMinutes: 0,
    totalCargoWeight: 0,
    faultCount: 0,
  });

  useEffect(() => {
    loadRecords();
    loadEquipments();
    loadStats();
  }, [page, pageSize]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      let url = `/operations?page=${page}&page_size=${pageSize}`;
      const params: string[] = [];
      if (searchEquipment) params.push(`equipment_id=${searchEquipment}`);
      if (searchStatus) params.push(`status=${searchStatus}`);
      if (dateRange) {
        const start = dateRange[0].format('YYYY-MM-DD');
        const end = dateRange[1].format('YYYY-MM-DD');
        params.push(`start_date=${start}&end_date=${end}`);
      }
      if (params.length > 0) {
        url += `&${params.join('&')}`;
      }
      const data = await api.get(url);
      setRecords((data as { list: OperationRecord[] }).list);
      setTotal((data as { total: number }).total);
    } catch (error) {
      message.error('加载作业记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipments = async () => {
    try {
      const data = await api.get('/equipments?page=1&page_size=1000');
      setEquipments((data as { list: Equipment[] }).list);
    } catch (error) {
      console.error('加载设备列表失败', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get('/stats/operations');
      setStats({
        totalCount: (data as any).total_count || 0,
        totalMinutes: (data as any).total_minutes || 0,
        totalCargoWeight: (data as any).total_cargo_weight || 0,
        faultCount: (data as any).fault_count || 0,
      });
    } catch (error) {
      console.error('加载统计信息失败', error);
    }
  };

  const handleAdd = () => {
    setCurrentRecord(null);
    form.resetFields();
    form.setFieldsValue({
      qr_scan: true,
    });
    setModalVisible(true);
  };

  const handleEndWork = async (record: OperationRecord) => {
    setCurrentRecord(record);
    form.resetFields();
    form.setFieldsValue({
      operator_name: record.operator_name,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (currentRecord && currentRecord.status === 'working') {
        // 结束作业
        const endTime = dayjs().format('YYYY-MM-DDTHH:mm:ss');
        const startTime = dayjs(currentRecord.start_time);
        const duration = dayjs(endTime).diff(startTime, 'minute');
        
        await api.post('/operations/end', {
          operation_id: currentRecord.id,
          end_time: endTime,
          duration_minutes: duration,
          cargo_weight: values.cargo_weight,
          has_fault: values.has_fault || false,
          fault_level_id: values.has_fault ? values.fault_level_id : null,
          fault_description: values.fault_description,
          operator_name: values.operator_name,
          qr_scan: currentRecord.qr_scan,
        });
        message.success('结束作业成功');
      } else {
        // 开始作业
        await api.post('/operations/start', {
          equipment_id: values.equipment_id,
          ship_name: values.ship_name,
          cargo_name: values.cargo_name,
          operator_name: values.operator_name,
          qr_scan: values.qr_scan,
        });
        message.success('开始作业成功');
      }
      setModalVisible(false);
      loadRecords();
      loadStats();
    } catch (error) {
      console.error('提交失败', error);
    }
  };

  const handleViewDetail = (record: OperationRecord) => {
    setCurrentRecord(record);
    setDetailModalVisible(true);
  };

  const handleExport = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/operations/export`, '_blank');
    message.success('导出中，请查看下载');
  };

  const handleSearch = () => {
    setPage(1);
    loadRecords();
  };

  const handleReset = () => {
    setSearchEquipment('');
    setSearchStatus('');
    setDateRange(null);
    setPage(1);
    loadRecords();
  };

  const columns = [
    {
      title: '设备编号',
      dataIndex: ['equipment', 'code'],
      key: 'equipment_code',
      width: 120,
    },
    {
      title: '设备名称',
      dataIndex: ['equipment', 'name'],
      key: 'equipment_name',
      width: 150,
    },
    {
      title: '船名',
      dataIndex: 'ship_name',
      key: 'ship_name',
      width: 120,
    },
    {
      title: '货品',
      dataIndex: 'cargo_name',
      key: 'cargo_name',
      width: 120,
    },
    {
      title: '作业时长 (分钟)',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
      width: 100,
      render: (duration: number) => (duration > 0 ? duration : '-'),
    },
    {
      title: '装卸吨位',
      dataIndex: 'cargo_weight',
      key: 'cargo_weight',
      width: 100,
      render: (weight: number) => (weight > 0 ? `${weight}吨` : '-'),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
      filters: [
        { text: '作业中', value: 'working' },
        { text: '已完成', value: 'completed' },
      ],
      onFilter: (value: unknown, record: OperationRecord) => record.status === value,
    },
    {
      title: '故障',
      dataIndex: 'has_fault',
      key: 'has_fault',
      width: 80,
      render: (hasFault: boolean, record: OperationRecord) => {
        if (!hasFault) {
          return <Tag color="green">无</Tag>;
        }
        const faultLevel = record.fault_level;
        const color = faultLevel?.color || 'red';
        const name = faultLevel?.level_name || '故障';
        return <Tag color={color}>{name}</Tag>;
      },
    },
    {
      title: '作业开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_: unknown, record: OperationRecord) => (
        <Space direction="vertical" size="small">
          <Space>
            <Tooltip title="查看详情">
              <Button
                type="primary"
                ghost
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
              >
                详情
              </Button>
            </Tooltip>
            {record.status === 'working' && (
              <Tooltip title="结束作业">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleEndWork(record)}
                >
                  结束
                </Button>
              </Tooltip>
            )}
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout title="设备作业记录">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总作业次数"
                value={stats.totalCount}
                prefix={<PlusOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总作业时长 (小时)"
                value={Math.round(stats.totalMinutes / 60)}
                suffix="小时"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总装卸吨位"
                value={stats.totalCargoWeight}
                precision={2}
                suffix="吨"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="故障次数"
                value={stats.faultCount}
                styles={{
                  content: { color: stats.faultCount > 0 ? '#cf1322' : '#3f8600' }
                }}
                prefix={stats.faultCount > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 搜索栏 */}
        <Card>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Select
                placeholder="选择设备"
                allowClear
                style={{ width: '100%' }}
                options={equipments.map((e) => ({
                  label: `${e.code} - ${e.name}`,
                  value: e.id,
                }))}
                value={searchEquipment || undefined}
                onChange={(value) => setSearchEquipment(value || '')}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="状态"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: '作业中', value: 'working' },
                  { label: '已完成', value: 'completed' },
                ]}
                value={searchStatus || undefined}
                onChange={(value) => setSearchStatus(value || '')}
              />
            </Col>
            <Col span={6}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as any)}
              />
            </Col>
            <Col span={8}>
              <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  搜索
                </Button>
                <Button icon={<SearchOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button icon={<ExportOutlined />} onClick={handleExport}>
                  导出
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  开始作业
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1500 }}
          />
        </Card>
      </Space>

      {/* 开始/结束作业弹窗 */}
      <Modal
        title={currentRecord?.status === 'working' ? '结束作业' : '开始作业'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          {currentRecord?.status !== 'working' ? (
            <>
              <Form.Item
                name="equipment_id"
                label="设备"
                rules={[{ required: true, message: '请选择设备' }]}
              >
                <Select
                  placeholder="请选择设备"
                  options={equipments.map((e) => ({
                    label: `${e.code} - ${e.name}`,
                    value: e.id,
                  }))}
                />
              </Form.Item>
              <Form.Item name="ship_name" label="船名">
                <Input placeholder="可选" />
              </Form.Item>
              <Form.Item name="cargo_name" label="货品">
                <Input placeholder="可选" />
              </Form.Item>
              <Form.Item
                name="operator_name"
                label="操作人"
                rules={[{ required: true, message: '请输入操作人' }]}
              >
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
              <Form.Item
                name="qr_scan"
                label="扫码作业"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="cargo_weight"
                label="装卸吨位"
                rules={[{ required: true, message: '请输入装卸吨位' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入装卸吨位"
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="operator_name"
                label="操作人"
                rules={[{ required: true, message: '请输入操作人' }]}
              >
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
              <Form.Item
                name="has_fault"
                label="是否有故障"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) =>
                  getFieldValue('has_fault') ? (
                    <>
                      <Form.Item
                        name="fault_level_id"
                        label="故障等级"
                        rules={[{ required: true, message: '请选择故障等级' }]}
                      >
                        <Select
                          placeholder="请选择故障等级"
                          options={[
                            { label: 'L1 严重故障', value: 1 },
                            { label: 'L2 一般故障', value: 2 },
                            { label: 'L3 轻微故障', value: 3 },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name="fault_description"
                        label="故障描述"
                        rules={[{ required: true, message: '请输入故障描述' }]}
                      >
                        <Input.TextArea rows={3} placeholder="请输入故障描述" />
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="作业记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentRecord && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="设备编号">
              {currentRecord.equipment?.code}
            </Descriptions.Item>
            <Descriptions.Item label="设备名称">
              {currentRecord.equipment?.name}
            </Descriptions.Item>
            <Descriptions.Item label="船名" span={2}>
              {currentRecord.ship_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="货品" span={2}>
              {currentRecord.cargo_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="作业时长">
              {currentRecord.duration_minutes > 0
                ? `${currentRecord.duration_minutes}分钟`
                : '进行中'}
            </Descriptions.Item>
            <Descriptions.Item label="装卸吨位">
              {currentRecord.cargo_weight > 0
                ? `${currentRecord.cargo_weight}吨`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作人">
              {currentRecord.operator_name}
            </Descriptions.Item>
            <Descriptions.Item label="扫码作业">
              {currentRecord.qr_scan ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[currentRecord.status]}>
                {statusLabels[currentRecord.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="是否有故障">
              {currentRecord.has_fault ? (
                <Tag color={currentRecord.fault_level?.color || 'red'}>
                  {currentRecord.fault_level?.level_name}
                </Tag>
              ) : (
                <Tag color="green">无</Tag>
              )}
            </Descriptions.Item>
            {currentRecord.fault_description && (
              <Descriptions.Item label="故障描述" span={2}>
                {currentRecord.fault_description}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="开始时间" span={2}>
              {dayjs(currentRecord.start_time).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {currentRecord.end_time && (
              <Descriptions.Item label="结束时间" span={2}>
                {dayjs(currentRecord.end_time).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </AdminLayout>
  );
}
