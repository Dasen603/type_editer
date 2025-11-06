#!/bin/bash
# 后端
cd backend-express
(node server.js &)  # 后台运行后端

# 前端
cd ../frontend
npm run dev
