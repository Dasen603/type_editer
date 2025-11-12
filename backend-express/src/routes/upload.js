const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../../uploads');

// 创建上传目录的工具函数
async function ensureUploadDir() {
  try {
    await fs.access(uploadDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('Created upload directory:', uploadDir);
    } else {
      throw error;
    }
  }
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomNum = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${randomNum}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only image files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
    files: 5 // 最多5个文件
  }
});

/**
 * 上传单个文件
 * POST /api/upload/single
 */
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select a file to upload' 
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'File size must not exceed 10MB' 
      });
    }
    
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

/**
 * 上传多个文件
 * POST /api/upload/multiple
 */
router.post('/multiple', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        message: 'Please select files to upload' 
      });
    }

    const filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    res.json({
      message: `${req.files.length} files uploaded successfully`,
      files: filesInfo
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'File size must not exceed 10MB' 
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum 5 files allowed' 
      });
    }
    
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload files',
      message: error.message 
    });
  }
});

/**
 * 获取文件列表
 * GET /api/upload/list
 */
router.get('/list', async (req, res) => {
  try {
    await ensureUploadDir();
    
    const files = await fs.readdir(uploadDir);
    const fileList = [];
    
    for (const filename of files) {
      try {
        const filePath = path.join(uploadDir, filename);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          fileList.push({
            filename,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            url: `/uploads/${filename}`
          });
        }
      } catch (error) {
        console.warn(`Error reading file stats for ${filename}:`, error.message);
      }
    }
    
    // 按创建时间降序排序
    fileList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      files: fileList,
      count: fileList.length
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message 
    });
  }
});

/**
 * 删除文件
 * DELETE /api/upload/:filename
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ 
        error: 'Missing filename',
        message: 'Filename is required' 
      });
    }

    // 验证文件名安全性
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        error: 'Invalid filename',
        message: 'Filename contains invalid characters' 
      });
    }

    const filePath = path.join(uploadDir, filename);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'The specified file does not exist' 
        });
      }
      throw error;
    }
    
    await fs.unlink(filePath);
    
    res.json({
      message: 'File deleted successfully',
      filename
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: error.message 
    });
  }
});

/**
 * 获取文件信息
 * GET /api/upload/:filename/info
 */
router.get('/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ 
        error: 'Missing filename',
        message: 'Filename is required' 
      });
    }

    // 验证文件名安全性
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        error: 'Invalid filename',
        message: 'Filename contains invalid characters' 
      });
    }

    const filePath = path.join(uploadDir, filename);
    
    try {
      const stats = await fs.stat(filePath);
      
      const fileInfo = {
        filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        url: `/uploads/${filename}`,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
      
      res.json(fileInfo);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'The specified file does not exist' 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ 
      error: 'Failed to get file info',
      message: error.message 
    });
  }
});

/**
 * 清理过期文件（超过30天的文件）
 * POST /api/upload/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    await ensureUploadDir();
    
    const files = await fs.readdir(uploadDir);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const filename of files) {
      try {
        const filePath = path.join(uploadDir, filename);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.birthtime < thirtyDaysAgo) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.warn(`Error processing file ${filename} during cleanup:`, error.message);
      }
    }
    
    res.json({
      message: `Cleanup completed. Deleted ${deletedCount} files.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup files',
      message: error.message 
    });
  }
});

module.exports = router;