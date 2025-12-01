// Vercel Serverless Function - 标准格式
export default async function handler(req, res) {
  try {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // 健康检查
    if (req.url === '/api/health') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Vercel Function 正常运行',
        method: req.method,
        url: req.url
      });
    }

    // 登录
    if (req.url === '/api/login' && req.method === 'POST') {
      try {
        const body = JSON.parse(req.body || '{}');
        const { username, password } = body;
        
        if (username === 'test' && password === 'test') {
          return res.json({
            message: '登录成功',
            token: 'test-token-' + Date.now(),
            user: { id: 1, username: 'test', role: 'teacher' }
          });
        }
        
        return res.status(401).json({ error: '用户名或密码错误' });
      } catch (parseError) {
        return res.status(400).json({ error: 'JSON 解析失败' });
      }
    }

    return res.status(404).json({ 
      error: 'Endpoint not found',
      url: req.url,
      method: req.method
    });
    
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
