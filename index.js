const { Pool } = require('pg');

// Supabase 数据库连接
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 数据库操作函数
const dbOperations = {
  async getUserByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  async updateUserLogin(userId) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [userId]);
  }
};

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
    const path = new URL(url, `http://${req.headers.host}`).pathname;

    console.log('API 调用:', req.method, path);

    // 健康检查
    if (path === '/api/health') {
      // 测试数据库连接
      try {
        await pool.query('SELECT 1');
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'connected'
        });
      } catch (dbError) {
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: dbError.message
        });
      }
      return;
    }

    // 登录处理
    if (path === '/api/login' && req.method === 'POST') {
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

    // 其他路由
    res.status(404).json({ 
      error: 'API endpoint not found',
      available_endpoints: ['/api/health', '/api/login']
    });
    
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      database_url: process.env.SUPABASE_DATABASE_URL ? 'configured' : 'missing'
    });
  }
};
