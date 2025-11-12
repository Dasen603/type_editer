const express = require('express');
const router = express.Router();
const nodeService = require('../services/nodeService');

/**
 * 获取文档的所有节点
 * GET /api/nodes/document/:documentId
 */
router.get('/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId || isNaN(parseInt(documentId))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    const nodes = await nodeService.getNodesByDocument(parseInt(documentId));
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nodes',
      message: error.message 
    });
  }
});

/**
 * 获取单个节点
 * GET /api/nodes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const node = await nodeService.getNodeById(parseInt(id));
    res.json(node);
  } catch (error) {
    console.error('Error fetching node:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Node not found',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch node',
      message: error.message 
    });
  }
});

/**
 * 创建新节点
 * POST /api/nodes
 */
router.post('/', async (req, res) => {
  try {
    const nodeData = req.body;
    
    // 基本验证
    const requiredFields = ['document_id', 'node_type', 'title', 'order_index'];
    const missingFields = requiredFields.filter(field => 
      nodeData[field] === undefined || nodeData[field] === null
    );
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}` 
      });
    }

    const node = await nodeService.createNode(nodeData);
    res.status(201).json(node);
  } catch (error) {
    console.error('Error creating node:', error);
    
    if (error.message.includes('not found') || error.message.includes('Missing required')) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create node',
      message: error.message 
    });
  }
});

/**
 * 更新节点
 * PUT /api/nodes/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const node = await nodeService.updateNode(parseInt(id), updates);
    res.json(node);
  } catch (error) {
    console.error('Error updating node:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Node not found',
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
      error: 'Failed to update node',
      message: error.message 
    });
  }
});

/**
 * 删除节点
 * DELETE /api/nodes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const result = await nodeService.deleteNode(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error deleting node:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Node not found',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete node',
      message: error.message 
    });
  }
});

/**
 * 批量重新排序节点
 * POST /api/nodes/document/:documentId/reorder
 */
router.post('/document/:documentId/reorder', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { nodeOrders } = req.body;
    
    if (!documentId || isNaN(parseInt(documentId))) {
      return res.status(400).json({ 
        error: 'Invalid document ID',
        message: 'Document ID must be a valid number' 
      });
    }

    if (!Array.isArray(nodeOrders)) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'nodeOrders must be an array' 
      });
    }

    const result = await nodeService.reorderNodes(parseInt(documentId), nodeOrders);
    res.json(result);
  } catch (error) {
    console.error('Error reordering nodes:', error);
    
    if (error.message.includes('not found') || error.message.includes('must be')) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to reorder nodes',
      message: error.message 
    });
  }
});

/**
 * 获取节点的子节点
 * GET /api/nodes/:id/children
 */
router.get('/:id/children', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const children = await nodeService.getChildNodes(parseInt(id));
    res.json(children);
  } catch (error) {
    console.error('Error fetching child nodes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch child nodes',
      message: error.message 
    });
  }
});

/**
 * 检查节点是否存在
 * HEAD /api/nodes/:id
 */
router.head('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).end();
    }

    const exists = await nodeService.nodeExists(parseInt(id));
    res.status(exists ? 200 : 404).end();
  } catch (error) {
    console.error('Error checking node existence:', error);
    res.status(500).end();
  }
});

module.exports = router;