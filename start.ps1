# Type Editor - 一键启动脚本 (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Type Editor - 一键启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "[✓] Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host ""
Write-Host "[1/3] 检查并安装依赖..." -ForegroundColor Yellow

# 安装后端依赖
Write-Host "[后端] 检查依赖中..." -ForegroundColor Yellow
Set-Location backend-express
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 后端依赖安装失败" -ForegroundColor Red
    Set-Location ..
    Read-Host "按 Enter 退出"
    exit 1
}
Set-Location ..

# 安装前端依赖
Write-Host "[前端] 检查依赖中..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 前端依赖安装失败" -ForegroundColor Red
    Set-Location ..
    Read-Host "按 Enter 退出"
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "[2/3] 启动后端服务器..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend-express'; node server.js" -WindowStyle Normal

# 等待后端启动
Start-Sleep -Seconds 2

Write-Host "[3/3] 启动前端开发服务器..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "后端: http://localhost:3001" -ForegroundColor Cyan
Write-Host "前端: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示: 关闭 PowerShell 窗口即可停止对应的服务器" -ForegroundColor Yellow
Write-Host ""
Read-Host "按 Enter 退出"

