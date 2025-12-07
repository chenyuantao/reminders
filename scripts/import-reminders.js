#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3000';
const DEFAULT_JSON_FILE = path.join(__dirname, '../reminders.json');
const JSON_FILE = process.argv[2] 
  ? (path.isAbsolute(process.argv[2]) 
      ? process.argv[2] 
      : path.resolve(process.cwd(), process.argv[2]))
  : DEFAULT_JSON_FILE;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10); // 每批处理的个数
const DELAY_MS = parseInt(process.env.DELAY_MS || '100', 10); // 每批之间的延迟（毫秒）

// 统计信息
let stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: []
};

/**
 * 发送 HTTP POST 请求
 */
function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || body}`));
          }
        } catch (e) {
          reject(new Error(`解析响应失败: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 处理单个 reminder
 */
async function insertReminder(reminder, index) {
  try {
    const response = await postRequest(`${API_URL}/api/insert`, reminder);
    if (response.success) {
      stats.success++;
      return { success: true, index, id: reminder.id };
    } else {
      stats.failed++;
      stats.errors.push({ index, id: reminder.id, error: response.error });
      return { success: false, index, id: reminder.id, error: response.error };
    }
  } catch (error) {
    stats.failed++;
    stats.errors.push({ index, id: reminder.id, error: error.message });
    return { success: false, index, id: reminder.id, error: error.message };
  }
}

/**
 * 批量处理 reminders
 */
async function processBatch(reminders, startIndex) {
  const batch = reminders.slice(startIndex, startIndex + BATCH_SIZE);
  const promises = batch.map((reminder, i) => insertReminder(reminder, startIndex + i));
  return Promise.all(promises);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始导入提醒事项...\n');
  console.log(`📁 文件: ${JSON_FILE}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log(`📦 批次大小: ${BATCH_SIZE}`);
  console.log(`⏱️  批次延迟: ${DELAY_MS}ms\n`);

  // 读取 JSON 文件
  let reminders;
  try {
    const fileContent = fs.readFileSync(JSON_FILE, 'utf-8');
    reminders = JSON.parse(fileContent);
    if (!Array.isArray(reminders)) {
      throw new Error('JSON 文件必须包含一个数组');
    }
    stats.total = reminders.length;
    console.log(`📊 总共 ${stats.total} 条提醒事项\n`);
  } catch (error) {
    console.error('❌ 读取文件失败:', error.message);
    process.exit(1);
  }

  // 处理所有 reminders
  const startTime = Date.now();
  
  for (let i = 0; i < reminders.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(reminders.length / BATCH_SIZE);
    
    console.log(`📦 处理批次 ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, reminders.length)})`);
    
    const results = await processBatch(reminders, i);
    
    // 显示批次结果
    const batchSuccess = results.filter(r => r.success).length;
    const batchFailed = results.filter(r => !r.success).length;
    console.log(`   ✅ 成功: ${batchSuccess}, ❌ 失败: ${batchFailed}`);
    
    // 如果不是最后一批，延迟一下
    if (i + BATCH_SIZE < reminders.length) {
      await delay(DELAY_MS);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // 显示最终统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 导入完成统计');
  console.log('='.repeat(50));
  console.log(`总数量: ${stats.total}`);
  console.log(`✅ 成功: ${stats.success}`);
  console.log(`❌ 失败: ${stats.failed}`);
  console.log(`⏱️  耗时: ${duration} 秒`);
  console.log(`📈 平均速度: ${(stats.total / parseFloat(duration)).toFixed(2)} 条/秒`);

  if (stats.errors.length > 0) {
    console.log('\n❌ 失败详情:');
    stats.errors.slice(0, 10).forEach((err, i) => {
      console.log(`   ${i + 1}. ID: ${err.id}, 错误: ${err.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... 还有 ${stats.errors.length - 10} 个错误`);
    }
  }

  console.log('\n✨ 完成！');
}

// 运行主函数
main().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});

