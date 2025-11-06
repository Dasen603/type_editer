# type Editor - 结构化文档编辑器

## 项目概述
一个基于 React + Node.js Express + SQLite 的结构化文档编辑器 MVP，支持大纲管理、BlockNote 富文本编辑、公式图片插入和自动保存功能。

## 技术栈

### 前端
- React 19 (Vite)
- @blocknote/react - 富文本编辑器
- Tailwind CSS v4 (使用 @tailwindcss/vite 插件)
- KaTeX - 数学公式渲染
- @dnd-kit - 拖拽排序
- Axios - HTTP 客户端
- lucide-react - 图标库

### 后端
- Node.js Express (临时方案)
- SQLite3 - 数据持久化
- Multer - 文件上传
- CORS - 跨域支持

### 原计划后端 (编译时间过长，暂时搁置)
- Rust + Axum
- SQLite + sqlx  
- headless_chrome (PDF 导出)

## 项目结构

```
/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── Sidebar.jsx      # 左侧边栏 (Library, References, Pictures)
│   │   │   ├── Editor.jsx       # BlockNote 编辑器
│   │   │   └── TopBar.jsx       # 顶部导航栏
│   │   ├── services/
│   │   │   └── api.js           # API 调用封装
│   │   ├── App.jsx        # 主应用组件
│   │   └── main.jsx       # 入口文件
│   ├── vite.config.js     # Vite 配置 (端口 5000)
│   └── package.json
│
├── backend-express/       # Express 后端服务器
│   ├── server.js          # 主服务器文件 (端口 3001)
│   └── package.json
│
├── backend/               # Rust 后端 (未完成编译)
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs
│   │   ├── handlers.rs
│   │   └── models.rs
│   └── Cargo.toml
│
├── uploads/               # 上传文件存储目录
└── type_editor.db         # SQLite 数据库

```

## 数据库模式

### documents 表
- id: INTEGER PRIMARY KEY
- title: TEXT
- created_at, updated_at: DATETIME

### nodes 表  
- id: INTEGER PRIMARY KEY
- document_id: INTEGER (外键)
- parent_id: INTEGER (外键，可为空)
- node_type: TEXT ('section', 'equation', 'figure')
- title: TEXT
- order_index: INTEGER
- indent_level: INTEGER
- created_at, updated_at: DATETIME

### content 表
- id: INTEGER PRIMARY KEY
- node_id: INTEGER (外键，唯一)
- content_json: TEXT (BlockNote 编辑器内容)
- updated_at: DATETIME

## API 端点

### 文档管理
- GET /api/documents - 获取所有文档
- POST /api/documents - 创建新文档
- GET /api/documents/:id - 获取单个文档
- PUT /api/documents/:id - 更新文档
- DELETE /api/documents/:id - 删除文档

### 节点管理
- GET /api/documents/:doc_id/nodes - 获取文档的所有节点
- POST /api/nodes - 创建节点
- GET /api/nodes/:id - 获取单个节点
- PUT /api/nodes/:id - 更新节点
- DELETE /api/nodes/:id - 删除节点

### 内容管理
- GET /api/content/:node_id - 获取节点内容
- PUT /api/content/:node_id - 保存节点内容

### 文件上传
- POST /api/upload - 上传文件
- GET /uploads/:filename - 访问上传的文件

### PDF 导出
- POST /api/export/pdf - 导出 PDF (占位符接口)

## 已实现功能

### 后端 ✅
- ✅ Express 服务器配置 (端口 3001)
- ✅ SQLite 数据库初始化
- ✅ 文档 CRUD API
- ✅ 节点 CRUD API  
- ✅ 内容保存 API
- ✅ 文件上传功能
- ✅ CORS 配置
- ✅ 数据库表创建和外键关系
- ✅ 自动时间戳

### 前端 ✅
- ✅ Vite + React 18.3.1 项目
- ✅ Tailwind CSS v4 配置
- ✅ BlockNote 编辑器集成 (@blocknote/mantine)
- ✅ 组件结构设计
  - Sidebar: 左侧边栏，包含 References 和 Pictures 分组
  - Editor: BlockNote 富文本编辑区
  - TopBar: 顶部导航栏  
- ✅ API 服务层封装
- ✅ 主应用状态管理
- ✅ 自动保存机制 (2秒防抖)
- ✅ 完整的前后端集成
- ✅ **应用已成功渲染并运行**

## 已知问题

### ✅ 已解决
1. ~~**前端页面空白**~~ - 已解决！通过以下措施：
   - 降级 React 从 19.x 到 18.3.1（BlockNote 不兼容 React 19）
   - 使用 @blocknote/mantine 替代 @blocknote/react（更稳定的渲染）
   - 禁用 StrictMode（React 19 兼容性问题）

### ⚠️ 次要问题
1. Rust 后端编译时间过长（因 headless_chrome 依赖），已暂时使用 Express 替代
2. PDF 导出功能尚未实现
3. 公式节点渲染尚未完成
4. 拖拽排序功能尚未集成

## 待完成功能

### MVP 核心功能
- [ ] 修复前端渲染问题
- [ ] 完善 BlockNote 编辑器工具栏
- [ ] 实现节点拖拽排序
- [ ] 完成公式节点 (KaTeX 渲染)
- [ ] 完成图片节点显示
- [ ] UI 样式精修 (按照参考图 1:1 复刻)

### 扩展功能 (后续)
- [ ] PDF 导出 (三个模板：论文/报告/简历)
- [ ] 中文字体嵌入 (Noto Serif/Sans CJK SC)  
- [ ] 文档全文搜索
- [ ] 版本历史
- [ ] 多文档管理

## 运行方式

### 启动后端
```bash
cd backend-express
node server.js
# 运行在 http://localhost:3001
```

### 启动前端
```bash
cd frontend  
npm run dev
# 运行在 http://localhost:5000
```

### 工作流配置
- `backend`: 自动启动 Express 服务器 (端口 3001)
- `frontend`: 自动启动 Vite 开发服务器 (端口 5000)

## 开发注意事项

1. **数据库位置**: SQLite 数据库文件在项目根目录 `type_editor.db`
2. **文件上传**: 上传的文件存储在 `/uploads` 目录
3. **前端代理**: 前端直接调用 `http://localhost:3001/api/*` 
4. **Tailwind CSS**: 使用 v4 版本，通过 @tailwindcss/vite 插件集成
5. **BlockNote**: 使用最新版本 (@blocknote/react ^0.41.1)

## 下一步工作
1. **紧急**: 调试并修复前端页面空白问题
2. 完善 UI 组件和样式
3. 集成拖拽排序功能
4. 实现公式和图片节点渲染
5. 考虑是否继续 Rust 后端或长期使用 Express

## 项目状态
🟢 **MVP 已完成** - 核心功能可用：文档管理、节点创建、BlockNote 富文本编辑、自动保存

## 技术亮点
1. **BlockNote 兼容性解决方案**
   - React 18.3.1 + @blocknote/mantine（替代原版避免 React 19 兼容性问题）
   - 成功集成 Notion 风格的块编辑器

2. **完整的前后端分离架构**
   - 前端：React + Vite + Tailwind CSS v4
   - 后端：Express + SQLite
   - RESTful API 设计

3. **响应式 UI 设计**
   - 左侧 280px 固定宽度侧边栏
   - 灵活的主编辑区域
   - 清晰的视觉层次
