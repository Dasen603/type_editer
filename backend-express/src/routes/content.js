const express = require('express');
const router = express.Router();
const contentService = require('../services/contentService');

/**
 * 获取节点内容
 * GET /api/content/:nodeId
 */
router.get('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    if (!nodeId || isNaN(parseInt(nodeId))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const content = await contentService.getNodeContent(parseInt(nodeId));
    
    if (!content) {
      return res.status(404).json({ 
        error: 'Content not found',
        message: 'No content found for this node' 
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch content',
      message: error.message 
    });
  }
});

/**
 * 保存节点内容
 * POST /api/content/:nodeId
 * PUT /api/content/:nodeId
 */
router.post('/:nodeId', saveContent);
router.put('/:nodeId', saveContent);

async function saveContent(req, res) {
  try {
    const { nodeId } = req.params;
    const { content } = req.body;
    
    if (!nodeId || isNaN(parseInt(nodeId))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({ 
        error: 'Missing content',
        message: 'Content is required' 
      });
    }

    // 验证内容格式
    if (!contentService.validateContent(content)) {
      return res.status(400).json({ 
        error: 'Invalid content format',
        message: 'Content format is invalid or too large' 
      });
    }

    const savedContent = await contentService.saveNodeContent(parseInt(nodeId), content);
    res.json(savedContent);
  } catch (error) {
    console.error('Error saving content:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Node not found',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to save content',
      message: error.message 
    });
  }
}

/**
 * 删除节点内容
 * DELETE /api/content/:nodeId
 */
router.delete('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    if (!nodeId || isNaN(parseInt(nodeId))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const result = await contentService.deleteNodeContent(parseInt(nodeId));
    res.json(result);
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ 
      error: 'Failed to delete content',
      message: error.message 
    });
  }
});

/**
 * 批量获取多个节点的内容
 * POST /api/content/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { nodeIds } = req.body;
    
    if (!Array.isArray(nodeIds)) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'nodeIds must be an array' 
      });
    }

    if (nodeIds.length === 0) {
      return res.json([]);
    }

    // 验证所有ID都是数字
    const invalidIds = nodeIds.filter(id => isNaN(parseInt(id)));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid node IDs',
        message: `Invalid IDs: ${invalidIds.join(', ')}` 
      });
    }

    const numericIds = nodeIds.map(id => parseInt(id));
    const contents = await contentService.getMultipleNodeContents(numericIds);
    res.json(contents);
  } catch (error) {
    console.error('Error fetching batch content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch batch content',
      message: error.message 
    });
  }
});

/**
 * 搜索内容
 * GET /api/content/search?q=query
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Missing query parameter',
        message: 'Query parameter "q" is required' 
      });
    }

    if (typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid query',
        message: 'Query must be a non-empty string' 
      });
    }

    const results = await contentService.searchContent(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({ 
      error: 'Failed to search content',
      message: error.message 
    });
  }
});

/**
 * 获取文档的所有内容
 * GET /api/content/document/:documentId
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

    const contents = await contentService.getDocumentContent(parseInt(documentId));
    res.json(contents);
  } catch (error) {
    console.error('Error fetching document content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document content',
      message: error.message 
    });
  }
});

/**
 * 获取内容统计信息
 * GET /api/content/:nodeId/stats
 */
router.get('/:nodeId/stats', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    if (!nodeId || isNaN(parseInt(nodeId))) {
      return res.status(400).json({ 
        error: 'Invalid node ID',
        message: 'Node ID must be a valid number' 
      });
    }

    const stats = await contentService.getContentStats(parseInt(nodeId));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch content stats',
      message: error.message 
    });
  }
});

/**
 * 清理过期内容
 * POST /api/content/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await contentService.cleanupExpiredContent();
    res.json(result);
  } catch (error) {
    console.error('Error cleaning up content:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup content',
      message: error.message 
    });
  }
});

module.exports = router;