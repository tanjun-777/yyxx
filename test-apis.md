# API 测试指南

## 测试登录接口

### 教师登录测试
```bash
curl -X POST https://your-project-name.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher1",
    "password": "123456"
  }'
```

### 学生登录测试
```bash
curl -X POST https://your-project-name.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "password": "123456"
  }'
```

## 测试用户列表（需要先登录获取 token）

```bash
# 替换 YOUR_JWT_TOKEN 为登录后获取的 token
curl -X GET https://your-project-name.vercel.app/api/users/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 测试任务列表

```bash
curl -X GET https://your-project-name.vercel.app/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 浏览器测试

### 1. 访问登录页面
```
https://your-project-name.vercel.app
```

### 2. 使用默认账号登录
- 教师账号：`teacher1` / `123456`
- 学生账号：`student1` / `123456`

### 3. 测试功能
- 教师登录后查看用户管理、任务管理
- 学生登录后查看练习任务