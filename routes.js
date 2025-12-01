const express = require('express');
const { authenticateToken, requireTeacher, login } = require('./auth');
const { dbOperations, initDatabase } = require('../database-supabase');

const router = express.Router();

// 登录路由
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 从 Supabase 数据库查找用户
        const user = await dbOperations.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 更新登录时间
        await dbOperations.updateUserLogin(user.id);

        // 生成JWT令牌
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-2024';
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                real_name: user.real_name
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 获取用户信息
router.get('/user', authenticateToken, (req, res) => {
    res.json(req.user);
});

// 获取所有用户（教师权限）
router.get('/users/all', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const users = await dbOperations.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 获取任务列表
router.get('/tasks', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'teacher') {
            // 教师查看自己创建的任务
            const exercises = await dbOperations.getExercisesByTeacher(req.user.id);
            res.json(exercises);
        } else {
            // 学生查看可用任务
            const exercises = await dbOperations.getAvailableExercises(req.user.id);
            res.json(exercises);
        }
    } catch (error) {
        console.error('获取任务列表失败:', error);
        res.status(500).json({ error: '获取任务列表失败' });
    }
});

// 创建任务
router.post('/tasks', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const exerciseData = {
            ...req.body,
            teacher_id: req.user.id
        };
        const exercise = await dbOperations.createExercise(exerciseData);
        res.json(exercise);
    } catch (error) {
        console.error('创建任务失败:', error);
        res.status(500).json({ error: '创建任务失败' });
    }
});

// 学生获取反馈
router.get('/student/feedback', authenticateToken, async (req, res) => {
    try {
        const feedback = await dbOperations.getStudentFeedback(req.user.id);
        res.json(feedback);
    } catch (error) {
        console.error('获取反馈失败:', error);
        res.status(500).json({ error: '获取反馈失败' });
    }
});

// 获取待审批列表
router.get('/submissions/pending', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const submissions = await dbOperations.getPendingSubmissions();
        res.json(submissions);
    } catch (error) {
        console.error('获取待审批列表失败:', error);
        res.status(500).json({ error: '获取待审批列表失败' });
    }
});

// 初始化数据库
router.post('/init-db', async (req, res) => {
    try {
        await initDatabase();
        res.json({ message: '数据库初始化成功' });
    } catch (error) {
        console.error('数据库初始化失败:', error);
        res.status(500).json({ error: '数据库初始化失败' });
    }
});

// 批量导入学生
router.post('/users/batch-import', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { users } = req.body;
        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ error: '请提供有效的用户数据' });
        }
        
        const result = await dbOperations.batchImportStudents(users);
        res.json(result);
    } catch (error) {
        console.error('批量导入失败:', error);
        res.status(500).json({ error: '批量导入失败' });
    }
});

// 健康检查
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;