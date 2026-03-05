@echo off
chcp 65001 >nul
echo ========================================
echo   AnythingLLM 环境初始化脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js v18+
    pause
    exit /b 1
)

:: 检查 Yarn 是否安装
where yarn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Yarn
    echo 运行：npm install -g yarn
    pause
    exit /b 1
)

echo [1/6] 安装根目录依赖...
call yarn install

echo.
echo [2/6] 安装 server 依赖...
cd server
call yarn install

echo.
echo [3/6] 安装 frontend 依赖...
cd ..\frontend
call yarn install

echo.
echo [4/6] 安装 collector 依赖...
cd ..\collector
call yarn install
cd ..

echo.
echo [5/6] 复制环境配置文件...
if not exist frontend\.env (
    copy frontend\.env.example frontend\.env
    echo ✓ frontend\.env 已创建
) else (
    echo ✓ frontend\.env 已存在
)

if not exist server\.env.development (
    copy server\.env.example server\.env.development
    echo ✓ server\.env.development 已创建
) else (
    echo ✓ server\.env.development 已存在
)

if not exist collector\.env (
    copy collector\.env.example collector\.env
    echo ✓ collector\.env 已创建
) else (
    echo ✓ collector\.env 已存在
)

echo.
echo [6/6] 初始化数据库...
cd server
call npx prisma generate --schema=./prisma/schema.prisma
call npx prisma migrate dev --name init --schema=./prisma/schema.prisma
cd ..

echo.
echo ========================================
echo   环境初始化完成!
echo ========================================
echo.
echo 下一步:
echo   1. 编辑 server\.env.development 配置 API Key
echo   2. 运行 start-dev.bat 启动开发服务
echo.
pause
