# 腾讯云API配置指南

## 📋 当前配置信息

已为您配置的腾讯云API信息：

- **APPID**: `1387667086`
- **SecretId**: `AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6`
- **SecretKey**: 已更新到配置文件

## 🔧 配置方式

### 方式一：直接修改配置文件（已配置）

系统已经将API信息配置到以下文件中：

1. **config.js** - 主要配置文件
2. **server.js** - 服务器配置
3. **database.js** - 数据库配置
4. **auth.js** - 认证配置

### 方式二：使用环境变量（推荐）

在生产环境中，建议使用环境变量来管理敏感配置：

1. **复制环境变量模板**
```bash
cp .env.example .env
```

2. **编辑 .env 文件**
```bash
# 腾讯云API配置
TENCENT_APP_ID=1387667086
TENCENT_SECRET_ID=AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6
TENCENT_SECRET_KEY=your_actual_secret_key
TENCENT_REGION=ap-beijing
```

## ⚠️ 重要提醒

### 1. SecretKey 更新
- 你提供的密钥格式 "SecretId: AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6" 可能不是正确的SecretKey格式
- 请确认真实的SecretKey并替换配置中的值

### 2. API调用测试
配置完成后，建议进行以下测试：

```bash
# 启动服务器
npm start

# 测试API健康状态
curl http://localhost:3000/api/health
```

### 3. 验证配置
系统启动时会自动验证配置完整性：

```javascript
// 检查必要配置是否正确
const isValid = validateConfig();
if (!isValid) {
    console.error('配置验证失败');
}
```

## 🚀 启动系统

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境
```bash
# 设置环境变量
export NODE_ENV=production

# 启动服务器
npm start
```

## 📊 API功能说明

配置完成后，系统将支持以下腾讯云功能：

### 口语评测API
- **功能**: KeywordEvaluate
- **版本**: 2018-07-24
- **区域**: ap-beijing
- **支持格式**: WAV音频文件

### 评测参数
```javascript
{
    "SessionId": "session_xxx",
    "IsEnd": 1,
    "SeqId": 1,
    "VoiceFileType": 3,      // WAV格式
    "VoiceEncodeType": 1,    // PCM编码
    "UserVoiceData": "base64_data",
    "Text": "要评测的文本",
    "EvalMode": 0,          // 自由模式
    "WorkMode": 0,          // 流式模式
    "ScoreCoeff": 1.0        // 评分系数
}
```

## 🔍 故障排除

### 1. API调用失败
**错误**: "AuthFailure.SignatureFailure"
**解决**: 检查SecretKey是否正确

### 2. AppId错误
**错误**: "InvalidParameter.AppIdNotFound"
**解决**: 确认AppId是否正确且已开通服务

### 3. 区域配置错误
**错误**: "UnsupportedRegion"
**解决**: 确认region配置是否正确

### 4. 服务未开通
**错误**: "ResourceUnavailable.ServiceNotFound"
**解决**: 确认已开通智聆口语评测服务

## 📞 技术支持

如果遇到配置问题：

1. **检查腾讯云控制台**
   - 确认服务已开通
   - 验证API密钥信息
   - 检查账户余额

2. **查看系统日志**
```bash
# 开启详细日志
export LOG_LEVEL=debug
npm start
```

3. **测试API连通性**
```bash
# 使用curl测试
curl -X POST https://soe.tencentcloudapi.com \
  -H "Content-Type: application/json" \
  -d '{"Action": "KeywordEvaluate", "Version": "2018-07-24"}'
```

## 📝 配置验证清单

- [ ] 腾讯云账号已开通智聆口语评测服务
- [ ] API密钥信息正确配置
- [ ] AppID和SecretKey格式正确
- [ ] 服务器能够访问腾讯云API
- [ ] 防火墙允许HTTPS请求
- [ ] 系统时区设置正确
- [ ] 文件上传权限正常

---

**配置完成后，系统即可提供专业的英语口语评测服务！** 🎉