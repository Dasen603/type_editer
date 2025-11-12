const db = require('./database');

/**
 * 内容服务类
 */
class ContentService {
  /**
   * 获取节点内容
   */
  async getNodeContent(nodeId) {
    try {
      const content = await db.get(
        'SELECT * FROM content WHERE node_id = ?',
        [nodeId]
      );
      
      if (!content) {
        return null;
      }
      
      return {
        ...content,
        content: content.content_json ? JSON.parse(content.content_json) : null
      };
    } catch (error) {
      throw new Error(`Failed to fetch content: ${error.message}`);
    }
  }

  /**
   * 创建或更新节点内容
   */
  async saveNodeContent(nodeId, contentData) {
    try {
      // 验证节点是否存在
      const nodeExists = await db.get('SELECT id FROM nodes WHERE id = ?', [nodeId]);
      if (!nodeExists) {
        throw new Error('Node not found');
      }

      const contentJson = typeof contentData === 'string' ? contentData : JSON.stringify(contentData);
      
      // 检查内容是否已存在
      const existingContent = await db.get('SELECT id FROM content WHERE node_id = ?', [nodeId]);
      
      if (existingContent) {
        // 更新现有内容
        await db.run(
          'UPDATE content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE node_id = ?',
          [contentJson, nodeId]
        );
      } else {
        // 创建新内容
        await db.run(
          'INSERT INTO content (node_id, content_json) VALUES (?, ?)',
          [nodeId, contentJson]
        );
      }

      // 更新节点的更新时间
      await db.run(
        'UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nodeId]
      );

      // 更新文档的更新时间
      const node = await db.get('SELECT document_id FROM nodes WHERE id = ?', [nodeId]);
      if (node) {
        await db.run(
          'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [node.document_id]
        );
      }

      return await this.getNodeContent(nodeId);
    } catch (error) {
      throw new Error(`Failed to save content: ${error.message}`);
    }
  }

  /**
   * 删除节点内容
   */
  async deleteNodeContent(nodeId) {
    try {
      const result = await db.run(
        'DELETE FROM content WHERE node_id = ?',
        [nodeId]
      );

      if (result.changes === 0) {
        return { message: 'No content found for this node' };
      }

      // 更新节点的更新时间
      await db.run(
        'UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nodeId]
      );

      // 更新文档的更新时间
      const node = await db.get('SELECT document_id FROM nodes WHERE id = ?', [nodeId]);
      if (node) {
        await db.run(
          'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [node.document_id]
        );
      }

      return { message: 'Content deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  /**
   * 批量获取多个节点的内容
   */
  async getMultipleNodeContents(nodeIds) {
    try {
      if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
        return [];
      }

      const placeholders = nodeIds.map(() => '?').join(',');
      const contents = await db.all(
        `SELECT * FROM content WHERE node_id IN (${placeholders})`,
        nodeIds
      );

      return contents.map(content => ({
        ...content,
        content: content.content_json ? JSON.parse(content.content_json) : null
      }));
    } catch (error) {
      throw new Error(`Failed to fetch multiple contents: ${error.message}`);
    }
  }

  /**
   * 搜索内容
   */
  async searchContent(query) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return [];
      }

      const searchQuery = `%${query.trim()}%`;
      
      const results = await db.all(`
        SELECT c.*, n.title, n.document_id, d.title as document_title
        FROM content c
        JOIN nodes n ON c.node_id = n.id
        JOIN documents d ON n.document_id = d.id
        WHERE c.content_json LIKE ? OR n.title LIKE ?
        ORDER BY n.updated_at DESC
      `, [searchQuery, searchQuery]);

      return results.map(result => ({
        ...result,
        content: result.content_json ? JSON.parse(result.content_json) : null
      }));
    } catch (error) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }

  /**
   * 获取文档的所有内容
   */
  async getDocumentContent(documentId) {
    try {
      const contents = await db.all(`
        SELECT c.*, n.title, n.order_index, n.indent_level, n.node_type
        FROM content c
        JOIN nodes n ON c.node_id = n.id
        WHERE n.document_id = ?
        ORDER BY n.order_index ASC
      `, [documentId]);

      return contents.map(content => ({
        ...content,
        content: content.content_json ? JSON.parse(content.content_json) : null
      }));
    } catch (error) {
      throw new Error(`Failed to fetch document content: ${error.message}`);
    }
  }

  /**
   * 获取内容统计信息
   */
  async getContentStats(nodeId) {
    try {
      const content = await this.getNodeContent(nodeId);
      
      if (!content || !content.content) {
        return {
          wordCount: 0,
          characterCount: 0,
          blockCount: 0
        };
      }

      let wordCount = 0;
      let characterCount = 0;
      let blockCount = 0;

      // 处理 BlockNote 格式的内容
      if (Array.isArray(content.content)) {
        blockCount = content.content.length;
        
        content.content.forEach(block => {
          if (block.content && Array.isArray(block.content)) {
            block.content.forEach(item => {
              if (item.text) {
                const text = item.text;
                characterCount += text.length;
                wordCount += text.split(/\s+/).filter(word => word.length > 0).length;
              }
            });
          }
        });
      } else if (typeof content.content === 'string') {
        // 处理纯文本内容
        characterCount = content.content.length;
        wordCount = content.content.split(/\s+/).filter(word => word.length > 0).length;
        blockCount = 1;
      }

      return {
        wordCount,
        characterCount,
        blockCount
      };
    } catch (error) {
      throw new Error(`Failed to get content stats: ${error.message}`);
    }
  }

  /**
   * 验证内容格式
   */
  validateContent(content) {
    try {
      if (typeof content === 'string') {
        // 尝试解析为 JSON
        try {
          JSON.parse(content);
          return true;
        } catch (e) {
          // 如果不是 JSON，检查是否为有效文本
          return content.length <= 1000000; // 限制文本长度
        }
      }
      
      if (typeof content === 'object' && content !== null) {
        // 验证对象可以序列化
        const serialized = JSON.stringify(content);
        return serialized.length <= 1000000; // 限制序列化后的长度
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清理过期的内容缓存（如果有的话）
   */
  async cleanupExpiredContent() {
    try {
      // 删除没有对应节点的孤立内容
      const result = await db.run(`
        DELETE FROM content 
        WHERE node_id NOT IN (SELECT id FROM nodes)
      `);

      return {
        message: `Cleaned up ${result.changes} orphaned content records`
      };
    } catch (error) {
      throw new Error(`Failed to cleanup content: ${error.message}`);
    }
  }
}

module.exports = new ContentService();