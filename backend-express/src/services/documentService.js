const db = require('./database');

/**
 * 文档服务类
 */
class DocumentService {
  /**
   * 获取所有文档
   */
  async getAllDocuments() {
    try {
      const documents = await db.all(`
        SELECT d.*, COUNT(n.id) as node_count
        FROM documents d
        LEFT JOIN nodes n ON d.id = n.document_id
        GROUP BY d.id
        ORDER BY d.updated_at DESC
      `);
      return documents;
    } catch (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  }

  /**
   * 根据ID获取文档
   */
  async getDocumentById(id) {
    try {
      const document = await db.get(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      return document;
    } catch (error) {
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  /**
   * 创建新文档
   */
  async createDocument(title, templateId = 'basic-article') {
    try {
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Document title is required and must be a non-empty string');
      }

      const result = await db.run(
        'INSERT INTO documents (title, template_id) VALUES (?, ?)',
        [title.trim(), templateId]
      );

      // 获取刚创建的文档
      const document = await db.get(
        'SELECT * FROM documents WHERE id = ?',
        [result.lastID]
      );

      return document;
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * 更新文档
   */
  async updateDocument(id, updates) {
    try {
      const document = await this.getDocumentById(id);
      
      const updateFields = [];
      const updateValues = [];
      
      if (updates.title !== undefined) {
        if (!updates.title || typeof updates.title !== 'string' || updates.title.trim().length === 0) {
          throw new Error('Document title must be a non-empty string');
        }
        updateFields.push('title = ?');
        updateValues.push(updates.title.trim());
      }
      
      if (updateFields.length === 0) {
        return document;
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);
      
      await db.run(
        `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getDocumentById(id);
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(id) {
    try {
      const document = await this.getDocumentById(id);
      
      const result = await db.run(
        'DELETE FROM documents WHERE id = ?',
        [id]
      );

      if (result.changes === 0) {
        throw new Error('Document not found');
      }

      return { message: 'Document deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * 检查文档是否存在
   */
  async documentExists(id) {
    try {
      const document = await db.get(
        'SELECT id FROM documents WHERE id = ?',
        [id]
      );
      return !!document;
    } catch (error) {
      throw new Error(`Failed to check document existence: ${error.message}`);
    }
  }
}

module.exports = new DocumentService();