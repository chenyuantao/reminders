# Reminders App - macOS 风格提醒事项应用

这是一个受 macOS Reminders 启发的现代化 Web 应用，使用 Next.js 14 和 TypeScript 构建。

## 功能特性

- ✨ 美观的 macOS 风格界面设计
- 📝 创建、编辑、删除提醒事项
- 🏷️ 支持优先级设置（高、中、低）
- 📅 到期日期设置
- 🚩 重要标记功能
- 📋 分类列表管理
- 💾 本地存储数据持久化
- 📱 响应式设计，支持移动端

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **日期处理**: date-fns
- **状态管理**: React Hooks

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动

### 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
reminder-app/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/             # React 组件
│   ├── Sidebar.tsx        # 侧边栏
│   ├── ReminderList.tsx   # 提醒事项列表
│   └── AddReminderModal.tsx # 添加提醒事项模态框
├── types/                  # TypeScript 类型定义
│   └── reminder.ts        # 提醒事项相关类型
├── package.json           # 项目依赖
├── tailwind.config.js     # Tailwind CSS 配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 项目说明
```

## 使用说明

1. **查看提醒事项**: 在侧边栏选择不同的列表查看分类的提醒事项
2. **添加提醒事项**: 点击右上角"添加提醒事项"按钮
3. **标记完成**: 点击提醒事项前的圆形复选框
4. **设置优先级**: 在添加或编辑时选择优先级
5. **设置到期日期**: 选择提醒事项的到期时间
6. **标记重要**: 勾选"标记为重要"选项
7. **删除提醒**: 点击提醒事项右侧的删除按钮

## 数据存储

目前应用使用浏览器的 localStorage 进行数据存储，所有数据都保存在本地。未来可以扩展为连接数据库的版本。

## 自定义配置

可以在 `tailwind.config.js` 中修改颜色主题，在 `types/reminder.ts` 中扩展数据类型。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个应用！

## 许可证

MIT License 