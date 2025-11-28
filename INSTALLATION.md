# 安装和运行指南

## 前置要求

### 1. 安装 Node.js

请访问 [Node.js官网](https://nodejs.org/) 下载并安装Node.js。

**推荐版本：** Node.js 18.x 或更高版本

安装完成后，在命令行中验证安装：

```bash
node --version
npm --version
```

### 2. 环境验证

确保您的系统已安装以下软件：
- Git（用于版本控制，可选）
- 现代浏览器（Chrome、Firefox、Safari、Edge）

## 安装步骤

### 第一步：进入项目目录
```bash
cd english-speaking-practice-system
```

### 第二步：安装项目依赖
```bash
npm install
```

如果安装缓慢，可以使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 第三步：初始化系统
```bash
npm run setup
```

此命令会：
- 创建SQLite数据库
- 创建默认管理员账号
- 创建示例学生账号

### 第四步：启动服务器
```bash
npm start
```

或者使用开发模式（支持热重载）：
```bash
npm run dev
```

### 第五步：访问系统
打开浏览器，访问：
```
http://localhost:3000
```

## 默认账号

系统初始化后会创建以下账号：

### 管理员教师账号
- **用户名：** admin
- **密码：** admin123
- **角色：** 教师/管理员

### 示例学生账号
- **用户名：** student01
- **密码：** student123
- **角色：** 学生
- **姓名：** 张三
- **学号：** 2024001

## 配置说明

### 1. 腾讯云API配置

在使用口语评测功能之前，需要配置腾讯云API密钥：

1. 登录腾讯云控制台
2. 开通"智聆口语评测"服务
3. 在访问管理 > API密钥管理中创建密钥
4. 获取以下信息：
   - Secret ID
   - Secret Key
   - AppId
5. 编辑 `server.js` 文件，修改以下配置：

```javascript
const TENCENT_SECRET_ID = 'your_secret_id';
const TENCENT_SECRET_KEY = 'your_secret_key';
const TENCENT_APP_ID = 'your_app_id';
```

**当前已配置的信息：**
- AppId: 1387667086
- SecretId: AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6
- SecretKey: 已更新到配置文件

**安全提示：**
- 请确保Secret Key的安全性
- 建议使用环境变量存储敏感信息
- 不要将密钥提交到版本控制系统

### 2. 端口配置

默认端口为3000，如果需要修改：
- 编辑 `server.js` 文件
- 修改 `PORT` 变量值
- 或设置环境变量：`PORT=8080 npm start`

## 常见问题

### 1. 安装依赖时出错

**问题：** `npm install` 失败
**解决方案：**
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules文件夹
rm -rf node_modules

# 重新安装
npm install
```

### 2. 端口被占用

**问题：** `Error: listen EADDRINUSE :::3000`
**解决方案：**
```bash
# 方法1：使用其他端口
PORT=3001 npm start

# 方法2：结束占用端口的进程
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### 3. 数据库问题

**问题：** 数据库连接失败
**解决方案：**
```bash
# 重新初始化数据库
rm database.db
npm run setup
```

### 4. 麦克风权限

**问题：** 浏览器无法访问麦克风
**解决方案：**
1. 确保使用HTTPS或localhost访问
2. 在浏览器设置中允许麦克风权限
3. 检查系统麦克风设置

### 5. 评测功能异常

**问题：** 口语评测返回错误
**解决方案：**
1. 检查腾讯云API密钥配置
2. 确认网络连接正常
3. 检查腾讯云账户余额

## 开发指南

### 项目结构说明

```
├── public/              # 前端文件
│   ├── index.html      # 主页面
│   └── app.js         # 前端逻辑
├── database.js         # 数据库操作
├── auth.js            # 认证模块
├── server.js          # 服务器入口
├── install.js         # 系统初始化
└── package.json      # 项目配置
```

### 开发模式启动

```bash
npm run dev
```

开发模式特点：
- 支持代码热重载
- 显示详细日志信息
- 自动重启服务器

### 添加新功能

1. 后端API：在 `server.js` 中添加路由
2. 前端功能：在 `public/app.js` 中添加逻辑
3. 数据库：在 `database.js` 中添加操作函数

## 部署指南

### 生产环境部署

1. **安装PM2进程管理器**
```bash
npm install -g pm2
```

2. **启动应用**
```bash
pm2 start server.js --name "english-speaking-system"
```

3. **查看状态**
```bash
pm2 status
pm2 logs
```

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npm run setup

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行：
```bash
docker build -t english-speaking-system .
docker run -p 3000:3000 english-speaking-system
```

## 技术支持

如果遇到问题：

1. 查看控制台错误信息
2. 检查网络连接
3. 验证配置文件
4. 提交Issue到项目仓库
5. 联系技术支持

---

**注意：** 首次使用前请务必阅读本指南，确保环境配置正确。