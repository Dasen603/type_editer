import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { documentAPI, nodeAPI, contentAPI, uploadAPI } from '../../services/api';

// Mock axios
vi.mock('axios');
const mockedAxios = axios;

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('documentAPI', () => {
    it('should call list endpoint', async () => {
      const mockData = [{ id: 1, title: 'Test' }];
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await documentAPI.list();
      expect(result.data).toEqual(mockData);
    });
    
    it('should call create endpoint with title', async () => {
      const mockData = { id: 1, title: 'New Document' };
      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await documentAPI.create('New Document');
      expect(result.data).toEqual(mockData);
    });
  });
  
  describe('nodeAPI', () => {
    it('should call list endpoint with document ID', async () => {
      const mockData = [{ id: 1, title: 'Node 1' }];
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await nodeAPI.list(1);
      expect(result.data).toEqual(mockData);
    });
    
    it('should call create endpoint with node data', async () => {
      const nodeData = {
        document_id: 1,
        node_type: 'section',
        title: 'New Section',
        order_index: 0,
        indent_level: 0
      };
      const mockData = { id: 1, ...nodeData };
      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await nodeAPI.create(nodeData);
      expect(result.data).toEqual(mockData);
    });
  });
  
  describe('contentAPI', () => {
    it('should call get endpoint with node ID', async () => {
      const mockData = { node_id: 1, content_json: '{"blocks":[]}' };
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await contentAPI.get(1);
      expect(result.data).toEqual(mockData);
    });
    
    it('should call save endpoint with node ID and content', async () => {
      const contentJson = '{"blocks":[]}';
      const mockData = { node_id: 1, content_json: contentJson };
      mockedAxios.create.mockReturnValue({
        put: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await contentAPI.save(1, contentJson);
      expect(result.data).toEqual(mockData);
    });
  });
  
  describe('uploadAPI', () => {
    it('should upload file with FormData', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockData = { url: '/uploads/test.jpg', filename: 'test.jpg' };
      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: mockData })
      });
      
      const result = await uploadAPI.uploadFile(file);
      expect(result.data).toEqual(mockData);
    });
  });
});

