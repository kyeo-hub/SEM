import axios from 'axios';

// API 基础 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// 创建 axios 实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    const { data } = response;
    // 如果响应码不为 0，抛出错误
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message));
    }
    return data.data;
  },
  (error) => {
    // 处理 401 错误
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    // 只在开发环境下打印详细错误
    if (process.env.NODE_ENV === 'development') {
      console.error('API 请求错误:', error.response?.data?.message || error.message);
    }
    return Promise.reject(new Error(error.response?.data?.message || error.message));
  }
);

// 登录响应类型
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    real_name?: string;
    department?: string;
  };
}

