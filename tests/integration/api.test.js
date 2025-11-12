const request = require('supertest');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Create a test database for integration tests
const testDbPath = path.join(__dirname, '../../backend-express/test_integration_db.sqlite');
let testDb;
let app;

// Setup: Create test database and start server
beforeAll(() => {
  // Remove test database if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  testDb = new sqlite3.Database(testDbPath);
  
  // Set test environment
  process.env.DB_PATH = testDbPath;
  process.env.ALLOWED_ORIGINS = 'http://localhost:5000';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  
  // Import app
  delete require.cache[require.resolve('../../backend-express/server')];
  app = require('../../backend-express/server');
});

// Cleanup
afterAll((done) => {
  testDb.close((err) => {
    if (err) console.error('Error closing test database:', err);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    done();
  });
});

describe('Integration Tests - Document Workflow', () => {
  beforeEach((done) => {
    // Clean up test data
    testDb.run('DELETE FROM content', () => {
      testDb.run('DELETE FROM nodes', () => {
        testDb.run('DELETE FROM documents', done);
      });
    });
  });
  
  test('Complete document creation and editing workflow', async () => {
    // 1. Create a document
    const createDocResponse = await request(app)
      .post('/api/documents')
      .send({ title: 'Integration Test Document' })
      .expect(200);
    
    const docId = createDocResponse.body.id;
    expect(docId).toBeDefined();
    
    // 2. Create a section node
    const createNodeResponse = await request(app)
      .post('/api/nodes')
      .send({
        document_id: docId,
        node_type: 'section',
        title: 'Introduction',
        order_index: 0,
        indent_level: 0
      })
      .expect(200);
    
    const nodeId = createNodeResponse.body.id;
    expect(nodeId).toBeDefined();
    
    // 3. Save content to the node
    const contentJson = JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is test content' }]
      }
    ]);
    
    await request(app)
      .put(`/api/content/${nodeId}`)
      .send({ content_json: contentJson })
      .expect(200);
    
    // 4. Retrieve the content
    const getContentResponse = await request(app)
      .get(`/api/content/${nodeId}`)
      .expect(200);
    
    expect(getContentResponse.body.content_json).toBe(contentJson);
    
    // 5. Get all nodes for the document
    const getNodesResponse = await request(app)
      .get(`/api/documents/${docId}/nodes`)
      .expect(200);
    
    expect(getNodesResponse.body).toHaveLength(1);
    expect(getNodesResponse.body[0].id).toBe(nodeId);
    
    // 6. Update document title
    await request(app)
      .put(`/api/documents/${docId}`)
      .send({ title: 'Updated Title' })
      .expect(200);
    
    // 7. Verify update
    const getDocResponse = await request(app)
      .get(`/api/documents/${docId}`)
      .expect(200);
    
    expect(getDocResponse.body.title).toBe('Updated Title');
    
    // 8. Delete the document (should cascade delete nodes and content)
    await request(app)
      .delete(`/api/documents/${docId}`)
      .expect(204);
    
    // 9. Verify cascade delete
    await request(app)
      .get(`/api/documents/${docId}/nodes`)
      .expect(200)
      .then(response => {
        expect(response.body).toHaveLength(0);
      });
  });
  
  test('Node reordering workflow', async () => {
    // Create document
    const docResponse = await request(app)
      .post('/api/documents')
      .send({ title: 'Reorder Test' });
    const docId = docResponse.body.id;
    
    // Create multiple nodes
    const node1 = await request(app)
      .post('/api/nodes')
      .send({
        document_id: docId,
        node_type: 'section',
        title: 'First',
        order_index: 0,
        indent_level: 0
      });
    
    const node2 = await request(app)
      .post('/api/nodes')
      .send({
        document_id: docId,
        node_type: 'section',
        title: 'Second',
        order_index: 1,
        indent_level: 0
      });
    
    // Reorder nodes
    await request(app)
      .put(`/api/nodes/${node1.body.id}`)
      .send({ order_index: 1 })
      .expect(200);
    
    await request(app)
      .put(`/api/nodes/${node2.body.id}`)
      .send({ order_index: 0 })
      .expect(200);
    
    // Verify order
    const nodesResponse = await request(app)
      .get(`/api/documents/${docId}/nodes`)
      .expect(200);
    
    expect(nodesResponse.body[0].title).toBe('Second');
    expect(nodesResponse.body[1].title).toBe('First');
  });
});

