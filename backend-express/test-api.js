#!/usr/bin/env node

/**
 * 后端 API 测试脚本
 * 用于验证重构后的后端服务器是否正常工作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试配置
const testConfig = {
  timeout: 5000,
  retries: 3
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// 创建 axios 实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: testConfig.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试函数
const tests = {
  async healthCheck() {
    log.info('Testing health check endpoint...');
    try {
      const response = await api.get('/health');
      if (response.status === 200 && response.data.status === 'healthy') {
        log.success('Health check passed');
        return true;
      } else {
        log.error('Health check failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Health check failed: ${error.message}`);
      return false;
    }
  },

  async apiInfo() {
    log.info('Testing API info endpoint...');
    try {
      const response = await api.get('/api');
      if (response.status === 200 && response.data.name) {
        log.success('API info endpoint passed');
        console.log('  API Name:', response.data.name);
        console.log('  Version:', response.data.version);
        return true;
      } else {
        log.error('API info endpoint failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`API info endpoint failed: ${error.message}`);
      return false;
    }
  },

  async documentsEndpoint() {
    log.info('Testing documents endpoint...');
    try {
      const response = await api.get('/api/documents');
      if (response.status === 200) {
        log.success(`Documents endpoint passed (${Array.isArray(response.data) ? response.data.length : 'unknown'} documents)`);
        return true;
      } else {
        log.error('Documents endpoint failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Documents endpoint failed: ${error.message}`);
      return false;
    }
  },

  async createDocument() {
    log.info('Testing document creation...');
    try {
      const testDoc = {
        title: `Test Document ${Date.now()}`
      };
      const response = await api.post('/api/documents', testDoc);
      if (response.status === 201 && response.data.id) {
        log.success('Document creation passed');
        return response.data.id;
      } else {
        log.error('Document creation failed: Invalid response');
        return null;
      }
    } catch (error) {
      log.error(`Document creation failed: ${error.message}`);
      return null;
    }
  },

  async updateDocument(docId) {
    log.info('Testing document update...');
    try {
      const updateData = {
        title: `Updated Test Document ${Date.now()}`
      };
      const response = await api.put(`/api/documents/${docId}`, updateData);
      if (response.status === 200 && response.data.title === updateData.title) {
        log.success('Document update passed');
        return true;
      } else {
        log.error('Document update failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Document update failed: ${error.message}`);
      return false;
    }
  },

  async createNode(docId) {
    log.info('Testing node creation...');
    try {
      const testNode = {
        document_id: docId,
        node_type: 'paragraph',
        title: `Test Node ${Date.now()}`,
        order_index: 0,
        indent_level: 0,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Test content'
                }
              ]
            }
          ]
        }
      };
      const response = await api.post('/api/nodes', testNode);
      if (response.status === 201 && response.data.id) {
        log.success('Node creation passed');
        return response.data.id;
      } else {
        log.error('Node creation failed: Invalid response');
        return null;
      }
    } catch (error) {
      log.error(`Node creation failed: ${error.message}`);
      return null;
    }
  },

  async getNodesByDocument(docId) {
    log.info('Testing get nodes by document...');
    try {
      const response = await api.get(`/api/nodes/document/${docId}`);
      if (response.status === 200) {
        log.success(`Get nodes by document passed (${Array.isArray(response.data) ? response.data.length : 'unknown'} nodes)`);
        return true;
      } else {
        log.error('Get nodes by document failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Get nodes by document failed: ${error.message}`);
      return false;
    }
  },

  async getNodeContent(nodeId) {
    log.info('Testing get node content...');
    try {
      const response = await api.get(`/api/content/${nodeId}`);
      if (response.status === 200 || response.status === 404) {
        log.success('Get node content passed');
        return true;
      } else {
        log.error('Get node content failed: Invalid response');
        return false;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log.success('Get node content passed (no content found)');
        return true;
      }
      log.error(`Get node content failed: ${error.message}`);
      return false;
    }
  },

  async saveNodeContent(nodeId) {
    log.info('Testing save node content...');
    try {
      const content = {
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Updated test content ${Date.now()}`
                }
              ]
            }
          ]
        }
      };
      const response = await api.post(`/api/content/${nodeId}`, content);
      if (response.status === 200) {
        log.success('Save node content passed');
        return true;
      } else {
        log.error('Save node content failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Save node content failed: ${error.message}`);
      return false;
    }
  },

  async deleteDocument(docId) {
    log.info('Testing document deletion...');
    try {
      const response = await api.delete(`/api/documents/${docId}`);
      if (response.status === 200) {
        log.success('Document deletion passed');
        return true;
      } else {
        log.error('Document deletion failed: Invalid response');
        return false;
      }
    } catch (error) {
      log.error(`Document deletion failed: ${error.message}`);
      return false;
    }
  }
};

// 运行所有测试
async function runAllTests() {
  console.log('🚀 Starting Backend API Tests\n');
  console.log('='.repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  let docId = null;
  let nodeId = null;

  // 1. Health Check
  results.total++;
  if (await tests.healthCheck()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 2. API Info
  results.total++;
  if (await tests.apiInfo()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 3. Documents Endpoint
  results.total++;
  if (await tests.documentsEndpoint()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 4. Create Document
  results.total++;
  docId = await tests.createDocument();
  if (docId) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 5. Update Document (only if creation succeeded)
  if (docId) {
    results.total++;
    if (await tests.updateDocument(docId)) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 6. Create Node (only if document exists)
    results.total++;
    nodeId = await tests.createNode(docId);
    if (nodeId) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 7. Get Nodes by Document
    results.total++;
    if (await tests.getNodesByDocument(docId)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 8. Node Content tests (only if node exists)
  if (nodeId) {
    // Get content
    results.total++;
    if (await tests.getNodeContent(nodeId)) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Save content
    results.total++;
    if (await tests.saveNodeContent(nodeId)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 9. Cleanup - Delete Document (only if document exists)
  if (docId) {
    results.total++;
    if (await tests.deleteDocument(docId)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 显示结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`   Total tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  log.error(`Failed: ${results.failed}`);
  
  const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0;
  console.log(`   Success rate: ${successRate}%`);

  if (results.failed === 0) {
    log.success('🎉 All tests passed! Backend API is working correctly.');
  } else {
    log.warn(`⚠️  ${results.failed} test(s) failed. Check the logs above for details.`);
  }

  return results.failed === 0;
}

// 运行测试
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log.error(`Test runner failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runAllTests, tests };