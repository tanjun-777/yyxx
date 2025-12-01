const { Pool } = require('pg');

// Supabase 数据库连接
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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
      try {
        await pool.query('SELECT 1');
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'connected',
          message: '数据库连接正常'
        });
      } catch (dbError) {
        console.error('数据库连接失败:', dbError);
        res.status(500).json({ 
          status: 'error', 
          database: 'disconnected',
          error: dbError.message
        });
      }
      return;
    }

    // 简化登录（使用明文密码测试）
    if (path === '/api/login' && req.method === 'POST') {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
      }

      try {
        // 直接查询数据库
        const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
        const result = await pool.query(query, [username, password]);
        
        if (result.rows.length === 0) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = result.rows[0];

        // 简单的 token 生成（生产环境应使用 JWT）
        const token = `token_${user.id}_${Date.now()}`;

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
      } catch (dbError) {
        console.error('登录数据库错误:', dbError);
        res.status(500).json({ 
          error: '登录失败',
          database_error: dbError.message
        });
        return;
      }
    }

    // 测试数据库连接
    if (path === '/api/test-db') {
      try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        res.json({
          status: 'ok',
          user_count: parseInt(result.rows[0].count),
          tables: 'users 表可访问'
        });
        return;
      } catch (dbError) {
        console.error('测试数据库失败:', dbError);
        res.status(500).json({
          error: '数据库测试失败',
          message: dbError.message
        });
        return;
      }
    }

    // 其他路由
    res.status(404).json({ 
      error: 'API endpoint not found',
      available_endpoints: ['/api/health', '/api/login', '/api/test-db'],
      database_url: process.env.SUPABASE_DATABASE_URL ? 'configured' : 'missing'
    });
    
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
