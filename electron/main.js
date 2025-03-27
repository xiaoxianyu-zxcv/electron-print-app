const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const { startSpringBootServer, stopSpringBootServer } = require('./utils/springboot');
const log = require('electron-log');
const { setupIpcHandlers } = require('./utils/ipc-handlers');

// 配置日志
log.transports.file.level = 'info';
log.info('应用启动');

// 全局引用
let mainWindow;
let tray;
let serverPort;
let serverProcess;
let isAppQuitting = false;

async function createWindow() {
  log.info('创建主窗口');
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../build/icons/icon.png')
  });

  // 加载前端页面
  if (process.env.NODE_ENV === 'development') {
    // 开发模式下连接Vue开发服务器
    await mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下加载构建后的文件
    await mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // 窗口关闭时的处理
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // 窗口关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 设置系统托盘
function setupTray() {
  log.info('设置系统托盘');
  
  tray = new Tray(path.join(__dirname, '../build/icons/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主窗口', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        isAppQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('打印服务桌面版');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
}

// 当Electron完成初始化时调用
app.whenReady().then(async () => {
  try {
    log.info('启动Spring Boot服务');
    
    // 启动Spring Boot服务
    const result = await startSpringBootServer();
    serverPort = result.port;
    serverProcess = result.process;
    
    log.info(`Spring Boot服务已启动，端口: ${serverPort}`);
    
    // 设置IPC通信处理
    setupIpcHandlers(serverPort);
    
    // 创建主窗口
    await createWindow();
    
    // 设置系统托盘
    setupTray();
    
    // macOS特定处理
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    log.error('启动应用失败:', error);
    app.quit();
  }
});

// 所有窗口关闭时退出应用(Windows)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('will-quit', async (event) => {
  if (serverProcess) {
    log.info('正在关闭Spring Boot服务...');
    event.preventDefault();
    
    try {
      await stopSpringBootServer(serverProcess);
      log.info('Spring Boot服务已关闭');
      serverProcess = null;
      app.exit(0);
    } catch (error) {
      log.error('关闭Spring Boot服务失败:', error);
      app.exit(1);
    }
  }
});