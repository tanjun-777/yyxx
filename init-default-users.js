const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.db');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('连接数据库失败:', err.message);
        process.exit(1);
    } else {
        console.log('已连接到SQLite数据库');
        createDefaultUsers();
    }
});

// 创建默认用户
async function createDefaultUsers() {
    try {
        // 创建加密的密码
        const teacherPassword = await bcrypt.hash('123456', 10);
        const studentPassword = await bcrypt.hash('123456', 10);

        // 插入默认教师用户
        const teacherSql = `
            INSERT OR IGNORE INTO users (username, password, role, real_name, email) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(teacherSql, ['teacher1', teacherPassword, 'teacher', '教师一号', 'teacher1@example.com'], function(err) {
            if (err) {
                console.error('创建默认教师用户失败:', err.message);
            } else if (this.changes > 0) {
                console.log('✅ 默认教师用户创建成功: teacher1 / 123456');
            } else {
                console.log('ℹ️  默认教师用户已存在');
            }
        });

        // 插入默认学生用户
        const studentSql = `
            INSERT OR IGNORE INTO users (username, password, role, real_name, student_id, class_name) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(studentSql, ['student1', studentPassword, 'student', '学生一号', '2023001', '一班'], function(err) {
            if (err) {
                console.error('创建默认学生用户失败:', err.message);
            } else if (this.changes > 0) {
                console.log('✅ 默认学生用户创建成功: student1 / 123456');
            } else {
                console.log('ℹ️  默认学生用户已存在');
            }
        });

        // 添加更多测试用户
        const testUsers = [
            ['teacher2', '123456', 'teacher', '教师二号', 'teacher2@example.com'],
            ['student2', '123456', 'student', '学生二号', '2023002', '一班'],
            ['student3', '123456', 'student', '学生三号', '2023003', '二班']
        ];

        for (let i = 0; i < testUsers.length; i++) {
            const [username, password, role, realName, extra, className] = testUsers[i];
            const hashedPassword = await bcrypt.hash(password, 10);
            
            if (role === 'teacher') {
                const sql = `INSERT OR IGNORE INTO users (username, password, role, real_name, email) VALUES (?, ?, ?, ?, ?)`;
                db.run(sql, [username, hashedPassword, role, realName, extra]);
            } else {
                const sql = `INSERT OR IGNORE INTO users (username, password, role, real_name, student_id, class_name) VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(sql, [username, hashedPassword, role, realName, extra, className]);
            }
        }

        console.log('🎉 默认用户初始化完成！');
        console.log('\n可用的登录账号：');
        console.log('教师账号：teacher1 / 123456');
        console.log('教师账号：teacher2 / 123456');
        console.log('学生账号：student1 / 123456');
        console.log('学生账号：student2 / 123456');
        console.log('学生账号：student3 / 123456');
        
        // 关闭数据库连接
        setTimeout(() => {
            db.close((err) => {
                if (err) {
                    console.error('关闭数据库失败:', err.message);
                } else {
                    console.log('\n✨ 数据库连接已关闭');
                }
                process.exit(0);
            });
        }, 1000);

    } catch (error) {
        console.error('创建默认用户失败:', error);
        process.exit(1);
    }
}