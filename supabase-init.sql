-- Supabase 数据库初始化 SQL
-- 复制此代码到 Supabase SQL Editor 中执行

-- 创建用户表
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

-- 创建练习任务表
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

-- 创建学生练习记录表
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

-- 创建打卡统计表
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

-- 创建默认教师用户（密码：123456）
INSERT INTO users (username, password, role, real_name, email)
VALUES ('teacher1', '$2a$10$rOzJqQjQjQjQjQjQjQjQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'teacher', '教师一号', 'teacher@example.com')
ON CONFLICT (username) DO NOTHING;

-- 创建默认学生用户（密码：123456）
INSERT INTO users (username, password, role, real_name, email, student_id, class_name)
VALUES ('student1', '$2a$10$rOzJqQjQjQjQjQjQjQQuOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'student', '学生一号', 'student@example.com', 'STU001', '一班')
ON CONFLICT (username) DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_exercises_teacher_id ON exercises(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_student_id ON exercise_records(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_exercise_id ON exercise_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_attendance_stats_student_id ON attendance_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_stats_date ON attendance_stats(date);

-- 显示初始化完成信息
SELECT '数据库表和默认用户创建完成！' as message;