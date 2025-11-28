const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbOperations } = require('./database');
const { config } = require('./config');

const JWT_SECRET = config.server.jwtSecret;
const SALT_ROUNDS = 10;

// 生成JWT令牌
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// 验证JWT令牌
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// 中间件：验证用户身份
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: '需要登录令牌' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ error: '令牌无效或已过期' });
    }

    req.user = decoded;
    next();
}

// 中间件：验证教师身份
function requireTeacher(req, res, next) {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: '需要教师权限' });
    }
    next();
}

// 中间件：验证学生身份
function requireStudent(req, res, next) {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: '需要学生权限' });
    }
    next();
}

// 用户注册
async function register(userData) {
    try {
        const { username, password, email, role, real_name, student_id, class_name } = userData;

        // 检查用户名是否已存在
        const existingUser = await dbOperations.getUserByUsername(username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

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

        // 生成令牌
        const token = generateToken(newUser);

        return {
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                real_name: newUser.real_name,
                email: newUser.email
            },
            token
        };

    } catch (error) {
        throw error;
    }
}

// 用户登录
async function login(username, password) {
    try {
        // 查找用户
        const user = await dbOperations.getUserByUsername(username);
        if (!user) {
            throw new Error('用户名或密码错误');
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('用户名或密码错误');
        }

        // 更新最后登录时间
        await dbOperations.updateUserLogin(user.id);

        // 生成令牌
        const token = generateToken(user);

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                real_name: user.real_name,
                email: user.email,
                student_id: user.student_id,
                class_name: user.class_name
            },
            token
        };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    register,
    login,
    generateToken,
    verifyToken,
    authenticateToken,
    requireTeacher,
    requireStudent
};