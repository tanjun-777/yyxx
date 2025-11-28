// 部署验证脚本
// 在本地运行以检查所有重要文件是否存在

const fs = require('fs');
const path = require('path');

console.log('🔍 验证部署文件...\n');

// 需要验证的重要文件
const requiredFiles = [
  { file: 'database-supabase.js', description: 'Supabase 数据库适配器' },
  { file: 'package.json', description: '项目依赖配置' },
  { file: 'api/routes.js', description: 'API 路由文件' },
  { file: 'SUPABASE_DEPLOYMENT_GUIDE.md', description: 'Supabase 部署指南' },
  { file: 'deploy-steps.md', description: '完整部署步骤' },
  { file: 'supabase-init.sql', description: 'SQL 初始化脚本' },
  { file: 'test-apis.md', description: 'API 测试指南' },
  { file: 'vercel.json', description: 'Vercel 配置文件' },
  { file: 'api/index.js', description: 'Vercel 入口文件' }
];

let allFilesExist = true;

console.log('📁 检查必需文件：');
requiredFiles.forEach(({ file, description }) => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  
  console.log(`  ${status} ${file} - ${description}`);
  if (!exists) {
    allFilesExist = false;
  }
});

// 检查 package.json 中的依赖
console.log('\n📦 检查 package.json 依赖：');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const hasPg = packageJson.dependencies && packageJson.dependencies.pg;
  const noSqlite = !packageJson.dependencies || !packageJson.dependencies.sqlite3;
  
  console.log(`  ${hasPg ? '✅' : '❌'} pg 依赖已添加`);
  console.log(`  ${noSqlite ? '✅' : '❌'} sqlite3 依赖已移除`);
  
} catch (error) {
  console.log('  ❌ 无法读取 package.json');
}

// 检查 API 路由配置
console.log('\n🛣️ 检查 API 路由配置：');
try {
  const routesContent = fs.readFileSync('api/routes.js', 'utf8');
  const hasSupabaseImport = routesContent.includes("require('../database-supabase')");
  const hasRealDatabase = routesContent.includes("dbOperations.getUserByUsername");
  
  console.log(`  ${hasSupabaseImport ? '✅' : '❌'} 已导入 Supabase 数据库`);
  console.log(`  ${hasRealDatabase ? '✅' : '❌'} 使用真实数据库操作`);
  
} catch (error) {
  console.log('  ❌ 无法读取 api/routes.js');
}

// 总结
console.log(`\n🎯 验证结果：`);
if (allFilesExist) {
  console.log('  ✅ 所有必需文件都存在！');
} else {
  console.log('  ❌ 部分文件缺失，请检查');
}

console.log('\n📋 下一步操作：');
console.log('  1. 访问 GitHub: https://github.com/tanjun-777/yyxx');
console.log('  2. 在 Vercel 导入项目');
console.log('  3. 配置环境变量');
console.log('  4. 测试部署功能');