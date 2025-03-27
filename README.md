electron-print-app/
├── package.json              # Electron项目配置和依赖
├── electron/                 # Electron主进程代码
│   ├── main.js               # 主进程入口
│   ├── preload.js            # 预加载脚本
│   └── utils/                # 工具函数目录
│       ├── logger.js         # 日志工具
│       ├── springboot.js     # Spring Boot服务管理
│       └── ipc-handlers.js   # IPC通信处理
│
├── backend/                  # Spring Boot后端(复用现有代码)
│   ├── pom.xml               # Maven配置
│   ├── src/
│   │   └── main/
│   │       ├── java/         # Java源代码
│   │       └── resources/    # 配置和资源文件
│   │           └── application.yml
│   └── target/               # 构建输出目录
│
├── frontend/                 # Vue前端
│   ├── package.json          # 前端依赖
│   ├── public/               # 静态资源
│   ├── src/
│   │   ├── assets/           # 图片等资源
│   │   ├── components/       # Vue组件
│   │   │   ├── PrinterList.vue
│   │   │   ├── TaskQueue.vue
│   │   │   └── ...
│   │   ├── views/            # 页面视图
│   │   │   ├── Home.vue
│   │   │   ├── Settings.vue
│   │   │   └── ...
│   │   ├── store/            # Pinia状态管理
│   │   ├── router/           # Vue Router配置
│   │   ├── api/              # API调用封装
│   │   ├── App.vue           # 根组件
│   │   └── main.js           # 前端入口
│   └── vite.config.js        # Vite配置
│
└── build/                    # 构建相关配置
    ├── icons/                # 应用图标
    └── electron-builder.yml  # Electron打包配置
