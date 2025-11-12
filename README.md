# type Editor - 结构化文档编辑器

## 🚀 快速开始

### 一键启动（推荐）

**Windows 用户**：双击 `start.bat` 文件  
**Linux/macOS 用户**：运行 `./start.sh`  
**跨平台**：运行 `npm start`

详细说明请查看 [启动说明.md](./启动说明.md)

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

## 一键启动

### Windows 用户

**方式1：双击运行批处理文件（最简单）**
```
双击 start.bat 文件
```

**方式2：使用 PowerShell**
```powershell
.\start.ps1
```

**方式3：使用 npm 脚本**
```bash
npm run start:win    # 批处理文件
npm run start:ps     # PowerShell 脚本
```

### Linux/macOS 用户

**方式1：使用 shell 脚本**
```bash
chmod +x start.sh
./start.sh
```

**方式2：使用 npm 脚本**
```bash
npm run start:unix
```

### 跨平台方式（推荐）

使用 Node.js 脚本，支持所有平台：
```bash
npm start
```

或者直接运行：
```bash
node start.js
```

### 手动启动（分别启动）

如果需要分别启动前后端：

**启动后端**
```bash
npm run backend
# 或
cd backend-express
node server.js
```

**启动前端**
```bash
npm run frontend
# 或
cd frontend
npm run dev
```

> 💡 **提示**：一键启动脚本会自动检查并安装依赖，首次运行可能需要几分钟。

## 环境配置

### 环境变量

创建 `.env` 文件（参考 `.env.example`）来配置以下变量：

```bash
# Server Configuration
PORT=3001

# Database Configuration
DB_PATH=../type_editor.db

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# API Security (optional, leave empty to disable)
API_KEY=

# Rate Limiting
RATE_LIMIT_MAX=100

# Environment
NODE_ENV=development
```

### 启动后端
```bash
cd backend-express
# 安装依赖（首次运行）
npm install

# 启动服务器
node server.js
# 运行在 http://localhost:3001 (或配置的PORT)
```

### 启动前端
```bash
cd frontend  
# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
# 运行在 http://localhost:5000
```

### 端口说明
- **后端**: 默认运行在 `http://localhost:3001`（可通过 `PORT` 环境变量配置）
- **前端**: 默认运行在 `http://localhost:5000`（Vite 开发服务器）
- 前端会自动代理 `/api` 和 `/uploads` 请求到后端

## 测试

### 运行后端测试
```bash
cd backend-express
npm test              # 运行所有测试
npm run test:watch    # 监视模式
npm run test:coverage # 生成覆盖率报告
```

### 运行前端测试
```bash
cd frontend
npm test              # 运行所有测试
npm run test:ui       # 使用UI界面
npm run test:coverage # 生成覆盖率报告
```

### 运行集成测试
```bash
# 从项目根目录
cd tests/integration
npm test
```

### 运行安全测试
```bash
# 从项目根目录
cd tests/security
npm test
```

## 安全注意事项

### 已实施的安全措施

1. **文件上传安全**
   - ✅ MIME类型验证
   - ✅ 文件大小限制 (10MB)
   - ✅ 文件名清理（防止路径遍历）
   - ✅ Magic number内容验证
   - ✅ 文件扩展名白名单

2. **API安全**
   - ✅ 请求速率限制（防止DoS攻击）
   - ✅ 请求体大小限制
   - ✅ 可选API密钥验证（通过环境变量启用）
   - ✅ CORS配置（限制允许的源）

3. **输入验证**
   - ✅ 所有API端点输入验证
   - ✅ 字符串长度限制
   - ✅ 数据类型验证
   - ✅ XSS防护（HTML标签清理）

4. **SQL注入防护**
   - ✅ 所有数据库查询使用参数化查询
   - ✅ 输入验证防止恶意SQL注入

5. **错误处理**
   - ✅ 统一错误响应格式
   - ✅ 生产环境不泄露敏感信息
   - ✅ 错误日志记录

### 部署安全建议

1. **生产环境配置**
   - 设置 `NODE_ENV=production`
   - 配置强密码的 `API_KEY`
   - 限制 `ALLOWED_ORIGINS` 为实际域名
   - 使用HTTPS
   - 配置反向代理（如Nginx）

2. **数据库安全**
   - 定期备份数据库
   - 限制数据库文件访问权限
   - 考虑使用更安全的数据库（如PostgreSQL）用于生产环境

3. **文件上传**
   - 定期清理 `uploads` 目录
   - 考虑使用云存储服务（如AWS S3）
   - 实施文件扫描（病毒扫描）

4. **监控和日志**
   - 实施应用监控（如PM2）
   - 配置日志轮转
   - 监控异常请求模式

## 开发注意事项

1. **数据库位置**: SQLite 数据库文件路径通过 `DB_PATH` 环境变量配置（默认：项目根目录 `type_editor.db`）
2. **文件上传**: 上传的文件存储在 `/uploads` 目录
3. **前端代理**: 前端通过Vite代理调用后端API
4. **Tailwind CSS**: 使用 v4 版本，通过 @tailwindcss/vite 插件集成
5. **BlockNote**: 使用最新版本 (@blocknote/react ^0.41.1)
6. **环境变量**: 使用 `.env` 文件配置，不要提交到版本控制

## 下一步工作
1. **紧急**: 调试并修复前端页面空白问题
2. 完善 UI 组件和样式
3. 集成拖拽排序功能
4. 实现公式和图片节点渲染
5. 考虑是否继续 Rust 后端或长期使用 Express

## 项目状态
🟢 **MVP 已完成** - 核心功能可用：文档管理、节点创建、BlockNote 富文本编辑、自动保存

🛡️ **安全加固已完成** - 所有关键安全问题已修复，包括文件上传安全、CORS配置、输入验证、SQL注入防护等

✅ **测试覆盖** - 已添加单元测试、集成测试和安全测试

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
