const express = require('express');
const router = express.Router();
const documentService = require('../services/documentService');
const nodeService = require('../services/nodeService');

/**
 * 获取所有文档
 * GET /api/documents
 */
router.get('/', async (req, res) => {
  try {
    const documents = await documentService.getAllDocuments();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: error.message 
    });
  }
});

/**
 * 获取单个文档
 * GET /api/documents/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    const document = await documentService.getDocumentById(parseInt(id));
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch document',
      message: error.message 
    });
  }
});

/**
 * 创建新文档
 * POST /api/documents
 */
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        error: 'Missing required field',
        message: 'Document title is required' 
      });
    }

    const document = await documentService.createDocument(title);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    
    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create document',
      message: error.message 
    });
  }
});

/**
 * 更新文档
 * PUT /api/documents/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    const document = await documentService.updateDocument(parseInt(id), updates);
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: error.message 
      });
    }
    
    if (error.message.includes('must be') || error.message.includes('required')) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update document',
      message: error.message 
    });
  }
});

/**
 * 删除文档
 * DELETE /api/documents/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    const result = await documentService.deleteDocument(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error deleting document:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete document',
      message: error.message 
    });
  }
});

/**
 * 获取文档的所有节点
 * GET /api/documents/:id/nodes
 */
router.get('/:id/nodes', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    // 首先检查文档是否存在
    const documentExists = await documentService.documentExists(parseInt(id));
    if (!documentExists) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: 'The specified document does not exist' 
      });
    }

    const nodes = await nodeService.getNodesByDocument(parseInt(id));
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching document nodes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document nodes',
      message: error.message 
    });
  }
});

/**
 * 检查文档是否存在
 * HEAD /api/documents/:id
 */
router.head('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).end();
    }

    const exists = await documentService.documentExists(parseInt(id));
    res.status(exists ? 200 : 404).end();
  } catch (error) {
    console.error('Error checking document existence:', error);
    res.status(500).end();
  }
});

module.exports = router;