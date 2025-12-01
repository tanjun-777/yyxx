const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbOperations } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-2024';

// 中间件：验证JWT令牌
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '令牌无效' });
        }
        req.user = user;
        next();
    });
};

// 中间件：验证教师权限
const requireTeacher = (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: '需要教师权限' });
    }
    next();
};

// 中间件：验证学生权限
const requireStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: '需要学生权限' });
    }
    next();
};

// 用户注册
const register = async (req, res) => {
    try {
        const { username, password, email, role, real_name, student_id, class_name } = req.body;

        if (!username || !password || !role || !real_name) {
            return res.status(400).json({ error: '必填字段不能为空' });
        }

        // 检查用户名是否已存在
        const existingUser = await dbOperations.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const newUser = await dbOperations.createUser({
            username,
            password: hashedPassword,
            email,
            role,
            real_name,
            student_id,
            class_name
        });

        res.status(201).json({
            message: '用户注册成功',
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                real_name: newUser.real_name
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ error: '注册失败' });
    }
};

// 用户登录
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 查找用户
        const user = await dbOperations.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成JWT令牌
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
                real_name: user.real_name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    }
};

module.exports = {
    authenticateToken,
    requireTeacher,
    requireStudent,
    register,
    login
};