const request = require('supertest');
const { app, setupTestDatabase, cleanupTestDatabase } = require('./testApp');

describe('API Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Type Editor API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Documents API', () => {
    let documentId;

    it('should get all documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new document', async () => {
      const documentData = {
        title: 'Test Document'
      };

      const response = await request(app)
        .post('/api/documents')
        .send(documentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Document');
      documentId = response.body.id;
    });

    it('should get a document by ID', async () => {
      if (!documentId) {
        throw new Error('Document ID not available');
      }

      const response = await request(app)
        .get(`/api/documents/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', documentId);
      expect(response.body).toHaveProperty('title', 'Test Document');
    });

    it('should update a document', async () => {
      if (!documentId) {
        throw new Error('Document ID not available');
      }

      const updateData = {
        title: 'Updated Test Document'
      };

      const response = await request(app)
        .put(`/api/documents/${documentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', documentId);
      expect(response.body).toHaveProperty('title', 'Updated Test Document');
    });

    it('should return 404 for non-existent document', async () => {
      await request(app)
        .get('/api/documents/999999')
        .expect(404);
    });

    it('should delete a document', async () => {
      if (!documentId) {
        throw new Error('Document ID not available');
      }

      await request(app)
        .delete(`/api/documents/${documentId}`)
        .expect(200);

      // Verify document is deleted
      await request(app)
        .get(`/api/documents/${documentId}`)
        .expect(404);
    });
  });

  describe('Nodes API', () => {
    let documentId;
    let nodeId;

    beforeAll(async () => {
      // Create a test document first
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test Document for Nodes' });
      documentId = docResponse.body.id;
    });

    afterAll(async () => {
      // Clean up test document
      if (documentId) {
        await request(app)
          .delete(`/api/documents/${documentId}`);
      }
    });

    it('should create a new node', async () => {
      const nodeData = {
        document_id: documentId,
        node_type: 'paragraph',
        title: 'Test Node',
        order_index: 0,
        indent_level: 0
      };

      const response = await request(app)
        .post('/api/nodes')
        .send(nodeData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Node');
      nodeId = response.body.id;
    });

    it('should get nodes by document', async () => {
      const response = await request(app)
        .get(`/api/nodes/document/${documentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a node by ID', async () => {
      if (!nodeId) {
        throw new Error('Node ID not available');
      }

      const response = await request(app)
        .get(`/api/nodes/${nodeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', nodeId);
      expect(response.body).toHaveProperty('title', 'Test Node');
    });
  });

  describe('Content API', () => {
    let documentId;
    let nodeId;

    beforeAll(async () => {
      // Create test document and node
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test Document for Content' });
      documentId = docResponse.body.id;

      const nodeResponse = await request(app)
        .post('/api/nodes')
        .send({
          document_id: documentId,
          node_type: 'paragraph',
          title: 'Test Node for Content',
          order_index: 0,
          indent_level: 0
        });
      nodeId = nodeResponse.body.id;
    });

    afterAll(async () => {
      // Clean up
      if (documentId) {
        await request(app)
          .delete(`/api/documents/${documentId}`);
      }
    });

    it('should save node content', async () => {
      const contentData = {
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

      const response = await request(app)
        .post(`/api/content/${nodeId}`)
        .send(contentData)
        .expect(200);

      expect(response.body).toHaveProperty('node_id', nodeId);
    });

    it('should get node content', async () => {
      const response = await request(app)
        .get(`/api/content/${nodeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('node_id', nodeId);
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown')
        .expect(404);
    });

    it('should return 400 for invalid document creation', async () => {
      await request(app)
        .post('/api/documents')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid node creation', async () => {
      await request(app)
        .post('/api/nodes')
        .send({ title: 'Incomplete Node' })
        .expect(400);
    });
  });
});