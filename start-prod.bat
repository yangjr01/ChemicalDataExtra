@echo off
chcp 65001 >nul
echo ========================================
echo   AnythingLLM 生产环境部署脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js v18+
    pause
    exit /b 1
)

echo [1/7] 检查依赖...
cd server
if not exist node_modules (
    echo 安装 server 依赖...
    call yarn install
)
cd ..\frontend
if not exist node_modules (
    echo 安装 frontend 依赖...
    call yarn install
)
cd ..\collector
if not exist node_modules (
    echo 安装 collector 依赖...
    call yarn install
)
cd ..

echo.
echo [2/7] 构建前端...
cd frontend
call yarn build
cd ..

echo.
echo [3/7] 复制前端构建文件到 server...
if exist server\public (
    rmdir /s /q server\public
)
xcopy /E /I /Y frontend\dist server\public

echo.
echo [4/7] 生成 Prisma 客户端...
cd server
call npx prisma generate --schema=./prisma/schema.prisma

echo.
echo [5/7] 运行数据库迁移...
call npx prisma migrate deploy --schema=./prisma/schema.prisma
cd ..

echo.
echo [6/7] 启动后端服务 (生产模式)...
start "AnythingLLM Server (Production)" cmd /k "cd server && set NODE_ENV=production && node index.js"
timeout /t 3 /nobreak >nul

echo.
echo [7/7] 启动收集器服务 (生产模式)...
start "AnythingLLM Collector (Production)" cmd /k "cd collector && set NODE_ENV=production && node index.js"

echo.
echo ========================================
echo   生产环境部署完成!
echo ========================================
echo.
echo 访问地址：http://localhost:3001
echo.
echo 按任意键关闭此窗口
pause >nul
