'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Input,
  message,
  Modal,
  Descriptions,
  Image,
  List,
  DatePicker,
  Select,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ExportOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Dayjs } from 'dayjs';

interface Inspection {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_code: string;
  inspection_date: string;
  shift: string;
  inspector_name: string;
  total_items: number;
  normal_count: number;
  abnormal_count: number;
  overall_status: string;
  problems_found?: string;
  problems_handled?: string;
  legacy_issues?: string;
  created_at: string;
}

interface InspectionDetail {
  id: number;
  part_name: string;
  item_name: string;
  result: string;
  remark?: string;
  has_attachment: boolean;
}

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
}

const shiftLabels: Record<string, string> = {
  before: '班前',
  during: '班中',
  handover: '交班',
};

const statusColors: Record<string, string> = {
  normal: 'green',
  abnormal: 'red',
};

const statusLabels: Record<string, string> = {
  normal: '正常',
  abnormal: '异常',
};

const resultLabels: Record<string, string> = {
  normal: '正常',
  abnormal: '异常',
  skip: '跳过',
};

export default function InspectionPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDate, setSearchDate] = useState('');
  const [searchShift, setSearchShift] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [inspectionDetails, setInspectionDetails] = useState<InspectionDetail[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [page, pageSize]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      let url = `/inspections?page=${page}&page_size=${pageSize}`;
      const params: string[] = [];
      if (searchDate) params.push(`date=${searchDate}`);
      if (searchShift) params.push(`shift=${searchShift}`);
      if (params.length > 0) {
        url += `&${params.join('&')}`;
      }
      const data = await api.get(url);
      setInspections((data as { list: Inspection[] }).list);
      setTotal((data as { total: number }).total);
    } catch (error) {
      message.error('加载点检记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadInspections();
  };

  const handleReset = () => {
    setSearchDate('');
    setSearchShift('');
    setPage(1);
    loadInspections();
  };

  const handleViewDetail = async (record: Inspection) => {
    setCurrentInspection(record);
    setDetailModalVisible(true);
    setDetailsLoading(true);
    try {
      // 加载点检明细
      const detailsData = await api.get(`/inspections/${record.id}/details`);
      setInspectionDetails((detailsData as { list: InspectionDetail[] }).list || []);
      
      // 加载附件
      const attachmentsData = await api.get(`/inspections/${record.id}/attachments`);
      setAttachments((attachmentsData as { list: Attachment[] }).list || []);
    } catch (error) {
      message.error('加载详情失败');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExport = () => {
    message.info('导出功能待实现');
  };

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
      fixed: 'left' as const,
      width: 150,
    },
    {
      title: '点检日期',
      dataIndex: 'inspection_date',
      key: 'inspection_date',
      width: 120,
      sorter: (a: Inspection, b: Inspection) => 
        new Date(a.inspection_date).getTime() - new Date(b.inspection_date).getTime(),
    },
    {
      title: '班次',
      dataIndex: 'shift',
      key: 'shift',
      width: 80,
      render: (shift: string) => shiftLabels[shift] || shift,
      filters: [
        { text: '班前', value: 'before' },
        { text: '班中', value: 'during' },
        { text: '交班', value: 'handover' },
      ],
      onFilter: (value: unknown, record: Inspection) => record.shift === value,
    },
    {
      title: '点检人',
      dataIndex: 'inspector_name',
      key: 'inspector_name',
      width: 100,
    },
    {
      title: '总项数',
      dataIndex: 'total_items',
      key: 'total_items',
      width: 80,
      sorter: (a: Inspection, b: Inspection) => a.total_items - b.total_items,
    },
    {
      title: '正常',
      dataIndex: 'normal_count',
      key: 'normal_count',
      width: 70,
      render: (count: number) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{count}</span>,
      sorter: (a: Inspection, b: Inspection) => a.normal_count - b.normal_count,
    },
    {
      title: '异常',
      dataIndex: 'abnormal_count',
      key: 'abnormal_count',
      width: 70,
      render: (count: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{count}</span>,
      sorter: (a: Inspection, b: Inspection) => a.abnormal_count - b.abnormal_count,
    },
    {
      title: '状态',
      dataIndex: 'overall_status',
      key: 'overall_status',
      width: 80,
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
      filters: [
        { text: '正常', value: 'normal' },
        { text: '异常', value: 'abnormal' },
      ],
      onFilter: (value: unknown, record: Inspection) => record.overall_status === value,
    },
    {
      title: '点检时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a: Inspection, b: Inspection) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 100,
      render: (_: unknown, record: Inspection) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>点检管理</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>查看和管理点检记录</p>
          </div>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <span style={{ color: '#666' }}>点检日期：</span>
            <DatePicker
              value={searchDate ? dayjs(searchDate) : null}
              onChange={(date: Dayjs | null) => setSearchDate(date?.format('YYYY-MM-DD') || '')}
              style={{ width: 150 }}
              allowClear
            />
            <span style={{ color: '#666', marginLeft: 16 }}>班次：</span>
            <Select
              value={searchShift}
              onChange={(value) => setSearchShift(value)}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="before">班前</Select.Option>
              <Select.Option value="during">班中</Select.Option>
              <Select.Option value="handover">交班</Select.Option>
            </Select>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={inspections}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title={`点检详情 - ${currentInspection?.equipment_name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentInspection && (
          <>
            <Descriptions bordered column={2} size="small" loading={detailsLoading}>
              <Descriptions.Item label="设备名称">
                {currentInspection.equipment_name}
              </Descriptions.Item>
              <Descriptions.Item label="点检日期">
                {currentInspection.inspection_date}
              </Descriptions.Item>
              <Descriptions.Item label="班次">
                {shiftLabels[currentInspection.shift]}
              </Descriptions.Item>
              <Descriptions.Item label="点检人">
                {currentInspection.inspector_name}
              </Descriptions.Item>
              <Descriptions.Item label="总项数">
                {currentInspection.total_items}
              </Descriptions.Item>
              <Descriptions.Item label="正常/异常">
                <span style={{ color: '#52c41a' }}>{currentInspection.normal_count}</span> /{' '}
                <span style={{ color: '#ff4d4f' }}>{currentInspection.abnormal_count}</span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[currentInspection.overall_status]}>
                  {statusLabels[currentInspection.overall_status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="点检时间">
                {new Date(currentInspection.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {/* 问题记录 */}
            {(currentInspection.problems_found || currentInspection.problems_handled || currentInspection.legacy_issues) && (
              <Card title="问题记录" size="small" style={{ marginTop: 16 }}>
                <List
                  size="small"
                  dataSource={[
                    currentInspection.problems_found && { label: '当班发现问题', value: currentInspection.problems_found },
                    currentInspection.problems_handled && { label: '班中问题处理', value: currentInspection.problems_handled },
                    currentInspection.legacy_issues && { label: '遗留问题', value: currentInspection.legacy_issues },
                  ].filter(Boolean) as { label: string; value: string }[]}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<span style={{ fontWeight: 'bold' }}>{item.label}</span>}
                        description={item.value}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 点检明细 */}
            <Card title="点检明细" size="small" style={{ marginTop: 16 }}>
              <Table
                dataSource={inspectionDetails}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
                columns={[
                  {
                    title: '部位名称',
                    dataIndex: 'part_name',
                    key: 'part_name',
                    width: 150,
                  },
                  {
                    title: '点检项目',
                    dataIndex: 'item_name',
                    key: 'item_name',
                    width: 150,
                  },
                  {
                    title: '结果',
                    dataIndex: 'result',
                    key: 'result',
                    width: 80,
                    render: (result: string) => (
                      <Tag color={result === 'normal' ? 'green' : result === 'abnormal' ? 'red' : 'default'}>
                        {resultLabels[result] || result}
                      </Tag>
                    ),
                  },
                  {
                    title: '备注',
                    dataIndex: 'remark',
                    key: 'remark',
                    ellipsis: true,
                  },
                  {
                    title: '附件',
                    key: 'attachment',
                    width: 80,
                    render: (_: unknown, record: InspectionDetail) =>
                      record.has_attachment ? <Tag color="blue">有图片</Tag> : '-',
                  },
                ]}
              />
            </Card>

            {/* 附件图片 */}
            {attachments.length > 0 && (
              <Card title="附件图片" size="small" style={{ marginTop: 16 }}>
                <Space wrap>
                  {attachments.map((att) => (
                    <Image
                      key={att.id}
                      src={att.file_url}
                      alt={att.file_name}
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                      preview={{
                        src: att.file_url,
                      }}
                    />
                  ))}
                </Space>
              </Card>
            )}
          </>
        )}
      </Modal>
    </AdminLayout>
  );
}

// 添加 dayjs 导入
import dayjs from 'dayjs';
