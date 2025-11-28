const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const { config } = require('./config');
const DB_PATH = path.join(__dirname, config.database.filename);

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('连接数据库失败:', err.message);
    } else {
        console.log('已连接到SQLite数据库');
        initDatabase();
    }
});

// 初始化数据库表
function initDatabase() {
    // 用户表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
            real_name TEXT,
            student_id TEXT,
            class_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // 练习任务表
    db.run(`
        CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            difficulty_level INTEGER DEFAULT 1,
            start_time DATETIME,
            end_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (teacher_id) REFERENCES users (id)
        )
    `);

    // 学生练习记录表
    db.run(`
        CREATE TABLE IF NOT EXISTS exercise_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            exercise_id INTEGER NOT NULL,
            audio_path TEXT,
            session_id TEXT,
            score INTEGER DEFAULT 0,
            accuracy REAL DEFAULT 0,
            fluency REAL DEFAULT 0,
            integrity REAL DEFAULT 0,
            ai_feedback TEXT,
            teacher_feedback TEXT,
            feedback_type TEXT DEFAULT 'ai' CHECK (feedback_type IN ('ai', 'teacher', 'both')),
            attempt_count INTEGER DEFAULT 1,
            submit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users (id),
            FOREIGN KEY (exercise_id) REFERENCES exercises (id)
        )
    `);

    // 打卡统计表
    db.run(`
        CREATE TABLE IF NOT EXISTS attendance_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date DATE NOT NULL,
            exercises_completed INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,
            best_score INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users (id),
            UNIQUE(student_id, date)
        )
    `);

    console.log('数据库表初始化完成');
}

// 数据库操作函数
const dbOperations = {
    // 用户操作
    createUser: (userData) => {
        return new Promise((resolve, reject) => {
            const { username, password, email, role, real_name, student_id, class_name } = userData;
            const sql = `INSERT INTO users (username, password, email, role, real_name, student_id, class_name) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [username, password, email, role, real_name, student_id, class_name], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...userData });
            });
        });
    },

    getUserByUsername: (username) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    getUserById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateUser: (userId, userData) => {
        return new Promise((resolve, reject) => {
            const { username, password, email, role, real_name, student_id, class_name } = userData;
            
            // 检查用户名是否已被其他用户使用
            const checkSql = 'SELECT id FROM users WHERE username = ? AND id != ?';
            db.get(checkSql, [username, userId], (err, existingUser) => {
                if (err) return reject(err);
                if (existingUser) return reject(new Error('用户名已存在'));
                
                // 构建更新SQL
                let sql = 'UPDATE users SET username = ?, email = ?, role = ?, real_name = ?, student_id = ?, class_name = ?';
                let params = [username, email, role, real_name, student_id, class_name];
                
                if (password) {
                    sql += ', password = ?';
                    params.push(password);
                }
                
                sql += ' WHERE id = ?';
                params.push(userId);
                
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                });
            });
        });
    },

    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            // 首先删除相关的练习记录
            const deleteRecordsSql = 'DELETE FROM exercise_records WHERE student_id = ?';
            db.run(deleteRecordsSql, [userId], (err) => {
                if (err) return reject(err);
                
                // 删除用户
                const deleteUserSql = 'DELETE FROM users WHERE id = ?';
                db.run(deleteUserSql, [userId], function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                });
            });
        });
    },

    getAllUsers: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.*, 
                       COUNT(er.id) as exercise_count,
                       MAX(er.submit_time) as last_exercise_time
                FROM users u
                LEFT JOIN exercise_records er ON u.id = er.student_id
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `;
            db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    updateUserLogin: (userId) => {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
            db.run(sql, [userId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    getStudentsByTeacher: (teacherId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM users WHERE role = "student"', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 练习操作
    createExercise: (exerciseData) => {
        return new Promise((resolve, reject) => {
            const { teacher_id, title, content, difficulty_level, start_time, end_time } = exerciseData;
            const sql = `INSERT INTO exercises (teacher_id, title, content, difficulty_level, start_time, end_time) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(sql, [teacher_id, title, content, difficulty_level, start_time, end_time], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...exerciseData });
            });
        });
    },

    getExercisesByTeacher: (teacherId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM exercises WHERE teacher_id = ? ORDER BY created_at DESC', [teacherId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 获取学生可用的练习任务
    getAvailableExercises: (studentId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT e.*, 
                       CASE 
                           WHEN er.id IS NOT NULL THEN 'submitted'
                           WHEN CURRENT_TIMESTAMP < e.start_time THEN 'pending'
                           WHEN CURRENT_TIMESTAMP > e.end_time THEN 'expired'
                           ELSE 'available'
                       END as status
                FROM exercises e
                LEFT JOIN exercise_records er ON e.id = er.exercise_id AND er.student_id = ?
                WHERE (e.start_time IS NULL OR CURRENT_TIMESTAMP >= e.start_time)
                  AND (e.end_time IS NULL OR CURRENT_TIMESTAMP <= e.end_time)
                ORDER BY e.created_at DESC
            `;
            db.all(sql, [studentId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 获取待审批的提交
    getPendingSubmissions: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT er.*, u.username, u.real_name, e.title as exercise_title
                FROM exercise_records er
                JOIN users u ON er.student_id = u.id
                JOIN exercises e ON er.exercise_id = e.id
                WHERE er.status = 'submitted'
                ORDER BY er.submitted_at DESC
            `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 审批提交
    reviewSubmission: (submissionId, reviewData) => {
        return new Promise((resolve, reject) => {
            const { reviewer_id, status, teacher_feedback, feedback_type } = reviewData;
            const sql = `
                UPDATE exercise_records 
                SET status = ?, reviewer_id = ?, teacher_feedback = ?, feedback_type = ?, reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            db.run(sql, [status, reviewer_id, teacher_feedback, feedback_type, submissionId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    // 获取学生的反馈记录
    getStudentFeedback: (studentId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT er.*, e.title as exercise_title, u.real_name as teacher_name
                FROM exercise_records er
                JOIN exercises e ON er.exercise_id = e.id
                LEFT JOIN users u ON er.reviewer_id = u.id
                WHERE er.student_id = ? AND er.status = 'approved'
                ORDER BY er.reviewed_at DESC
            `;
            db.all(sql, [studentId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 更新练习任务
    updateExercise: (exerciseId, updateData) => {
        return new Promise((resolve, reject) => {
            const { title, content, difficulty_level, start_time, end_time } = updateData;
            const sql = `
                UPDATE exercises 
                SET title = ?, content = ?, difficulty_level = ?, start_time = ?, end_time = ?
                WHERE id = ?
            `;
            db.run(sql, [title, content, difficulty_level, start_time, end_time, exerciseId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    // 删除练习任务
    deleteExercise: (exerciseId) => {
        return new Promise((resolve, reject) => {
            // 先删除相关的练习记录
            db.run('DELETE FROM exercise_records WHERE exercise_id = ?', [exerciseId], (err) => {
                if (err) return reject(err);
                
                // 删除练习任务
                db.run('DELETE FROM exercises WHERE id = ?', [exerciseId], function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                });
            });
        });
    },

    // 获取练习任务详情
    getExerciseById: (exerciseId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT e.*, u.username as teacher_name, u.real_name as teacher_real_name
                FROM exercises e
                JOIN users u ON e.teacher_id = u.id
                WHERE e.id = ?
            `;
            db.get(sql, [exerciseId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // 获取任务的提交情况
    getSubmissionsByTask: (exerciseId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT er.*, u.username, u.real_name, u.class_name
                FROM exercise_records er
                JOIN users u ON er.student_id = u.id
                WHERE er.exercise_id = ?
                ORDER BY er.submitted_at DESC
            `;
            db.all(sql, [exerciseId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getActiveExercises: () => {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const sql = `SELECT e.*, u.real_name as teacher_name 
                        FROM exercises e 
                        JOIN users u ON e.teacher_id = u.id 
                        WHERE e.is_active = 1 AND (e.start_time IS NULL OR e.start_time <= ?) 
                        AND (e.end_time IS NULL OR e.end_time >= ?)
                        ORDER BY e.created_at DESC`;
            db.all(sql, [now, now], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 练习记录操作
    createExerciseRecord: (recordData) => {
        return new Promise((resolve, reject) => {
            const { student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count } = recordData;
            const sql = `INSERT INTO exercise_records 
                        (student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [student_id, exercise_id, audio_path, session_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type, attempt_count], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...recordData });
            });
        });
    },

    updateTeacherFeedback: (recordId, feedback, feedbackType) => {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE exercise_records SET teacher_feedback = ?, feedback_type = ? WHERE id = ?';
            db.run(sql, [feedback, feedbackType, recordId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    getStudentRecords: (studentId, limit = 10) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT er.*, e.title, e.content as exercise_content 
                        FROM exercise_records er 
                        JOIN exercises e ON er.exercise_id = e.id 
                        WHERE er.student_id = ? 
                        ORDER BY er.submit_time DESC 
                        LIMIT ?`;
            db.all(sql, [studentId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getRecordsByExercise: (exerciseId) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT er.*, u.username, u.real_name 
                        FROM exercise_records er 
                        JOIN users u ON er.student_id = u.id 
                        WHERE er.exercise_id = ? 
                        ORDER BY er.submit_time DESC`;
            db.all(sql, [exerciseId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 统计操作
    getStudentStats: (studentId, startDate, endDate) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT 
                        COUNT(*) as total_exercises,
                        AVG(score) as avg_score,
                        MAX(score) as max_score,
                        COUNT(DISTINCT DATE(submit_time)) as active_days
                        FROM exercise_records 
                        WHERE student_id = ? AND submit_time BETWEEN ? AND ?`;
            db.get(sql, [studentId, startDate, endDate], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    getClassStats: (teacherId, startDate, endDate) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT 
                        u.username, u.real_name,
                        COUNT(er.id) as total_exercises,
                        AVG(er.score) as avg_score,
                        MAX(er.score) as max_score,
                        COUNT(DISTINCT DATE(er.submit_time)) as active_days
                        FROM users u
                        LEFT JOIN exercise_records er ON u.id = er.student_id 
                        LEFT JOIN exercises e ON er.exercise_id = e.id
                        WHERE u.role = 'student' AND e.teacher_id = ?
                        AND er.submit_time BETWEEN ? AND ?
                        GROUP BY u.id, u.username, u.real_name
                        ORDER BY avg_score DESC`;
            db.all(sql, [teacherId, startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    updateDailyStats: (studentId, date, stats) => {
        return new Promise((resolve, reject) => {
            const { exercises_completed, total_score, best_score } = stats;
            const sql = `INSERT OR REPLACE INTO attendance_stats 
                        (student_id, date, exercises_completed, total_score, best_score, updated_at) 
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
            db.run(sql, [studentId, date, exercises_completed, total_score, best_score], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
};

module.exports = { db, dbOperations };