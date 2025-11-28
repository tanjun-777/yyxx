const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { dbOperations } = require('./database');

async function install() {
    console.log('正在安装英语口语练习系统...');
    
    try {
        // 创建默认管理员教师账号
        const defaultTeacher = {
            username: 'admin',
            password: 'admin123',
            email: 'admin@school.com',
            role: 'teacher',
            real_name: '系统管理员',
            student_id: null,
            class_name: null
        };

        // 加密密码
        const hashedPassword = await bcrypt.hash(defaultTeacher.password, 10);
        defaultTeacher.password = hashedPassword;

        // 检查是否已存在管理员账号
        const existingAdmin = await dbOperations.getUserByUsername('admin');
        if (existingAdmin) {
            console.log('管理员账号已存在，跳过创建');
        } else {
            await dbOperations.createUser(defaultTeacher);
            console.log('默认管理员账号创建成功');
            console.log('用户名: admin');
            console.log('密码: admin123');
        }

        // 创建示例学生账号
        const defaultStudent = {
            username: 'student01',
            password: 'student123',
            email: 'student01@school.com',
            role: 'student',
            real_name: '张三',
            student_id: '2024001',
            class_name: '英语1班'
        };

        const existingStudent = await dbOperations.getUserByUsername('student01');
        if (existingStudent) {
            console.log('示例学生账号已存在，跳过创建');
        } else {
            const studentHashedPassword = await bcrypt.hash(defaultStudent.password, 10);
            defaultStudent.password = studentHashedPassword;
            await dbOperations.createUser(defaultStudent);
            console.log('示例学生账号创建成功');
            console.log('用户名: student01');
            console.log('密码: student123');
        }

        console.log('\n安装完成！');
        console.log('请运行 npm start 启动服务器');
        console.log('访问 http://localhost:3000 开始使用系统');
        
    } catch (error) {
        console.error('安装失败:', error);
    }
}

// 如果直接运行此文件，则执行安装
if (require.main === module) {
    install();
}

module.exports = { install };