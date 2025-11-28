// 腾讯云API配置文件
// 注意：在生产环境中，建议使用环境变量来管理敏感信息

const config = {
    // 腾讯云API配置
    tencent: {
        // 应用ID
        appId: process.env.TENCENT_APP_ID || '1387667086',
        // 密钥ID
        secretId: process.env.TENCENT_SECRET_ID || 'AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6',
        // 密钥Key (请确保替换为正确的SecretKey)
        secretKey: process.env.TENCENT_SECRET_KEY || 'SecretId: AKID1sVt2wdBXfYKgqmUxUnsiKjwwhGahOs6',
        // 区域
        region: process.env.TENCENT_REGION || 'ap-beijing',
        // API端点
        endpoint: 'soe.tencentcloudapi.com'
    },
    
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        // JWT密钥
        jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        // 文件上传限制
        uploadMaxSize: 10 * 1024 * 1024, // 10MB
        uploadDir: 'uploads'
    },
    
    // 数据库配置
    database: {
        filename: process.env.DB_PATH || 'database.db'
    },
    
    // 开发模式
    isDevelopment: process.env.NODE_ENV !== 'production',
    
    // 日志级别
    logLevel: process.env.LOG_LEVEL || 'info'
};

// 验证必要的配置
function validateConfig() {
    const errors = [];
    
    if (!config.tencent.appId) {
        errors.push('TENCENT_APP_ID is required');
    }
    
    if (!config.tencent.secretId) {
        errors.push('TENCENT_SECRET_ID is required');
    }
    
    if (!config.tencent.secretKey || config.tencent.secretKey === 'your_secret_key_here') {
        errors.push('TENCENT_SECRET_KEY is required and should be set to a valid value');
    }
    
    if (errors.length > 0) {
        console.error('Configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        
        if (config.isDevelopment) {
            console.warn('Running in development mode with potentially invalid configuration');
        } else {
            process.exit(1);
        }
    }
    
    return errors.length === 0;
}

// 获取API请求头
function getTencentHeaders(action, timestamp, payload) {
    const algorithm = "TC3-HMAC-SHA256";
    const date = new Date(timestamp * 1000).toISOString().substr(0, 10).replace(/-/g, '');
    const service = "soe";
    const version = "2018-07-24";
    
    // 生成签名
    const crypto = require('crypto');
    
    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const canonicalHeaders = "content-type:application/json\n" + "host:" + config.tencent.endpoint + "\n";
    const signedHeaders = "content-type;host";
    const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');
    const canonicalRequest = httpRequestMethod + "\n" + canonicalUri + "\n" + canonicalQueryString + "\n" + 
                           canonicalHeaders + "\n" + signedHeaders + "\n" + hashedRequestPayload;
    
    const credentialScope = date + "/" + service + "/" + "tc3_request";
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;
    
    const secretDate = crypto.createHmac('sha256', date).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update("tc3_request").digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
    
    const authorization = algorithm + " " + "Credential=" + config.tencent.secretId + "/" + date + "/" + service + "/" + "tc3_request, " +
                        "SignedHeaders=content-type;host, " + "Signature=" + signature;
    
    return {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'Host': config.tencent.endpoint,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': version,
        'X-TC-Region': config.tencent.region,
        'X-TC-AppId': config.tencent.appId
    };
}

module.exports = {
    config,
    validateConfig,
    getTencentHeaders
};