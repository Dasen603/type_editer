@echo off
chcp 65001 >nul
echo ========================================
echo    Type Editor - 一键启动脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo [1/3] 检查并安装依赖...
cd backend-express
echo [后端] 检查依赖中...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)
cd ..

cd frontend
echo [前端] 检查依赖中...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] 启动后端服务器...
start "Type Editor Backend" cmd /k "cd backend-express && node server.js"
timeout /t 2 /nobreak >nul

echo [3/3] 启动前端开发服务器...
start "Type Editor Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo    启动完成！
echo ========================================
echo.
echo 后端: http://localhost:3001
echo 前端: http://localhost:5000
echo.
echo 按任意键关闭此窗口（服务器将继续运行）
pause >nul

