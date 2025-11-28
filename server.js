const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const url = require('url');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
require('dotenv').config(); // 加载环境变量

const { dbOperations } = require('./database');
const { register, login, authenticateToken, requireTeacher, requireStudent } = require('./auth');
const { config, validateConfig, getTencentHeaders } = require('./config');

// 验证配置
validateConfig();

const app = express();
const PORT = config.server.port;

// 配置文件上传
const upload = multer({
    dest: config.server.uploadDir,
    limits: {
        fileSize: config.server.uploadMaxSize
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('只支持音频文件'), false);
        }
    }
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, config.server.uploadDir);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 腾讯云API配置
const TENCENT_SECRET_ID = 'AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6';
const TENCENT_SECRET_KEY = 'SecretId: AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6'; // 更新的SecretKey
const TENCENT_APP_ID = '1387667086';
const TENCENT_REGION = 'ap-beijing';
const SOE_ENDPOINT = 'soe.tencentcloudapi.com';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 腾讯云API签名生成已在config.js中实现

// 调用腾讯云口语评测API
async function callTencentSoe(audioBase64, text, sessionId) {
    return new Promise((resolve, reject) => {
        const timestamp = Math.floor(Date.now() / 1000);
        
        const payload = JSON.stringify({
            "Action": "KeywordEvaluate",
            "Version": "2018-07-24",
            "Region": config.tencent.region,
            "AppId": parseInt(config.tencent.appId),
            "SessionId": sessionId,
            "IsEnd": 1,
            "SeqId": 1,
            "VoiceFileType": 3, // wav格式
            "VoiceEncodeType": 1, // PCM
            "UserVoiceData": audioBase64,
            "Text": text,
            "EvalMode": 0, // 自由模式
            "WorkMode": 0, // 流式模式
            "ScoreCoeff": 1.0
        });
        
        try {
            const headers = getTencentHeaders('KeywordEvaluate', timestamp, payload);
            
            const options = {
                hostname: config.tencent.endpoint,
                path: '/',
                method: 'POST',
                headers: headers
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(payload);
            req.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

// 评测接口
app.post('/api/evaluate', async (req, res) => {
    try {
        const { audioData, text, sessionId } = req.body;
        
        if (!audioData || !text) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        console.log('开始评测，文本:', text);
        
        // 调用腾讯云API
        const result = await callTencentSoe(audioData, text, sessionId);
        
        console.log('腾讯云API返回:', result);
        
        // 解析腾讯云返回的结果
        let evaluationResult = {
            score: 0,
            accuracy: 0,
            fluency: 0,
            feedback: '评测完成'
        };
        
        if (result.Response && result.Response.Keywords && result.Response.Keywords.length > 0) {
            const keyword = result.Response.Keywords[0];
            evaluationResult = {
                score: Math.round(keyword.PronAccuracy || 0),
                accuracy: Math.round(keyword.PronAccuracy || 0),
                fluency: Math.round(keyword.PronFluency || 0),
                feedback: keyword.Words && keyword.Words.length > 0 ? 
                         `发音得分: ${Math.round(keyword.PronAccuracy)}分，建议继续保持练习` : 
                         '评测完成，请继续练习'
            };
        }
        
        res.json(evaluationResult);
        
    } catch (error) {
        console.error('评测失败:', error);
        res.status(500).json({ error: '评测服务暂时不可用，请稍后重试' });
    }
});

// === 认证相关API ===

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, role, real_name, student_id, class_name } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: '用户名、密码和角色不能为空' });
        }

        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ error: '角色必须是学生或教师' });
        }

        const result = await register({
            username,
            password,
            email,
            role,
            real_name,
            student_id,
            class_name
        });

        res.json(result);

    } catch (error) {
        console.error('注册失败:', error);
        res.status(400).json({ error: error.message });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        const result = await login(username, password);
        res.json(result);

    } catch (error) {
        console.error('登录失败:', error);
        res.status(401).json({ error: error.message });
    }
});

// 获取当前用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await dbOperations.getUserByUsername(req.user.username);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不返回密码
        const { password, ...userInfo } = user;
        res.json(userInfo);

    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// === 用户管理API ===

// 获取所有用户（管理员功能）
app.get('/api/users/all', authenticateToken, async (req, res) => {
    try {
        // 只有教师可以查看所有用户
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: '需要教师权限' });
        }

        const users = await dbOperations.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 创建用户（管理员功能）
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: '需要教师权限' });
        }

        const { username, password, email, role, real_name, student_id, class_name } = req.body;

        if (!username || !password || !role || !real_name) {
            return res.status(400).json({ error: '用户名、密码、角色和真实姓名不能为空' });
        }

        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ error: '角色必须是学生或教师' });
        }

        // 检查用户名是否已存在
        const existingUser = await dbOperations.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await dbOperations.createUser({
            username,
            password: hashedPassword,
            email,
            role,
            real_name,
            student_id: role === 'student' ? student_id : null,
            class_name: role === 'student' ? class_name : null
        });

        res.json(newUser);

    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ error: '创建用户失败' });
    }
});

// 更新用户（管理员功能）
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: '需要教师权限' });
        }

        const userId = parseInt(req.params.id);
        const { username, password, email, role, real_name, student_id, class_name } = req.body;

        if (!username || !role || !real_name) {
            return res.status(400).json({ error: '用户名、角色和真实姓名不能为空' });
        }

        const bcrypt = require('bcryptjs');
        let updateData = {
            username,
            email,
            role,
            real_name,
            student_id: role === 'student' ? student_id : null,
            class_name: role === 'student' ? class_name : null
        };

        // 如果提供了新密码，则更新密码
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const result = await dbOperations.updateUser(userId, updateData);
        res.json(result);

    } catch (error) {
        console.error('更新用户失败:', error);
        if (error.message.includes('用户名已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: '更新用户失败' });
        }
    }
});

// 批量导入学生用户（管理员功能）
app.post('/api/users/batch-import', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: '需要教师权限' });
        }

        const { students } = req.body; // students 应该是包含学生信息的数组

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ error: '请提供有效的学生数据' });
        }

        const bcrypt = require('bcryptjs');
        const results = {
            success: [],
            failed: []
        };

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const { username, password, real_name, student_id, class_name, email } = student;

            try {
                // 验证必填字段
                if (!username || !password || !real_name) {
                    results.failed.push({
                        index: i,
                        data: student,
                        error: '用户名、密码和真实姓名不能为空'
                    });
                    continue;
                }

                // 检查用户名是否已存在
                const existingUser = await dbOperations.getUserByUsername(username);
                if (existingUser) {
                    results.failed.push({
                        index: i,
                        data: student,
                        error: '用户名已存在'
                    });
                    continue;
                }

                // 创建学生用户
                const hashedPassword = await bcrypt.hash(password, 10);
                const newStudent = await dbOperations.createUser({
                    username,
                    password: hashedPassword,
                    email: email || null,
                    role: 'student',
                    real_name,
                    student_id: student_id || null,
                    class_name: class_name || null
                });

                results.success.push({
                    index: i,
                    data: student,
                    userId: newStudent.id
                });

            } catch (error) {
                results.failed.push({
                    index: i,
                    data: student,
                    error: error.message || '创建用户失败'
                });
            }
        }

        res.json({
            message: `批量导入完成，成功：${results.success.length}，失败：${results.failed.length}`,
            results
        });

    } catch (error) {
        console.error('批量导入失败:', error);
        res.status(500).json({ error: '批量导入失败' });
    }
});

// 删除用户（管理员功能）
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: '需要教师权限' });
        }

        const userId = parseInt(req.params.id);
        
        // 防止删除自己
        if (userId === req.user.id) {
            return res.status(400).json({ error: '不能删除自己' });
        }

        const result = await dbOperations.deleteUser(userId);
        res.json(result);

    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 获取学生列表（兼容旧API）
app.get('/api/students', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const students = await dbOperations.getStudentsByTeacher();
        res.json(students);
    } catch (error) {
        console.error('获取学生列表失败:', error);
        res.status(500).json({ error: '获取学生列表失败' });
    }
});

// === 任务管理API ===

// 获取所有任务
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'teacher') {
            // 教师查看自己创建的任务
            const tasks = await dbOperations.getExercisesByTeacher(req.user.id);
            res.json(tasks);
        } else {
            // 学生查看分配给自己的任务
            const tasks = await dbOperations.getAvailableExercises(req.user.id);
            res.json(tasks);
        }
    } catch (error) {
        console.error('获取任务列表失败:', error);
        res.status(500).json({ error: '获取任务列表失败' });
    }
});

// 创建任务
app.post('/api/tasks', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { title, content, difficulty_level, start_time, end_time, target_classes } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: '标题和内容不能为空' });
        }

        const task = await dbOperations.createExercise({
            teacher_id: req.user.id,
            title,
            content,
            difficulty_level: difficulty_level || 1,
            start_time: start_time ? new Date(start_time).toISOString() : null,
            end_time: end_time ? new Date(end_time).toISOString() : null,
            target_classes: target_classes || null
        });

        res.json(task);

    } catch (error) {
        console.error('创建任务失败:', error);
        res.status(500).json({ error: '创建任务失败' });
    }
});

// 获取待审批的提交列表
app.get('/api/submissions/pending', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const submissions = await dbOperations.getPendingSubmissions();
        res.json(submissions);
    } catch (error) {
        console.error('获取待审批列表失败:', error);
        res.status(500).json({ error: '获取待审批列表失败' });
    }
});

// 审批提交
app.post('/api/submissions/:id/review', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const { status, teacher_feedback, feedback_type } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: '无效的审批状态' });
        }

        const result = await dbOperations.reviewSubmission(submissionId, {
            reviewer_id: req.user.id,
            status,
            teacher_feedback,
            feedback_type: feedback_type || 'ai_only'
        });

        res.json(result);

    } catch (error) {
        console.error('审批提交失败:', error);
        res.status(500).json({ error: '审批提交失败' });
    }
});

// 学生获取自己的反馈
app.get('/api/student/feedback', authenticateToken, async (req, res) => {
    try {
        const feedback = await dbOperations.getStudentFeedback(req.user.id);
        res.json(feedback);
    } catch (error) {
        console.error('获取学生反馈失败:', error);
        res.status(500).json({ error: '获取学生反馈失败' });
    }
});

// 学生获取自己的任务
app.get('/api/student/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await dbOperations.getAvailableExercises(req.user.id);
        res.json(tasks);
    } catch (error) {
        console.error('获取学生任务失败:', error);
        res.status(500).json({ error: '获取学生任务失败' });
    }
});

// === 练习管理API ===

// 创建练习任务
app.post('/api/exercises', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { title, content, difficulty_level, start_time, end_time } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: '标题和内容不能为空' });
        }

        const exercise = await dbOperations.createExercise({
            teacher_id: req.user.id,
            title,
            content,
            difficulty_level: difficulty_level || 1,
            start_time: start_time ? new Date(start_time).toISOString() : null,
            end_time: end_time ? new Date(end_time).toISOString() : null
        });

        res.json(exercise);

    } catch (error) {
        console.error('创建练习失败:', error);
        res.status(500).json({ error: '创建练习失败' });
    }
});

// 获取教师的练习列表
app.get('/api/exercises', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const exercises = await dbOperations.getExercisesByTeacher(req.user.id);
        res.json(exercises);
    } catch (error) {
        console.error('获取练习列表失败:', error);
        res.status(500).json({ error: '获取练习列表失败' });
    }
});

// 获取活跃的练习（学生端）
app.get('/api/active-exercises', authenticateToken, requireStudent, async (req, res) => {
    try {
        const exercises = await dbOperations.getActiveExercises();
        res.json(exercises);
    } catch (error) {
        console.error('获取活跃练习失败:', error);
        res.status(500).json({ error: '获取活跃练习失败' });
    }
});

// === 练习记录API ===

// 提交练习记录
app.post('/api/exercise-records', authenticateToken, requireStudent, upload.single('audio'), async (req, res) => {
    try {
        const { exercise_id, score, accuracy, fluency, integrity, ai_feedback, feedback_type } = req.body;

        if (!exercise_id) {
            return res.status(400).json({ error: '练习ID不能为空' });
        }

        const audio_path = req.file ? req.file.path : null;
        const session_id = uuidv4();

        const record = await dbOperations.createExerciseRecord({
            student_id: req.user.id,
            exercise_id,
            audio_path,
            session_id,
            score: score || 0,
            accuracy: accuracy || 0,
            fluency: fluency || 0,
            integrity: integrity || 0,
            ai_feedback,
            feedback_type: feedback_type || 'ai',
            attempt_count: 1
        });

        // 更新每日统计
        const today = dayjs().format('YYYY-MM-DD');
        await dbOperations.updateDailyStats(req.user.id, today, {
            exercises_completed: 1,
            total_score: score || 0,
            best_score: score || 0
        });

        res.json(record);

    } catch (error) {
        console.error('提交练习记录失败:', error);
        res.status(500).json({ error: '提交练习记录失败' });
    }
});

// 获取学生的练习记录
app.get('/api/my-records', authenticateToken, requireStudent, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const records = await dbOperations.getStudentRecords(req.user.id, limit);
        res.json(records);
    } catch (error) {
        console.error('获取练习记录失败:', error);
        res.status(500).json({ error: '获取练习记录失败' });
    }
});

// 获取指定练习的学生记录（教师端）
app.get('/api/exercises/:id/records', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const exerciseId = req.params.id;
        const records = await dbOperations.getRecordsByExercise(exerciseId);
        res.json(records);
    } catch (error) {
        console.error('获取练习记录失败:', error);
        res.status(500).json({ error: '获取练习记录失败' });
    }
});

// 更新教师反馈
app.put('/api/exercise-records/:id/feedback', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { feedback, feedback_type } = req.body;
        const recordId = req.params.id;

        if (!feedback) {
            return res.status(400).json({ error: '反馈内容不能为空' });
        }

        await dbOperations.updateTeacherFeedback(recordId, feedback, feedback_type || 'both');
        res.json({ message: '反馈更新成功' });

    } catch (error) {
        console.error('更新反馈失败:', error);
        res.status(500).json({ error: '更新反馈失败' });
    }
});

// === 统计API ===

// 获取学生个人统计
app.get('/api/my-stats', authenticateToken, requireStudent, async (req, res) => {
    try {
        const startDate = req.query.startDate || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
        const endDate = req.query.endDate || dayjs().format('YYYY-MM-DD');
        
        const stats = await dbOperations.getStudentStats(req.user.id, startDate, endDate);
        res.json(stats);
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '获取统计数据失败' });
    }
});

// 获取班级统计（教师端）
app.get('/api/class-stats', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const startDate = req.query.startDate || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
        const endDate = req.query.endDate || dayjs().format('YYYY-MM-DD');
        
        const stats = await dbOperations.getClassStats(req.user.id, startDate, endDate);
        res.json(stats);
    } catch (error) {
        console.error('获取班级统计失败:', error);
        res.status(500).json({ error: '获取班级统计失败' });
    }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务运行正常' });
});

// 默认路由，返回index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('请确保已正确配置腾讯云API密钥');
});