const { dbOperations, initDatabase } = require('../database-supabase');

// Vercel Serverless Function handler
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
    const parsedUrl = new URL(url, `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const query = parsedUrl.searchParams;

    console.log('API 调用:', req.method, path);

    // 健康检查
    if (path === '/api/health') {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    // 数据库初始化
    if (path === '/api/init-db') {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      await initDatabase();
      res.json({ message: '数据库初始化成功' });
      return;
    }

    // 登录处理
    if (path === '/api/login') {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
      }

      const user = await dbOperations.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      await dbOperations.updateUserLogin(user.id);

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
      return;
    }

    // 其他 API 路由的占位符
    res.status(404).json({ error: 'API endpoint not found' });
    
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
