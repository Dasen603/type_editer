import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    // Add timestamp to requests for debugging
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Log error for debugging
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      console.error('API Error:', {
        status,
        message: data?.error || error.message,
        url: error.config?.url,
        method: error.config?.method,
        data: data,
        ...(isDevelopment && { fullError: error })
      });
      
      // Create user-friendly error message
      let userMessage = 'An error occurred';
      
      switch (status) {
        case 400:
          userMessage = data?.error || 'Invalid request. Please check your input.';
          break;
        case 401:
          userMessage = 'Authentication required. Please check your API key.';
          break;
        case 403:
          userMessage = data?.error || 'Access forbidden. You don\'t have permission to perform this action.';
          if (isDevelopment && data?.details) {
            userMessage += ` (${data.details})`;
          }
          break;
        case 404:
          userMessage = data?.error || 'Resource not found.';
          break;
        case 413:
        case 429:
          userMessage = data?.error || 'Request limit exceeded. Please try again later.';
          break;
        case 500:
          // In development, show more details
          if (isDevelopment && data?.error) {
            userMessage = `Server error: ${data.error}`;
            if (data.details) {
              console.error('Server error details:', data.details);
            }
          } else {
            userMessage = 'Server error. Please try again later.';
          }
          break;
        default:
          userMessage = data?.error || `Error ${status}: ${error.message}`;
      }
      
      // Attach user-friendly message to error
      error.userMessage = userMessage;
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
      error.userMessage = 'Network error. Please check your connection and try again.';
    } else {
      // Something else happened
      console.error('Error:', error.message);
      error.userMessage = error.message || 'An unexpected error occurred.';
    }
    
    return Promise.reject(error);
  }
);

// Document API
export const documentAPI = {
  list: () => api.get('/documents'),
  create: (title) => api.post('/documents', { title }),
  get: (id) => api.get(`/documents/${id}`),
  update: (id, title) => api.put(`/documents/${id}`, { title }),
  delete: (id) => api.delete(`/documents/${id}`),
};

// Node API
export const nodeAPI = {
  list: (docId) => api.get(`/documents/${docId}/nodes`),
  create: (data) => api.post('/nodes', data),
  get: (id) => api.get(`/nodes/${id}`),
  update: (id, data) => api.put(`/nodes/${id}`, data),
  delete: (id) => api.delete(`/nodes/${id}`),
};

// Content API
export const contentAPI = {
  get: (nodeId) => api.get(`/content/${nodeId}`),
  save: (nodeId, contentJson) => api.put(`/content/${nodeId}`, { content_json: contentJson }),
};

// File upload API
export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// PDF export API
export const exportAPI = {
  exportPdf: (documentId, template) => api.post('/export/pdf', {
    document_id: documentId,
    template,
  }),
};

export default api;
