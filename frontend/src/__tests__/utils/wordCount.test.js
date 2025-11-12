import { describe, it, expect } from 'vitest';
import { computeWordCount, extractTextFromBlockNote } from '../../utils/wordCount';

describe('wordCount utilities', () => {
  describe('extractTextFromBlockNote', () => {
    it('should extract text from simple content', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello world' }
          ]
        }
      ];
      
      const result = extractTextFromBlockNote(content);
      expect(result).toBe('Hello world');
    });
    
    it('should extract text from multiple blocks', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'First paragraph' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Second paragraph' }
          ]
        }
      ];
      
      const result = extractTextFromBlockNote(content);
      expect(result).toBe('First paragraphSecond paragraph');
    });
    
    it('should handle string input', () => {
      const content = JSON.stringify([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Test' }
          ]
        }
      ]);
      
      const result = extractTextFromBlockNote(content);
      expect(result).toBe('Test');
    });
    
    it('should return empty string for null/undefined', () => {
      expect(extractTextFromBlockNote(null)).toBe('');
      expect(extractTextFromBlockNote(undefined)).toBe('');
    });
  });
  
  describe('computeWordCount', () => {
    it('should count English words correctly', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is a test sentence with seven words' }
          ]
        }
      ];
      
      const result = computeWordCount(content);
      expect(result.english).toBe(8);
      expect(result.display).toBe(8);
    });
    
    it('should count Chinese characters correctly', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '这是一个测试句子' }
          ]
        }
      ];
      
      const result = computeWordCount(content);
      expect(result.chinese).toBe(8);
      expect(result.display).toBe(8);
    });
    
    it('should count mixed Chinese and English', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '这是 a test 句子' }
          ]
        }
      ];
      
      const result = computeWordCount(content);
      expect(result.chinese).toBe(4);
      expect(result.english).toBe(2);
      expect(result.display).toBe(6);
    });
    
    it('should handle empty content', () => {
      const result = computeWordCount([]);
      expect(result.display).toBe(0);
      expect(result.tooltip).toBe(0);
    });
  });
});

