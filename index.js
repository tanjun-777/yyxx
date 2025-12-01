// Vercel Serverless Function handler - 最简版本
module.exports = async (req, res) => {
  // 处理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req;
    const path = new URL(url, `http://${req.headers.host}`).pathname;

    console.log('API 调用:', req.method, path);

    // 健康检查
    if (path === '/api/health') {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Serverless Function 正常运行',
        database: 'test_mode',
        env_vars: {
          SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL ? 'configured' : 'missing',
          JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing'
        }
      });
      return;
    }

    // 测试登录（模拟数据）
    if (path === '/api/login' && req.method === 'POST') {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
      }

      // 模拟用户数据
      const users = [
        { id: 1, username: 'teacher1', password: '123456', role: 'teacher', real_name: '教师一号' },
        { id: 2, username: 'student1', password: '123456', role: 'student', real_name: '学生一号' },
        { id: 3, username: 'admin', password: 'admin123', role: 'teacher', real_name: '管理员' }
      ];

      const user = users.find(u => u.username === username && u.password === password);
      
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 简单的 token 生成
      const token = `token_${user.id}_${Date.now()}`;

      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          real_name: user.real_name
        },
        test_mode: true
      });
      return;
    }

    // 测试环境变量
    if (path === '/api/test-env') {
      res.json({
        env_vars: {
          SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL ? 'configured' : 'missing',
          JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
          NODE_ENV: process.env.NODE_ENV || 'development'
        },
        message: '环境变量检查完成'
      });
      return;
    }

    // 其他路由
    res.status(404).json({ 
      error: 'API endpoint not found',
      available_endpoints: ['/api/health', '/api/login', '/api/test-env'],
      test_mode: 'active'
    });
    
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
