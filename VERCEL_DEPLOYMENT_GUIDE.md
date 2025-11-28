# Vercel部署指南

## 🚨 问题说明

Vercel默认是为静态网站和无服务器函数设计的，而原始项目是传统的Node.js Express服务器，需要改造才能部署。

## 🔧 已完成的改造

### 1. 创建了Vercel适配文件
- `api/index.js` - Vercel入口文件
- `api/routes.js` - API路由处理
- `api/auth.js` - 认证中间件
- `vercel.json` - Vercel配置文件

### 2. 修改了项目结构
- 将API路由移至 `api/` 目录
- 创建简化的数据模型（用于演示）
- 移除依赖本地文件系统的组件

## 📋 部署步骤

### 方法一：使用当前代码结构
1. **确保所有新文件都在GitHub仓库中**
2. **在Vercel中导入项目**
3. **设置环境变量**：
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secret-key-here`

### 方法二：完整修复（推荐）
1. **将 `vercel-package.json` 复制为 `package.json`**
2. **删除原始的 `package.json`**
3. **提交更改到GitHub**
4. **在Vercel中重新部署**

## 🔑 重要环境变量

在Vercel项目设置中添加以下环境变量：

```
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-here
TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key
APPID=your-tencent-app-id
```

## 🐛 常见问题解决

### 1. FUNCTION_INVOCATION_FAILED
**原因**：Node.js模块导入错误或运行时错误
**解决**：检查 `api/` 目录中的所有文件语法

### 2. 500 INTERNAL_SERVER_ERROR  
**原因**：数据库连接失败或配置错误
**解决**：使用模拟数据或云端数据库

### 3. 静态文件404
**原因**：Vercel无法找到静态文件
**解决**：确保 `public/` 目录没有被忽略

## 🎯 快速修复方案

如果遇到部署问题，最简单的解决方案：

### 1. 使用简化版本
```bash
# 备份原始package.json
mv package.json package.json.backup

# 使用Vercel优化版本
cp vercel-package.json package.json
```

### 2. 提交更改
```bash
git add .
git commit -m "适配Vercel部署"
git push origin main
```

### 3. 重新部署
- 在Vercel控制台点击 "Redeploy"
- 或者推送新代码自动触发部署

## 🔄 完整的API端点

部署成功后，以下API端点应该可用：

- `POST /api/login` - 用户登录
- `GET /api/user` - 获取用户信息
- `GET /api/users/all` - 获取用户列表（教师）
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务（教师）
- `GET /api/student/feedback` - 学生反馈
- `GET /api/health` - 健康检查

## 🧪 测试部署

部署完成后，访问以下URL测试：

1. **主页**：`https://your-app.vercel.app/`
2. **登录API**：`https://your-app.vercel.app/api/login`
3. **健康检查**：`https://your-app.vercel.app/api/health`

## 📱 前端配置

确保前端JavaScript中的API基础URL正确：

```javascript
const API_BASE = window.location.origin + '/api';
```

## 💡 生产环境建议

1. **使用云端数据库**（如MongoDB Atlas、Supabase）
2. **启用CDN加速**
3. **添加错误监控**（如Sentry）
4. **配置自定义域名**
5. **启用HTTPS**（Vercel自动提供）

## 🔍 调试技巧

如果仍然遇到问题：

1. **查看Vercel函数日志**
2. **本地测试API**：
   ```bash
   cd api
   node index.js
   ```
3. **使用Vercel CLI本地调试**：
   ```bash
   npm i -g vercel
   vercel dev
   ```

## 📞 技术支持

如果问题持续存在，请提供：
- Vercel函数日志
- 完整的错误信息
- 仓库链接
- 部署分支名称

这样我可以提供更具体的解决方案。