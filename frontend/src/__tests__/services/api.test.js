import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios completely
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {},
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() }
    }
  }
}));

const mockedAxios = axios;

describe('API Client Services', () => {
  let apiClient;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import apiClient after mocking axios
    const { apiClient: client } = await import('../../services/apiClient');
    apiClient = client;
  });
  
  describe('apiClient.documents', () => {
    it('should have list method', () => {
      expect(typeof apiClient.documents.list).toBe('function');
    });
    
    it('should have create method', () => {
      expect(typeof apiClient.documents.create).toBe('function');
    });
    
    it('should have get method', () => {
      expect(typeof apiClient.documents.get).toBe('function');
    });
  });
  
  describe('apiClient.nodes', () => {
    it('should have list method', () => {
      expect(typeof apiClient.nodes.list).toBe('function');
    });
    
    it('should have create method', () => {
      expect(typeof apiClient.nodes.create).toBe('function');
    });
    
    it('should have update method', () => {
      expect(typeof apiClient.nodes.update).toBe('function');
    });
  });
  
  describe('apiClient.content', () => {
    it('should have get method', () => {
      expect(typeof apiClient.content.get).toBe('function');
    });
    
    it('should have save method', () => {
      expect(typeof apiClient.content.save).toBe('function');
    });
  });
  
  describe('apiClient.upload', () => {
    it('should have uploadFile method', () => {
      expect(typeof apiClient.upload.uploadFile).toBe('function');
    });
  });
});

