// Supabase 数据库适配层
const { Pool } = require('pg');

// Supabase 数据库配置
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Supabase 需要 SSL 连接
  }
});

// 初始化数据库表
async function initDatabase() {
  try {
    console.log('正在连接 Supabase 数据库...');
    
    // 测试数据库连接
    await pool.query('SELECT NOW()');
    console.log('Supabase 数据库连接成功');

    // 用户表
    await pool.query(`
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
      )
    `);

    // 练习任务表
    await pool.query(`
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
      )
    `);

    // 学生练习记录表
    await pool.query(`
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
      )
    `);

    // 打卡统计表
    await pool.query(`
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
      )
    `);

    console.log('Supabase 数据库表初始化完成');
    
    // 创建默认用户
    await createDefaultUsers();
    
  } catch (error) {
    console.error('Supabase 数据库初始化失败:', error);
    throw error;
  }
}

// 创建默认用户
async function createDefaultUsers() {
  try {
    const bcrypt = require('bcryptjs');
    
    // 检查是否已存在默认用户
    const existingTeacher = await pool.query('SELECT id FROM users WHERE username = $1', ['teacher1']);
    const existingStudent = await pool.query('SELECT id FROM users WHERE username = $1', ['student1']);
    
    // 创建默认教师用户
    if (existingTeacher.rows.length === 0) {
      const teacherPassword = await bcrypt.hash('123456', 10);
      await pool.query(`
        INSERT INTO users (username, password, role, real_name, email)
        VALUES ($1, $2, $3, $4, $5)
      `, ['teacher1', teacherPassword, 'teacher', '教师一号', 'teacher@example.com']);
      console.log('✅ 默认教师用户已创建: teacher1 / 123456');
    }
    
    // 创建默认学生用户
    if (existingStudent.rows.length === 0) {
      const studentPassword = await bcrypt.hash('123456', 10);
      await pool.query(`
        INSERT INTO users (username, password, role, real_name, email, student_id, class_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['student1', studentPassword, 'student', '学生一号', 'student@example.com', 'STU001', '一班']);
      console.log('✅ 默认学生用户已创建: student1 / 123456');
    }
  } catch (error) {
    console.error('创建默认用户失败:', error);
  }
}

// 数据库操作函数
const dbOperations = {
  // 用户操作
  async createUser(userData) {
    const { username, password, email, role, real_name, student_id, class_name } = userData;
    const result = await pool.query(`
      INSERT INTO users (username, password, email, role, real_name, student_id, class_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [username, password, email, role, real_name, student_id, class_name]);
    return result.rows[0];
  },

  async getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },

  async getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async updateUser(userId, userData) {
    const { username, password, email, role, real_name, student_id, class_name } = userData;
    
    // 检查用户名是否已被其他用户使用
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
    if (existingUser.rows.length > 0) {
      throw new Error('用户名已存在');
    }
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      params.push(username);
    }
    if (password !== undefined) {
      updates.push(`password = $${paramIndex++}`);
      params.push(password);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (real_name !== undefined) {
      updates.push(`real_name = $${paramIndex++}`);
      params.push(real_name);
    }
    if (student_id !== undefined) {
      updates.push(`student_id = $${paramIndex++}`);
      params.push(student_id);
    }
    if (class_name !== undefined) {
      updates.push(`class_name = $${paramIndex++}`);
      params.push(class_name);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);
    
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    const result = await pool.query(sql, params);
    return { changes: result.rowCount };
  },

  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 删除相关的练习记录
      await client.query('DELETE FROM exercise_records WHERE student_id = $1', [userId]);
      
      // 删除相关的打卡统计
      await client.query('DELETE FROM attendance_stats WHERE student_id = $1', [userId]);
      
      // 删除用户创建的练习任务
      await client.query('DELETE FROM exercises WHERE teacher_id = $1', [userId]);
      
      // 删除用户
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      return { changes: result.rowCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getAllUsers() {
    const result = await pool.query(`
      SELECT u.*, 
             COALESCE(COUNT(er.id), 0) as exercise_count,
             MAX(er.submit_time) as last_exercise_time
      FROM users u
      LEFT JOIN exercise_records er ON u.id = er.student_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  },

  async updateUserLogin(userId) {
    const result = await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
    return { changes: result.rowCount };
  },

  async getStudentsByTeacher(teacherId) {
    const result = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', ['student']);
    return result.rows;
  },

  // 练习操作
  async createExercise(exerciseData) {
    const { teacher_id, title, content, difficulty_level, start_time, end_time } = exerciseData;
    const result = await pool.query(`
      INSERT INTO exercises (teacher_id, title, content, difficulty_level, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [teacher_id, title, content, difficulty_level, start_time, end_time]);
    return result.rows[0];
  },

  async getExercisesByTeacher(teacherId) {
    const result = await pool.query('SELECT * FROM exercises WHERE teacher_id = $1 ORDER BY created_at DESC', [teacherId]);
    return result.rows;
  },

  async getAvailableExercises(studentId) {
    const result = await pool.query(`
      SELECT e.*, 
             CASE 
                 WHEN er.id IS NOT NULL THEN 'submitted'
                 WHEN CURRENT_TIMESTAMP < e.start_time THEN 'pending'
                 WHEN CURRENT_TIMESTAMP > e.end_time THEN 'expired'
                 ELSE 'available'
             END as status
      FROM exercises e
      LEFT JOIN exercise_records er ON e.id = er.exercise_id AND er.student_id = $1
      WHERE (e.start_time IS NULL OR CURRENT_TIMESTAMP >= e.start_time)
        AND (e.end_time IS NULL OR CURRENT_TIMESTAMP <= e.end_time)
        AND e.is_active = true
      ORDER BY e.created_at DESC
    `, [studentId]);
    return result.rows;
  },

  async getPendingSubmissions() {
    const result = await pool.query(`
      SELECT er.*, u.username, u.real_name, e.title as exercise_title
      FROM exercise_records er
      JOIN users u ON er.student_id = u.id
      JOIN exercises e ON er.exercise_id = e.id
      WHERE er.status = 'submitted'
      ORDER BY er.submit_time DESC
    `);
    return result.rows;
  },

  async reviewSubmission(submissionId, reviewData) {
    const { reviewer_id, status, teacher_feedback, feedback_type } = reviewData;
    const result = await pool.query(`
      UPDATE exercise_records 
      SET status = $1, reviewer_id = $2, teacher_feedback = $3, feedback_type = $4, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [status, reviewer_id, teacher_feedback, feedback_type, submissionId]);
    return { changes: result.rowCount };
  },

  async getStudentFeedback(studentId) {
    const result = await pool.query(`
      SELECT er.*, e.title as exercise_title, u.real_name as teacher_name
      FROM exercise_records er
      JOIN exercises e ON er.exercise_id = e.id
      LEFT JOIN users u ON er.reviewer_id = u.id
      WHERE er.student_id = $1 AND er.status = 'approved'
      ORDER BY er.reviewed_at DESC
    `, [studentId]);
    return result.rows;
  },

  async updateExercise(exerciseId, updateData) {
    const { title, content, difficulty_level, start_time, end_time, is_active } = updateData;
    const result = await pool.query(`
      UPDATE exercises 
      SET title = $1, content = $2, difficulty_level = $3, start_time = $4, end_time = $5, is_active = COALESCE($6, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [title, content, difficulty_level, start_time, end_time, is_active, exerciseId]);
    return { changes: result.rowCount };
  },

  async deleteExercise(exerciseId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 删除相关的练习记录
      await client.query('DELETE FROM exercise_records WHERE exercise_id = $1', [exerciseId]);
      
      // 删除练习任务
      const result = await client.query('DELETE FROM exercises WHERE id = $1', [exerciseId]);
      
      await client.query('COMMIT');
      return { changes: result.rowCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getExerciseById(exerciseId) {
    const result = await pool.query(`
      SELECT e.*, u.username as teacher_name, u.real_name as teacher_real_name
      FROM exercises e
      JOIN users u ON e.teacher_id = u.id
      WHERE e.id = $1
    `, [exerciseId]);
    return result.rows[0];
  },

  async getSubmissionsByTask(exerciseId) {
    const result = await pool.query(`
      SELECT er.*, u.username, u.real_name, u.class_name
      FROM exercise_records er
      JOIN users u ON er.student_id = u.id
      WHERE er.exercise_id = $1
      ORDER BY er.submit_time DESC
    `, [exerciseId]);
    return result.rows;
  },

  async getActiveExercises() {
    const result = await pool.query(`
      SELECT e.*, u.real_name as teacher_name 
      FROM exercises e 
      JOIN users u ON e.teacher_id = u.id 
      WHERE e.is_active = true AND (e.start_time IS NULL OR e.start_time <= CURRENT_TIMESTAMP) 
      AND (e.end_time IS NULL OR e.end_time >= CURRENT_TIMESTAMP)
      ORDER BY e.created_at DESC
    `);
    return result.rows;
  },

  // 练习记录操作
  async createExerciseRecord(recordData) {
    const { student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count } = recordData;
    const result = await pool.query(`
      INSERT INTO exercise_records 
      (student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count]);
    return result.rows[0];
  },

  async updateTeacherFeedback(recordId, feedback, feedbackType) {
    const result = await pool.query(`
      UPDATE exercise_records 
      SET teacher_feedback = $1, feedback_type = $2, reviewed_at = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [feedback, feedbackType, recordId]);
    return { changes: result.rowCount };
  },

  async getStudentRecords(studentId, limit = 10) {
    const result = await pool.query(`
      SELECT er.*, e.title, e.content as exercise_content 
      FROM exercise_records er 
      JOIN exercises e ON er.exercise_id = e.id 
      WHERE er.student_id = $1 
      ORDER BY er.submit_time DESC 
      LIMIT $2
    `, [studentId, limit]);
    return result.rows;
  },

  async getRecordsByExercise(exerciseId) {
    const result = await pool.query(`
      SELECT er.*, u.username, u.real_name 
      FROM exercise_records er 
      JOIN users u ON er.student_id = u.id 
      WHERE er.exercise_id = $1 
      ORDER BY er.submit_time DESC
    `, [exerciseId]);
    return result.rows;
  },

  // 统计操作
  async getStudentStats(studentId, startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_exercises,
        COALESCE(AVG(score), 0) as avg_score,
        COALESCE(MAX(score), 0) as max_score,
        COUNT(DISTINCT DATE(submit_time)) as active_days
      FROM exercise_records 
      WHERE student_id = $1 AND submit_time BETWEEN $2 AND $3
    `, [studentId, startDate, endDate]);
    return result.rows[0];
  },

  async getClassStats(teacherId, startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        u.username, u.real_name,
        COALESCE(COUNT(er.id), 0) as total_exercises,
        COALESCE(AVG(er.score), 0) as avg_score,
        COALESCE(MAX(er.score), 0) as max_score,
        COALESCE(COUNT(DISTINCT DATE(er.submit_time)), 0) as active_days
      FROM users u
      LEFT JOIN exercise_records er ON u.id = er.student_id 
      LEFT JOIN exercises e ON er.exercise_id = e.id
      WHERE u.role = 'student' AND (e.teacher_id = $1 OR er.student_id IS NULL)
      GROUP BY u.id, u.username, u.real_name
      ORDER BY avg_score DESC
    `, [teacherId, startDate, endDate]);
    return result.rows;
  },

  async updateDailyStats(studentId, date, stats) {
    const { exercises_completed, total_score, best_score } = stats;
    const result = await pool.query(`
      INSERT INTO attendance_stats 
      (student_id, date, exercises_completed, total_score, best_score, updated_at) 
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, date) 
      DO UPDATE SET 
        exercises_completed = $3,
        total_score = $4,
        best_score = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [studentId, date, exercises_completed, total_score, best_score]);
    return { changes: result.rowCount };
  },

  // 批量导入学生
  async batchImportStudents(students) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        try {
          const hashedPassword = await bcrypt.hash(student.password || '123456', 10);
          await client.query(`
            INSERT INTO users (username, password, email, role, real_name, student_id, class_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            student.username,
            hashedPassword,
            student.email,
            'student',
            student.real_name,
            student.student_id,
            student.class_name
          ]);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            username: student.username,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return results;
  }
};

module.exports = { pool, dbOperations, initDatabase };