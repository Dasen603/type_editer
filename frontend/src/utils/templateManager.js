// 模板管理工具函数
const TEMPLATES_STORAGE_KEY = 'latex_templates';
const DEFAULT_TEMPLATE_KEY = 'default_template_id';

// 获取所有模板（合并默认模板和自定义模板）
export const getAllTemplates = () => {
  const defaultTemplates = getDefaultTemplates();
  const customTemplates = getCustomTemplates();
  return [...defaultTemplates, ...customTemplates];
};

// 获取默认模板
export const getDefaultTemplates = () => {
  return [
    {
      id: 'basic-article',
      name: 'Basic Article Template',
      description: 'Simple and clean article template for general use. Perfect for academic papers, reports, and general writing.',
      category: 'conference',
      isDefault: true,
      isCustom: false
    },
    {
      id: 'ieee-conference',
      name: 'IEEE Conference Paper Template',
      description: 'Standard IEEE conference paper template with two-column layout. Widely used for academic conferences and technical papers.',
      category: 'conference',
      isDefault: false,
      isCustom: false
    },
    {
      id: 'acm-article',
      name: 'ACM Article Template',
      description: 'ACM article template for journals and transactions. Suitable for computer science publications and research papers.',
      category: 'journal',
      isDefault: false,
      isCustom: false
    }
  ];
};

// 获取自定义模板
export const getCustomTemplates = () => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading custom templates:', error);
  }
  return [];
};

// 保存自定义模板
export const saveCustomTemplate = (template) => {
  try {
    const customTemplates = getCustomTemplates();
    const existingIndex = customTemplates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      // 更新现有模板
      customTemplates[existingIndex] = template;
    } else {
      // 添加新模板
      customTemplates.push(template);
    }
    
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(customTemplates));
    return true;
  } catch (error) {
    console.error('Error saving custom template:', error);
    return false;
  }
};

// 删除自定义模板
export const deleteCustomTemplate = (templateId) => {
  try {
    const customTemplates = getCustomTemplates();
    const filtered = customTemplates.filter(t => t.id !== templateId);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
    
    // 删除关联的文件
    deleteTemplateFile(templateId);
    
    // 如果删除的是默认模板，清除默认模板设置
    const defaultId = getDefaultTemplateId();
    if (defaultId === templateId) {
      clearDefaultTemplate();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting custom template:', error);
    return false;
  }
};

// 设置默认模板
export const setDefaultTemplate = (templateId) => {
  try {
    localStorage.setItem(DEFAULT_TEMPLATE_KEY, templateId);
    return true;
  } catch (error) {
    console.error('Error setting default template:', error);
    return false;
  }
};

// 获取默认模板ID
export const getDefaultTemplateId = () => {
  try {
    return localStorage.getItem(DEFAULT_TEMPLATE_KEY) || 'basic-article';
  } catch (error) {
    console.error('Error getting default template ID:', error);
    return 'basic-article';
  }
};

// 清除默认模板设置
export const clearDefaultTemplate = () => {
  try {
    localStorage.removeItem(DEFAULT_TEMPLATE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing default template:', error);
    return false;
  }
};

// 生成唯一的模板ID
export const generateTemplateId = () => {
  return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 保存模板文件（将文件转换为 base64 或保存文件引用）
export const saveTemplateFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result // base64 编码的数据
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 获取模板文件
export const getTemplateFile = (templateId) => {
  try {
    const stored = localStorage.getItem(`template_file_${templateId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading template file:', error);
  }
  return null;
};

// 保存模板文件
export const storeTemplateFile = (templateId, fileData) => {
  try {
    localStorage.setItem(`template_file_${templateId}`, JSON.stringify(fileData));
    return true;
  } catch (error) {
    console.error('Error storing template file:', error);
    return false;
  }
};

// 删除模板文件
export const deleteTemplateFile = (templateId) => {
  try {
    localStorage.removeItem(`template_file_${templateId}`);
    return true;
  } catch (error) {
    console.error('Error deleting template file:', error);
    return false;
  }
};

// 下载模板文件
export const downloadTemplateFile = (templateId, templateName) => {
  try {
    const fileData = getTemplateFile(templateId);
    if (!fileData || !fileData.data) {
      console.error('Template file not found');
      return false;
    }

    // 从 base64 数据中提取实际的文件数据
    const base64Data = fileData.data;
    const byteCharacters = atob(base64Data.split(',')[1] || base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: fileData.type || 'application/octet-stream' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileData.name || `${templateName || 'template'}.${fileData.name.split('.').pop() || 'zip'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading template file:', error);
    return false;
  }
};

