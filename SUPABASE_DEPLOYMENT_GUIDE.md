# Supabase 数据库部署指南

## 1. 获取 Supabase 连接信息

### 登录 Supabase
1. 访问 [supabase.com](https://supabase.com)
2. 使用 GitHub 账号登录
3. 创建新项目或选择现有项目 `yyxxdata`

### 获取连接字符串
1. 进入项目仪表板
2. 点击左侧菜单的 **Settings**
3. 选择 **Database**
4. 在 **Connection string** 部分找到 **URI**
5. 复制连接字符串，格式类似：
   ```
   postgresql://postgres.your-password:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

## 2. 配置 Vercel 环境变量

### 在 Vercel 项目中添加环境变量

1. 进入 Vercel 项目设置
2. 点击 **Environment Variables**
3. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SUPABASE_DATABASE_URL` | 你的 Supabase 连接字符串 | 数据库连接 |
| `JWT_SECRET` | 生成的安全密钥 | JWT 认证 |
| `NODE_ENV` | `production` | 环境模式 |
| `TENCENT_APP_ID` | 腾讯云应用ID | 可选 |
| `TENCENT_SECRET_ID` | 腾讯云密钥ID | 可选 |
| `TENCENT_SECRET_KEY` | 腾讯云密钥 | 可选 |

### 生成 JWT 密钥
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 3. 数据库初始化

### 方法一：通过 API 初始化
部署完成后，访问：
```
https://your-vercel-domain.vercel.app/api/init-db
```

### 方法二：手动在 Supabase 中执行 SQL
在 Supabase 的 **SQL Editor** 中执行以下 SQL：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
    real_name VARCHAR(100),
    student_id VARCHAR(50),
    class_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 练习任务表
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (teacher_id) REFERENCES users (id)
);

-- 学生练习记录表
CREATE TABLE IF NOT EXISTS exercise_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    audio_path VARCHAR(500),
    session_id VARCHAR(100),
    score INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0,
    fluency REAL DEFAULT 0,
    integrity REAL DEFAULT 0,
    ai_feedback TEXT,
    teacher_feedback TEXT,
    feedback_type VARCHAR(20) DEFAULT 'ai' CHECK (feedback_type IN ('ai', 'teacher', 'both')),
    attempt_count INTEGER DEFAULT 1,
    submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted',
    reviewer_id INTEGER,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users (id),
    FOREIGN KEY (exercise_id) REFERENCES exercises (id),
    FOREIGN KEY (reviewer_id) REFERENCES users (id)
);

-- 打卡统计表
CREATE TABLE IF NOT EXISTS attendance_stats (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    date DATE NOT NULL,
    exercises_completed INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users (id),
    UNIQUE(student_id, date)
);
```

## 4. 创建默认用户

### 手动创建
在 Supabase SQL Editor 中执行：

```sql
-- 创建默认教师用户
INSERT INTO users (username, password, role, real_name, email)
VALUES ('teacher1', '$2a$10$rOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'teacher', '教师一号', 'teacher@example.com');

-- 创建默认学生用户
INSERT INTO users (username, password, role, real_name, email, student_id, class_name)
VALUES ('student1', '$2a$10$rOzJqQjQjQjQjQjQjQQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'student', '学生一号', 'student@example.com', 'STU001', '一班');
```

### 通过 API 创建
部署后访问初始化接口会自动创建默认用户。

## 5. 验证部署

### 检查数据库连接
访问健康检查接口：
```
https://your-vercel-domain.vercel.app/api/health
```

### 测试登录
使用默认账号登录：
- 教师账号：`teacher1` / `123456`
- 学生账号：`student1` / `123456`

## 6. 常见问题

### 连接错误
- 确保环境变量名称正确：`SUPABASE_DATABASE_URL`
- 检查连接字符串格式和密码
- 确保 Supabase 项目处于活跃状态

### SSL 错误
确保连接字符串包含 `?pgsslmode=require`

### 权限错误
确保 Supabase 用户的权限足够：
```sql
-- 在 Supabase 中赋予必要权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

## 7. 备份策略

Supabase 提供自动备份，但建议：
1. 定期导出重要数据
2. 设置 RPO（恢复点目标）
3. 监控数据库使用情况

## 8. 性能优化

### 连接池
当前配置已使用连接池，无需额外配置。

### 索引建议
```sql
-- 为经常查询的字段添加索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_exercises_teacher_id ON exercises(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_student_id ON exercise_records(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_exercise_id ON exercise_records(exercise_id);
```