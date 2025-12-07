# 导入提醒事项脚本

这个脚本用于批量导入提醒事项到 Supabase 数据库。

## 使用方法

### 基本用法

```bash
# 使用默认文件 (reminders_1009.json)
npm run import

# 或指定文件路径
node scripts/import-reminders.js /path/to/your/reminders.json
```

### 环境变量配置

可以通过环境变量自定义配置：

```bash
# 设置 API URL（默认: http://localhost:3000）
API_URL=http://localhost:3000 npm run import

# 设置批次大小（默认: 10）
BATCH_SIZE=20 npm run import

# 设置批次延迟（默认: 100ms）
DELAY_MS=200 npm run import

# 组合使用
API_URL=http://localhost:3000 BATCH_SIZE=20 DELAY_MS=200 npm run import
```

## 参数说明

- **API_URL**: API 服务器地址（默认: `http://localhost:3000`）
- **BATCH_SIZE**: 每批处理的提醒事项数量（默认: `10`）
- **DELAY_MS**: 每批之间的延迟时间，单位毫秒（默认: `100`）

## 使用步骤

1. **确保 Next.js 服务器正在运行**
   ```bash
   npm run dev
   ```

2. **准备 JSON 文件**
   - JSON 文件应包含一个提醒事项数组
   - 每个提醒事项应包含以下字段：
     ```json
     {
       "id": "string",
       "title": "string",
       "notes": "string (可选)",
       "dueDate": "string (可选)",
       "tags": ["string"] (可选),
       "completed": boolean,
       "createdAt": "string",
       "updatedAt": "string",
       "rank": number
     }
     ```

3. **运行导入脚本**
   ```bash
   npm run import /path/to/reminders.json
   ```

## 输出示例

```
🚀 开始导入提醒事项...

📁 文件: /path/to/reminders.json
🌐 API URL: http://localhost:3000
📦 批次大小: 10
⏱️  批次延迟: 100ms

📊 总共 100 条提醒事项

📦 处理批次 1/10 (1-10)
   ✅ 成功: 10, ❌ 失败: 0
📦 处理批次 2/10 (11-20)
   ✅ 成功: 10, ❌ 失败: 0
...

==================================================
📊 导入完成统计
==================================================
总数量: 100
✅ 成功: 100
❌ 失败: 0
⏱️  耗时: 12.34 秒
📈 平均速度: 8.10 条/秒

✨ 完成！
```

## 注意事项

- 确保 Next.js 开发服务器正在运行
- 确保 Supabase 环境变量已正确配置（`SUPABASE_URL` 和 `SUPABASE_ANON_KEY`）
- 如果导入大量数据，建议适当增加 `DELAY_MS` 以避免服务器压力过大
- 脚本会显示详细的进度和错误信息

