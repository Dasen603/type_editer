import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
