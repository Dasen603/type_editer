import axios, { AxiosResponse, AxiosError } from 'axios';
import { APIClient, Document, Node, Content, UploadResponse } from '../types';

const API_BASE_URL = '/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求缓存
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// 请求队列管理
class RequestQueue {
  private queue = new Map<string, Promise<any>>();

  async enqueue<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 如果请求正在进行中，返回现有的 Promise
    if (this.queue.has(key)) {
      return this.queue.get(key) as Promise<T>;
    }

    // 创建新的请求 Promise
    const promise = requestFn().finally(() => {
      this.queue.delete(key);
    });

    this.queue.set(key, promise);
    return promise;
  }
}

// 重试机制
class RetryManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒

  async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.RETRY_DELAY * (this.MAX_RETRIES - retries + 1));
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // 重试 5xx 错误和网络错误
      return !status || status >= 500 || error.code === 'NETWORK_ERROR';
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 全局实例
const cache = new RequestCache();
const queue = new RequestQueue();
const retry = new RetryManager();

// 扩展请求配置类型
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data || error.message,
      url: error.config?.url,
      method: error.config?.method,
    });

    // 创建用户友好的错误消息
    let userMessage = 'An error occurred';
    const status = error.response?.status;
    const data = error.response?.data as any;

    switch (status) {
      case 400:
        userMessage = data?.error || 'Invalid request. Please check your input.';
        break;
      case 401:
        userMessage = 'Authentication required. Please check your API key.';
        break;
      case 403:
        userMessage = data?.error || 'Access forbidden.';
        break;
      case 404:
        userMessage = data?.error || 'Resource not found.';
        break;
      case 413:
      case 429:
        userMessage = data?.error || 'Request limit exceeded. Please try again later.';
        break;
      case 500:
        userMessage = 'Server error. Please try again later.';
        break;
      default:
        if (!error.response) {
          userMessage = 'Network error. Please check your connection.';
        } else {
          userMessage = data?.error || `Error ${status}: ${error.message}`;
        }
    }

    (error as any).userMessage = userMessage;
    return Promise.reject(error);
  }
);

// 辅助函数
function createCacheKey(method: string, url: string, params?: any): string {
  return `${method}:${url}:${params ? JSON.stringify(params) : ''}`;
}

function handleResponse<T>(response: AxiosResponse<T>): T {
  return response.data;
}

// API 客户端实现
export const apiClient: APIClient = {
  documents: {
    async list(): Promise<Document[]> {
      const cacheKey = createCacheKey('GET', '/documents');
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      return queue.enqueue(cacheKey, async () => {
        const response = await retry.withRetry(() => api.get<Document[]>('/documents'));
        const data = handleResponse(response);
        cache.set(cacheKey, data);
        return data;
      });
    },

    async create(title: string): Promise<Document> {
      const response = await retry.withRetry(() => 
        api.post<Document>('/documents', { title })
      );
      const data = handleResponse(response);
      
      // 使缓存失效
      cache.invalidate('/documents');
      
      return data;
    },

    async get(id: number): Promise<Document> {
      const cacheKey = createCacheKey('GET', `/documents/${id}`);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await retry.withRetry(() => 
        api.get<Document>(`/documents/${id}`)
      );
      const data = handleResponse(response);
      cache.set(cacheKey, data);
      return data;
    },

    async update(id: number, title: string): Promise<Document> {
      const response = await retry.withRetry(() => 
        api.put<Document>(`/documents/${id}`, { title })
      );
      const data = handleResponse(response);
      
      // 使相关缓存失效
      cache.invalidate('/documents');
      cache.invalidate(`/documents/${id}`);
      
      return data;
    },

    async delete(id: number): Promise<void> {
      await retry.withRetry(() => api.delete(`/documents/${id}`));
      
      // 使相关缓存失效
      cache.invalidate('/documents');
      cache.invalidate(`/documents/${id}`);
    },
  },

  nodes: {
    async list(docId: number): Promise<Node[]> {
      const cacheKey = createCacheKey('GET', `/documents/${docId}/nodes`);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      return queue.enqueue(cacheKey, async () => {
        const response = await retry.withRetry(() => 
          api.get<Node[]>(`/documents/${docId}/nodes`)
        );
        const data = handleResponse(response);
        cache.set(cacheKey, data, 2 * 60 * 1000); // 2分钟缓存
        return data;
      });
    },

    async create(nodeData: Omit<Node, 'id' | 'created_at' | 'updated_at'>): Promise<Node> {
      const response = await retry.withRetry(() => 
        api.post<Node>('/nodes', nodeData)
      );
      const data = handleResponse(response);
      
      // 使相关缓存失效
      cache.invalidate(`/documents/${nodeData.document_id}/nodes`);
      
      return data;
    },

    async get(id: number): Promise<Node> {
      const cacheKey = createCacheKey('GET', `/nodes/${id}`);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await retry.withRetry(() => 
        api.get<Node>(`/nodes/${id}`)
      );
      const data = handleResponse(response);
      cache.set(cacheKey, data);
      return data;
    },

    async update(id: number, updates: Partial<Node>): Promise<Node> {
      const response = await retry.withRetry(() => 
        api.put<Node>(`/nodes/${id}`, updates)
      );
      const data = handleResponse(response);
      
      // 使相关缓存失效
      cache.invalidate(`/nodes/${id}`);
      if (data.document_id) {
        cache.invalidate(`/documents/${data.document_id}/nodes`);
      }
      
      return data;
    },

    async delete(id: number): Promise<void> {
      await retry.withRetry(() => api.delete(`/nodes/${id}`));
      
      // 使相关缓存失效
      cache.invalidate(`/nodes/${id}`);
      cache.invalidate('/nodes'); // 通用失效
    },
  },

  content: {
    async get(nodeId: number): Promise<Content> {
      const cacheKey = createCacheKey('GET', `/content/${nodeId}`);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const response = await retry.withRetry(() => 
        api.get<Content>(`/content/${nodeId}`)
      );
      const data = handleResponse(response);
      cache.set(cacheKey, data, 1 * 60 * 1000); // 1分钟缓存
      return data;
    },

    async save(nodeId: number, contentJson: string): Promise<Content> {
      const response = await retry.withRetry(() => 
        api.put<Content>(`/content/${nodeId}`, { content_json: contentJson })
      );
      const data = handleResponse(response);
      
      // 使相关缓存失效
      cache.invalidate(`/content/${nodeId}`);
      
      return data;
    },
  },

  upload: {
    async uploadFile(file: File): Promise<UploadResponse> {
      const formData = new FormData();
      formData.append('file', file);

      const response = await retry.withRetry(() => 
        api.post<UploadResponse>('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
      
      return handleResponse(response);
    },
  },
};

// 导出缓存管理函数供外部使用
export const cacheManager = {
  clear: () => cache.invalidate(),
  invalidate: (pattern: string) => cache.invalidate(pattern),
};

// 导出默认客户端
export default apiClient;