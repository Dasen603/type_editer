const request = require('supertest');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const testDbPath = path.join(__dirname, '../../backend-express/test_security_db.sqlite');
let testDb;
let app;

beforeAll(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  testDb = new sqlite3.Database(testDbPath);
  
  process.env.DB_PATH = testDbPath;
  process.env.ALLOWED_ORIGINS = 'http://localhost:5000';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  
  delete require.cache[require.resolve('../../backend-express/server')];
  app = require('../../backend-express/server');
});

afterAll((done) => {
  testDb.close((err) => {
    if (err) console.error('Error closing test database:', err);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    done();
  });
});

describe('Security Tests', () => {
  beforeEach((done) => {
    testDb.run('DELETE FROM content', () => {
      testDb.run('DELETE FROM nodes', () => {
        testDb.run('DELETE FROM documents', done);
      });
    });
  });
  
  describe('SQL Injection Protection', () => {
    test('Should prevent SQL injection in document ID parameter', async () => {
      const maliciousId = "1' OR '1'='1";
      const response = await request(app)
        .get(`/api/documents/${maliciousId}`)
        .expect(400);
      
      expect(response.body.error).toContain('Invalid');
    });
    
    test('Should prevent SQL injection in document title', async () => {
      const maliciousTitle = "'; DROP TABLE documents; --";
      const response = await request(app)
        .post('/api/documents')
        .send({ title: maliciousTitle })
        .expect(400);
      
      // Table should still exist
      const listResponse = await request(app)
        .get('/api/documents')
        .expect(200);
      
      expect(Array.isArray(listResponse.body)).toBe(true);
    });
    
    test('Should prevent SQL injection in node title', async () => {
      // First create a document
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test Doc' });
      const docId = docResponse.body.id;
      
      const maliciousTitle = "'; DELETE FROM nodes; --";
      const response = await request(app)
        .post('/api/nodes')
        .send({
          document_id: docId,
          node_type: 'section',
          title: maliciousTitle,
          order_index: 0,
          indent_level: 0
        })
        .expect(400);
    });
  });
  
  describe('XSS Protection', () => {
    test('Should sanitize script tags in title', async () => {
      const xssTitle = '<script>alert("XSS")</script>Hello';
      const response = await request(app)
        .post('/api/documents')
        .send({ title: xssTitle })
        .expect(200);
      
      // Script tags should be removed
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.title).not.toContain('</script>');
      expect(response.body.title).toContain('Hello');
    });
    
    test('Should sanitize HTML tags in node title', async () => {
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test' });
      const docId = docResponse.body.id;
      
      const xssTitle = '<img src=x onerror=alert(1)>';
      const response = await request(app)
        .post('/api/nodes')
        .send({
          document_id: docId,
          node_type: 'section',
          title: xssTitle,
          order_index: 0,
          indent_level: 0
        })
        .expect(200);
      
      expect(response.body.title).not.toContain('<img');
    });
  });
  
  describe('File Upload Security', () => {
    test('Should reject executable files', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('fake exe content'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload'
        })
        .expect(400);
      
      expect(response.body.error).toContain('file type');
    });
    
    test('Should reject files with path traversal in filename', async () => {
      // Create a fake image buffer
      const fakeImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', fakeImage, {
          filename: '../../../etc/passwd.jpg',
          contentType: 'image/jpeg'
        });
      
      // Filename should be sanitized (no path traversal)
      if (response.status === 200) {
        expect(response.body.filename).not.toContain('../');
        expect(response.body.filename).not.toContain('etc');
        expect(response.body.filename).not.toContain('passwd');
      }
    });
    
    test('Should reject files that exceed size limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      // Add JPEG header to make it look like an image
      largeBuffer[0] = 0xFF;
      largeBuffer[1] = 0xD8;
      largeBuffer[2] = 0xFF;
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        })
        .expect(413);
    });
  });
  
  describe('CORS Security', () => {
    test('Should reject requests from unauthorized origin', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Origin', 'http://evil.com')
        .expect(500); // CORS middleware rejects with error
    });
    
    test('Should allow requests from authorized origin', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Origin', 'http://localhost:5000')
        .expect(200);
    });
  });
  
  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // Make many requests rapidly
      const requests = Array(150).fill(null).map(() =>
        request(app)
          .get('/api/documents')
          .set('Origin', 'http://localhost:5000')
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
  
  describe('Input Validation', () => {
    test('Should reject oversized titles', async () => {
      const longTitle = 'a'.repeat(501);
      const response = await request(app)
        .post('/api/documents')
        .send({ title: longTitle })
        .expect(400);
      
      expect(response.body.error).toContain('500');
    });
    
    test('Should reject invalid node types', async () => {
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test' });
      const docId = docResponse.body.id;
      
      const response = await request(app)
        .post('/api/nodes')
        .send({
          document_id: docId,
          node_type: 'malicious_type',
          title: 'Test',
          order_index: 0,
          indent_level: 0
        })
        .expect(400);
      
      expect(response.body.error).toContain('node_type');
    });
    
    test('Should reject negative order_index', async () => {
      const docResponse = await request(app)
        .post('/api/documents')
        .send({ title: 'Test' });
      const docId = docResponse.body.id;
      
      const response = await request(app)
        .post('/api/nodes')
        .send({
          document_id: docId,
          node_type: 'section',
          title: 'Test',
          order_index: -1,
          indent_level: 0
        })
        .expect(400);
    });
  });
});

