const db = require('./database');

/**
 * 节点服务类
 */
class NodeService {
  /**
   * 获取文档的所有节点
   */
  async getNodesByDocument(documentId) {
    try {
      const nodes = await db.all(`
        SELECT n.*, c.content_json
        FROM nodes n
        LEFT JOIN content c ON n.id = c.node_id
        WHERE n.document_id = ?
        ORDER BY n.order_index ASC
      `, [documentId]);
      
      return nodes.map(node => ({
        ...node,
        content: node.content_json ? JSON.parse(node.content_json) : null
      }));
    } catch (error) {
      throw new Error(`Failed to fetch nodes: ${error.message}`);
    }
  }

  /**
   * 根据ID获取节点
   */
  async getNodeById(id) {
    try {
      const node = await db.get(`
        SELECT n.*, c.content_json
        FROM nodes n
        LEFT JOIN content c ON n.id = c.node_id
        WHERE n.id = ?
      `, [id]);
      
      if (!node) {
        throw new Error('Node not found');
      }
      
      return {
        ...node,
        content: node.content_json ? JSON.parse(node.content_json) : null
      };
    } catch (error) {
      throw new Error(`Failed to fetch node: ${error.message}`);
    }
  }

  /**
   * 创建新节点
   */
  async createNode(nodeData) {
    try {
      const { document_id, parent_id, node_type, title, order_index, indent_level = 0, image_url, content } = nodeData;
      
      // 验证必需字段
      if (!document_id || !node_type || !title || order_index === undefined) {
        throw new Error('Missing required fields: document_id, node_type, title, order_index');
      }

      // 验证数据类型
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Title must be a non-empty string');
      }

      if (!Number.isInteger(order_index) || order_index < 0) {
        throw new Error('Order index must be a non-negative integer');
      }

      if (!Number.isInteger(indent_level) || indent_level < 0) {
        throw new Error('Indent level must be a non-negative integer');
      }

      // 检查文档是否存在
      const documentExists = await db.get('SELECT id FROM documents WHERE id = ?', [document_id]);
      if (!documentExists) {
        throw new Error('Document not found');
      }

      // 如果指定了父节点，验证父节点存在
      if (parent_id) {
        const parentExists = await db.get('SELECT id FROM nodes WHERE id = ?', [parent_id]);
        if (!parentExists) {
          throw new Error('Parent node not found');
        }
      }

      // 创建节点
      const nodeResult = await db.run(`
        INSERT INTO nodes (document_id, parent_id, node_type, title, order_index, indent_level, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [document_id, parent_id, node_type, title.trim(), order_index, indent_level, image_url]);

      const nodeId = nodeResult.lastID;

      // 如果有内容，创建内容记录
      if (content) {
        const contentJson = typeof content === 'string' ? content : JSON.stringify(content);
        await db.run(
          'INSERT INTO content (node_id, content_json) VALUES (?, ?)',
          [nodeId, contentJson]
        );
      }

      // 更新文档的更新时间
      await db.run(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [document_id]
      );

      return await this.getNodeById(nodeId);
    } catch (error) {
      throw new Error(`Failed to create node: ${error.message}`);
    }
  }

  /**
   * 更新节点
   */
  async updateNode(id, updates) {
    try {
      const node = await this.getNodeById(id);
      
      const nodeUpdateFields = [];
      const nodeUpdateValues = [];
      let contentUpdate = null;
      
      // 处理节点字段更新
      if (updates.title !== undefined) {
        if (!updates.title || typeof updates.title !== 'string' || updates.title.trim().length === 0) {
          throw new Error('Title must be a non-empty string');
        }
        nodeUpdateFields.push('title = ?');
        nodeUpdateValues.push(updates.title.trim());
      }
      
      if (updates.node_type !== undefined) {
        nodeUpdateFields.push('node_type = ?');
        nodeUpdateValues.push(updates.node_type);
      }
      
      if (updates.parent_id !== undefined) {
        if (updates.parent_id && updates.parent_id !== null) {
          const parentExists = await db.get('SELECT id FROM nodes WHERE id = ?', [updates.parent_id]);
          if (!parentExists) {
            throw new Error('Parent node not found');
          }
        }
        nodeUpdateFields.push('parent_id = ?');
        nodeUpdateValues.push(updates.parent_id);
      }
      
      if (updates.order_index !== undefined) {
        if (!Number.isInteger(updates.order_index) || updates.order_index < 0) {
          throw new Error('Order index must be a non-negative integer');
        }
        nodeUpdateFields.push('order_index = ?');
        nodeUpdateValues.push(updates.order_index);
      }
      
      if (updates.indent_level !== undefined) {
        if (!Number.isInteger(updates.indent_level) || updates.indent_level < 0) {
          throw new Error('Indent level must be a non-negative integer');
        }
        nodeUpdateFields.push('indent_level = ?');
        nodeUpdateValues.push(updates.indent_level);
      }
      
      if (updates.image_url !== undefined) {
        nodeUpdateFields.push('image_url = ?');
        nodeUpdateValues.push(updates.image_url);
      }
      
      // 处理内容更新
      if (updates.content !== undefined) {
        contentUpdate = typeof updates.content === 'string' ? updates.content : JSON.stringify(updates.content);
      }
      
      // 更新节点
      if (nodeUpdateFields.length > 0) {
        nodeUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        nodeUpdateValues.push(id);
        
        await db.run(
          `UPDATE nodes SET ${nodeUpdateFields.join(', ')} WHERE id = ?`,
          nodeUpdateValues
        );
      }
      
      // 更新内容
      if (contentUpdate !== null) {
        const contentExists = await db.get('SELECT id FROM content WHERE node_id = ?', [id]);
        
        if (contentExists) {
          await db.run(
            'UPDATE content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE node_id = ?',
            [contentUpdate, id]
          );
        } else {
          await db.run(
            'INSERT INTO content (node_id, content_json) VALUES (?, ?)',
            [id, contentUpdate]
          );
        }
      }

      // 更新文档的更新时间
      await db.run(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [node.document_id]
      );

      return await this.getNodeById(id);
    } catch (error) {
      throw new Error(`Failed to update node: ${error.message}`);
    }
  }

  /**
   * 删除节点
   */
  async deleteNode(id) {
    try {
      const node = await this.getNodeById(id);
      
      // 删除所有子节点
      await this.deleteChildNodes(id);
      
      // 删除节点内容
      await db.run('DELETE FROM content WHERE node_id = ?', [id]);
      
      // 删除节点
      const result = await db.run('DELETE FROM nodes WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Node not found');
      }

      // 更新文档的更新时间
      await db.run(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [node.document_id]
      );

      return { message: 'Node deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete node: ${error.message}`);
    }
  }

  /**
   * 递归删除子节点
   */
  async deleteChildNodes(parentId) {
    try {
      const childNodes = await db.all(
        'SELECT id FROM nodes WHERE parent_id = ?',
        [parentId]
      );
      
      for (const child of childNodes) {
        await this.deleteChildNodes(child.id);
        await db.run('DELETE FROM content WHERE node_id = ?', [child.id]);
        await db.run('DELETE FROM nodes WHERE id = ?', [child.id]);
      }
    } catch (error) {
      throw new Error(`Failed to delete child nodes: ${error.message}`);
    }
  }

  /**
   * 批量更新节点顺序
   */
  async reorderNodes(documentId, nodeOrders) {
    try {
      if (!Array.isArray(nodeOrders)) {
        throw new Error('Node orders must be an array');
      }

      // 验证所有节点都属于指定文档
      for (const { nodeId } of nodeOrders) {
        const node = await db.get(
          'SELECT document_id FROM nodes WHERE id = ?',
          [nodeId]
        );
        
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }
        
        if (node.document_id !== documentId) {
          throw new Error(`Node ${nodeId} does not belong to document ${documentId}`);
        }
      }

      // 批量更新顺序
      for (let i = 0; i < nodeOrders.length; i++) {
        const { nodeId, parentId, indentLevel } = nodeOrders[i];
        
        await db.run(`
          UPDATE nodes 
          SET order_index = ?, parent_id = ?, indent_level = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [i, parentId, indentLevel || 0, nodeId]);
      }

      // 更新文档的更新时间
      await db.run(
        'UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [documentId]
      );

      return { message: 'Nodes reordered successfully' };
    } catch (error) {
      throw new Error(`Failed to reorder nodes: ${error.message}`);
    }
  }

  /**
   * 获取节点的子节点
   */
  async getChildNodes(parentId) {
    try {
      const nodes = await db.all(`
        SELECT n.*, c.content_json
        FROM nodes n
        LEFT JOIN content c ON n.id = c.node_id
        WHERE n.parent_id = ?
        ORDER BY n.order_index ASC
      `, [parentId]);
      
      return nodes.map(node => ({
        ...node,
        content: node.content_json ? JSON.parse(node.content_json) : null
      }));
    } catch (error) {
      throw new Error(`Failed to fetch child nodes: ${error.message}`);
    }
  }

  /**
   * 检查节点是否存在
   */
  async nodeExists(id) {
    try {
      const node = await db.get('SELECT id FROM nodes WHERE id = ?', [id]);
      return !!node;
    } catch (error) {
      throw new Error(`Failed to check node existence: ${error.message}`);
    }
  }
}

module.exports = new NodeService();