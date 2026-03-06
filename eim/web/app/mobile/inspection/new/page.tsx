'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Toast,
  Form,
  Input,
  Radio,
  ImageUploader,
  Dialog,
} from 'antd-mobile';
import { CameraOutline } from 'antd-mobile-icons';
import { useSearchParams, useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';

interface Standard {
  id: number;
  part_name: string;
  item_name: string;
  content: string;
  method: string;
  limit_value: string;
}

interface InspectionItem {
  standard_id: number;
  part_name: string;
  item_name: string;
  result: 'normal' | 'abnormal' | 'skip';
  remark: string;
  files: File[];
}

export default function InspectionNewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const equipmentId = searchParams.get('equipmentId');
  const [standards, setStandards] = useState<Standard[]>([]);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 签名 canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    if (equipmentId) {
      loadStandards();
    }
  }, [equipmentId]);

  const loadStandards = async () => {
    try {
      const token = localStorage.getItem('token');
      // 先获取设备信息获取类型
      const equipRes = await fetch(`/api/equipments/${equipmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const equipData = await equipRes.json();
      if (equipData.code !== 0) {
        Toast.show({ content: '设备不存在', icon: 'fail' });
        return;
      }

      const equipment = equipData.data;

      // 根据设备类型加载点检标准
      const res = await fetch(
        `/api/standards?equipment_type=${encodeURIComponent(equipment.type)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (data.code === 0) {
        setStandards(data.data);
        // 初始化点检项
        const items: InspectionItem[] = data.data.map((s: Standard) => ({
          standard_id: s.id,
          part_name: s.part_name,
          item_name: s.item_name,
          result: 'normal',
          remark: '',
          files: [],
        }));
        setInspectionItems(items);
      }
    } catch (error) {
      console.error('加载标准失败:', error);
      Toast.show({ content: '加载失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (
    index: number,
    updates: Partial<InspectionItem>
  ) => {
    const newItems = [...inspectionItems];
    newItems[index] = { ...newItems[index], ...updates };
    setInspectionItems(newItems);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      // 获取签名图片
      let signatureImage = '';
      if (canvasRef.current) {
        signatureImage = canvasRef.current.toDataURL('image/png');
      }

      // 计算统计
      const totalItems = inspectionItems.length;
      const normalCount = inspectionItems.filter(
        (i) => i.result === 'normal'
      ).length;
      const abnormalCount = inspectionItems.filter(
        (i) => i.result === 'abnormal'
      ).length;

      // 构建点检明细
      const details = inspectionItems.map((item) => ({
        standard_id: item.standard_id,
        part_name: item.part_name,
        item_name: item.item_name,
        result: item.result,
        remark: item.remark,
      }));

      // 提交点检记录
      const token = localStorage.getItem('token');
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipment_id: parseInt(equipmentId!),
          inspection_date: new Date().toISOString().split('T')[0],
          shift: values.shift || 'before',
          inspector_name: values.inspector_name,
          details,
          problems_found: values.problems_found,
          problems_handled: values.problems_handled,
          legacy_issues: values.legacy_issues,
          signature_image: signatureImage,
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        Toast.show({ content: '点检完成', icon: 'success' });
        router.push('/mobile');
      } else {
        Toast.show({ content: data.message || '提交失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('提交失败:', error);
      Toast.show({ content: '提交失败', icon: 'fail' });
    } finally {
      setSubmitting(false);
    }
  };

  // 签名相关
  const startSignature = () => {
    setShowSignature(true);
    // 等待弹窗渲染完成后初始化 canvas
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }, 100);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const saveSignature = () => {
    setShowSignature(false);
  };

  // Canvas 绘图
  const handleCanvasStart = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
      e.preventDefault();
    } else {
      const mouse = e;
      x = mouse.clientX - rect.left;
      y = mouse.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMove = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
      e.preventDefault();
    } else {
      const mouse = e;
      x = mouse.clientX - rect.left;
      y = mouse.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  if (loading) {
    return (
      <MobileLayout title="点检录入" showBack>
        <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="点检录入" showBack>
      <div style={{ padding: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Form.Item name="shift" label="班次" initialValue="before">
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="before">班前</Radio>
                  <Radio value="during">班中</Radio>
                  <Radio value="handover">交班</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="inspector_name"
              label="点检人姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入点检人姓名" />
            </Form.Item>
          </Card>

          {/* 点检项目 */}
          <Card title="点检项目" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {inspectionItems.map((item, index) => (
                <Card
                  key={index}
                  style={{
                    background:
                      item.result === 'abnormal' ? '#fff2f0' : '#fff',
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <strong>{item.part_name}</strong> - {item.item_name}
                  </div>
                  <Radio.Group
                    value={item.result}
                    onChange={(value) =>
                      updateItem(index, { result: value as any })
                    }
                  >
                    <Space direction="vertical">
                      <Radio value="normal">正常</Radio>
                      <Radio value="abnormal">异常</Radio>
                      <Radio value="skip">跳过</Radio>
                    </Space>
                  </Radio.Group>
                  {item.result === 'abnormal' && (
                    <Form.Item label="异常说明" style={{ marginTop: 12 }}>
                      <Input
                        placeholder="请描述异常情况"
                        value={item.remark}
                        onChange={(value) =>
                          updateItem(index, { remark: value })
                        }
                      />
                    </Form.Item>
                  )}
                </Card>
              ))}
            </Space>
          </Card>

          {/* 问题记录 */}
          <Card title="问题记录" style={{ marginBottom: 16 }}>
            <Form.Item name="problems_found" label="当班发现问题">
              <Input
                placeholder="请输入当班发现的问题"
                maxLength={500}
                rows={3}
              />
            </Form.Item>

            <Form.Item name="problems_handled" label="班中问题处理">
              <Input
                placeholder="请输入班中问题处理情况"
                maxLength={500}
                rows={3}
              />
            </Form.Item>

            <Form.Item name="legacy_issues" label="遗留问题">
              <Input
                placeholder="请输入遗留问题及当班生产事务"
                maxLength={500}
                rows={3}
              />
            </Form.Item>
          </Card>

          {/* 电子签名 */}
          <Card title="电子签名" style={{ marginBottom: 16 }}>
            <div>
              <Button onClick={startSignature} style={{ marginRight: 12 }}>
                点击签名
              </Button>
              <Button onClick={clearSignature} color="danger">
                清除签名
              </Button>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#999' }}>
              请在上方点击"点击签名"进行电子签名
            </div>
          </Card>

          {/* 签名弹窗 */}
          <Dialog
            content={
              <div>
                <h4 style={{ textAlign: 'center', margin: '0 0 16px' }}>
                  电子签名
                </h4>
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={200}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    touchAction: 'none',
                    background: '#fff',
                  }}
                  onTouchStart={handleCanvasStart}
                  onTouchMove={handleCanvasMove}
                  onMouseDown={handleCanvasStart}
                  onMouseMove={handleCanvasMove}
                />
                <Space
                  direction="vertical"
                  style={{ width: '100%', marginTop: 16 }}
                >
                  <Button block color="primary" onClick={saveSignature}>
                    保存签名
                  </Button>
                  <Button block onClick={clearSignature}>
                    清除重签
                  </Button>
                </Space>
              </div>
            }
            visible={showSignature}
            onMaskClick={() => setShowSignature(false)}
            style={{ '--content-max-width': '90%' }}
          />

          {/* 提交按钮 */}
          <Button
            color="primary"
            size="large"
            block
            htmlType="submit"
            loading={submitting}
            style={{ marginTop: 24 }}
          >
            提交点检记录
          </Button>
        </Form>
      </div>
    </MobileLayout>
  );
}
