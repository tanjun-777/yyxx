# 完整部署和测试步骤

## 第一阶段：代码部署

### 1. 提交代码
```bash
git add .
git commit -m "适配 Supabase 数据库完成"
git push origin main
```

### 2. 等待 Vercel 自动部署完成
- 访问 Vercel Dashboard
- 等待部署状态变为 "Ready"

## 第二阶段：配置 Supabase

### 3. 获取 Supabase 连接字符串
1. 登录 [supabase.com](https://supabase.com)
2. 选择项目 `yyxxdata`
3. Settings → Database → Connection string
4. 复制 URI（类似：`postgresql://postgres.abc123:password@aws-0-xxx.pooler.supabase.com:5432/postgres`）

### 4. 配置 Vercel 环境变量
在 Vercel 项目设置中添加：
```
SUPABASE_DATABASE_URL = 你的连接字符串
JWT_SECRET = 生成的安全密钥
NODE_ENV = production
```

## 第三阶段：数据库初始化

### 5. 初始化数据库（二选一）

#### 方法 A：API 初始化（推荐）
访问：`https://your-project-name.vercel.app/api/init-db`
- 看到 `{"message":"数据库初始化成功"}` 即可

#### 方法 B：手动 SQL 初始化
1. 在 Supabase 中打开 SQL Editor
2. 复制 `supabase-init.sql` 文件内容
3. 粘贴并执行
4. 看到 `数据库表和默认用户创建完成！` 即可

## 第四阶段：功能测试

### 6. 基础连接测试
访问：`https://your-project-name.vercel.app/api/health`
- 应该返回：`{"status":"ok","timestamp":"..."}`

### 7. 登录测试
打开浏览器访问：`https://your-project-name.vercel.app`

#### 测试教师登录：
- 用户名：`teacher1`
- 密码：`123456`
- 应该跳转到教师仪表板

#### 测试学生登录：
- 用户名：`student1`
- 密码：`123456`
- 应该跳转到学生仪表板

### 8. API 测试（可选）

#### 使用 curl 测试登录：
```bash
# 教师登录
curl -X POST https://your-project-name.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"123456"}'
```

#### 使用返回的 token 测试其他接口：
```bash
# 替换 YOUR_TOKEN 为上面获取的 token
curl -X GET https://your-project-name.vercel.app/api/users/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 常见问题解决

### 问题 1：连接数据库失败
**检查：**
1. 环境变量名称是否正确：`SUPABASE_DATABASE_URL`
2. 连接字符串是否包含 `?pgsslmode=require`
3. Supabase 项目是否处于活跃状态

### 问题 2：登录失败
**检查：**
1. 数据库是否已初始化
2. 默认用户是否已创建
3. 密码哈希是否正确

### 问题 3：页面无法访问
**检查：**
1. Vercel 部署是否成功
2. 静态文件路径是否正确
3. API 路由是否配置正确

## 成功标志

如果以下都正常，说明部署成功：

✅ 健康检查接口返回 OK
✅ 数据库连接正常
✅ 默认用户可以登录
✅ 页面正常显示
✅ API 接口正常响应
✅ 用户管理功能正常
✅ 任务管理功能正常

## 后续维护

1. **定期备份数据库**：Supabase 提供自动备份
2. **监控 API 使用量**：在 Vercel Dashboard 中查看
3. **更新默认密码**：生产环境建议更改默认密码
4. **添加更多用户**：通过用户管理界面或批量导入

---

🎉 **恭喜！您的英语口语练习系统已成功部署到 Vercel 并连接 Supabase 数据库！**