#!/bin/bash

# ========================================
#   AnythingLLM 一键启动脚本
# ========================================

echo "========================================"
echo "  AnythingLLM 启动脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js v18+${NC}"
    echo "下载地址：https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Node.js 已安装：$(node --version)"

# 检查 Yarn
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Yarn，请先安装 Yarn${NC}"
    echo "运行：npm install -g yarn"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Yarn 已安装：$(yarn --version)"
echo ""

# 检查依赖是否已安装
check_dependencies() {
    local missing=false
    
    if [ ! -d "server/node_modules" ]; then
        echo -e "${YELLOW}[!] server 依赖未安装${NC}"
        missing=true
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${YELLOW}[!] frontend 依赖未安装${NC}"
        missing=true
    fi
    
    if [ ! -d "collector/node_modules" ]; then
        echo -e "${YELLOW}[!] collector 依赖未安装${NC}"
        missing=true
    fi
    
    if [ "$missing" = true ]; then
        echo ""
        echo -e "${YELLOW}是否需要安装依赖？(y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "安装依赖..."
            yarn setup
        else
            echo -e "${RED}缺少依赖可能导致启动失败${NC}"
        fi
    fi
}

check_dependencies
echo ""

# 启动模式选择
echo "请选择启动模式:"
echo "  1) 开发模式 (同时启动所有服务)"
echo "  2) 生产模式"
echo "  3) 仅服务器"
echo "  4) 仅前端"
echo "  5) 仅收集器"
echo "  q) 退出"
echo ""
read -p "请输入选项 [1-5/q]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  启动开发模式${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        yarn dev:all
        ;;
    2)
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  启动生产模式${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        
        # 检查 PM2
        if ! command -v pm2 &> /dev/null; then
            echo -e "${YELLOW}[!] PM2 未安装，正在安装...${NC}"
            npm install -g pm2
        fi
        
        # 构建前端
        echo -e "${YELLOW}[1/4] 构建前端...${NC}"
        cd frontend && yarn build && cd ..
        
        # 复制前端构建文件
        echo -e "${YELLOW}[2/4] 复制前端构建文件到 server...${NC}"
        rm -rf server/public
        cp -r frontend/dist server/public
        
        # 生成 Prisma
        echo -e "${YELLOW}[3/4] 生成 Prisma 客户端...${NC}"
        cd server && npx prisma generate && cd ..
        
        # 使用 PM2 启动
        echo -e "${YELLOW}[4/4] 使用 PM2 启动服务...${NC}"
        pm2 start ecosystem.config.js
        
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  生产环境启动完成!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo "访问地址：http://localhost:3001"
        echo ""
        echo "管理命令:"
        echo "  pm2 status     - 查看服务状态"
        echo "  pm2 logs       - 查看日志"
        echo "  pm2 stop all   - 停止服务"
        echo "  pm2 restart all- 重启服务"
        ;;
    3)
        echo ""
        echo -e "${GREEN}启动后端服务...${NC}"
        yarn dev:server
        ;;
    4)
        echo ""
        echo -e "${GREEN}启动前端服务...${NC}"
        yarn dev:frontend
        ;;
    5)
        echo ""
        echo -e "${GREEN}启动收集器服务...${NC}"
        yarn dev:collector
        ;;
    q|Q)
        echo "退出"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac
