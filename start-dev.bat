@echo off
chcp 65001 >nul
echo ========================================
echo   AnythingLLM 开发环境启动脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js v18+
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js 已安装：
node --version
echo.

:: 检查 Yarn 是否安装
where yarn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Yarn，请先安装 Yarn
    echo 运行：npm install -g yarn
    pause
    exit /b 1
)

echo [✓] Yarn 已安装：
yarn --version
echo.

:: 启动后端服务
echo [1/3] 启动后端服务 (Server)...
start "AnythingLLM - Server" cmd /k "cd server && echo 正在启动后端服务... && yarn dev"
timeout /t 3 /nobreak >nul

:: 启动前端服务
echo [2/3] 启动前端服务 (Frontend)...
start "AnythingLLM - Frontend" cmd /k "cd frontend && echo 正在启动前端服务... && yarn dev"
timeout /t 3 /nobreak >nul

:: 启动收集器服务
echo [3/3] 启动收集器服务 (Collector)...
start "AnythingLLM - Collector" cmd /k "cd collector && echo 正在启动收集器服务... && yarn dev"

echo.
echo ========================================
echo   所有服务已启动!
echo ========================================
echo.
echo 访问地址:
echo   - 前端界面：http://localhost:3000
echo   - 后端 API: http://localhost:3001
echo   - 文献管理：http://localhost:3000/chemical/literature
echo.
echo 按任意键关闭此窗口 (不会影响已启动的服务)
pause >nul
