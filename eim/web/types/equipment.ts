export interface Equipment {
  id: number;
  code: string;
  name: string;
  type: string;
  status: 'working' | 'standby' | 'maintenance' | 'fault';
  location: string;
  latitude?: number;
  longitude?: number;
  current_ship?: string;
  current_cargo?: string;
  company?: string;
}

export const statusColors: Record<string, string> = {
  working: '#52c41a',
  standby: '#1890ff',
  maintenance: '#faad14',
  fault: '#ff4d4f',
};

export const statusLabels: Record<string, string> = {
  working: '作业中',
  standby: '待命',
  maintenance: '维保',
  fault: '故障',
};
