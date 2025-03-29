const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');const path = require('path');
const { startSpringBootServer, stopSpringBootServer } = require('./utils/springboot');
const log = require('electron-log');
const { setupIpcHandlers } = require('./utils/ipc-handlers');
const {existsSync} = require("node:fs");
const {initAutoUpdater, checkForUpdates} = require("./utils/updater");

// 配置日志
log.transports.file.level = 'info';
log.info('应用启动');

// 全局引用
let mainWindow;
let tray;
let serverPort;
let serverProcess;
let isAppQuitting = false;


// 获取图标路径
let iconPath;
if (app.isPackaged) {
  iconPath = path.join(process.resourcesPath, 'icons/icon.png');
} else {
  iconPath = path.join(__dirname, '../build/icons/icon.png');
}
log.info(`使用图标路径: ${iconPath}`);

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
    icon: iconPath
  });

  // 加载前端页面
  if (process.env.NODE_ENV === 'development') {
    // 开发模式下连接Vue开发服务器
    await mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下加载构建后的文件
    await mainWindow.loadFile(path.join(__dirname, '../frontend/print-client/dist/index.html'));
    // 在生产环境中也打开开发者工具进行调试
    mainWindow.webContents.openDevTools();
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
  try{
    log.info('设置系统托盘');

    tray = new Tray(iconPath);
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
        label: '检查更新',
        click: () => {
          checkForUpdates();
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
  }catch (error) {
    log.error('创建系统托盘失败:', error);
    // 使用fallback空图标，避免崩溃
    const emptyIconPath = path.join(__dirname, 'empty.png'); // 创建一个1x1像素的空图标
    if (!existsSync(emptyIconPath)) {
      createEmptyIcon(emptyIconPath);
    }
    tray = new Tray(emptyIconPath);
  }
}


// 添加创建空图标的辅助函数
function createEmptyIcon(filePath) {
  try {
    // 创建1x1像素的透明PNG
    const buffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0B, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,
      0x00, 0x05, 0x00, 0x01, 0xE2, 0x26, 0x05, 0x9B, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(filePath, buffer);
    log.info('已创建空图标');
  } catch (error) {
    log.error('创建空图标失败:', error);
  }
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

    // 初始化自动更新
    initAutoUpdater(mainWindow);

    // 应用启动后检查更新
    setTimeout(() => {
      checkForUpdates();
    }, 3000); // 延迟3秒检查，避免影响应用启动速度


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

    // 显示错误对话框
    dialog.showErrorBox(
        '启动失败',
        `应用启动失败，错误信息: ${error.message}\n\n请检查应用日志获取更多信息。`
    );

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