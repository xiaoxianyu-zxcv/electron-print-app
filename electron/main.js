// 在文件顶部引入自动更新模块
const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { startSpringBootServer, stopSpringBootServer } = require('./utils/springboot');
const log = require('electron-log');
const { setupIpcHandlers } = require('./utils/ipc-handlers');
const { existsSync } = require("node:fs");
const { autoUpdater } = require('electron-updater');

// 配置日志
log.transports.file.level = 'info';
log.info('应用启动');

// 配置自动更新日志
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('自动更新已配置');

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

// 自动更新相关函数
function setupAutoUpdater() {
  // 检查更新出错
  autoUpdater.on('error', (error) => {
    log.error('更新检查失败', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('checking-for-update');
    }
  });

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本', info);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-available', info);
    }

    // 可选：提示用户是否下载
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本: ${info.version}`,
      detail: '新版本正在后台下载，下载完成后将通知您安装',
      buttons: ['好的']
    });
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    log.info('当前已是最新版本', info);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  // 更新下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `下载速度: ${progressObj.bytesPerSecond} - 已下载 ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    log.info(logMessage);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    log.info('更新下载完成', info);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-downloaded', info);
    }

    // 提示用户是否立即安装
    dialog.showMessageBox({
      type: 'info',
      title: '安装更新',
      message: '更新下载完成',
      detail: '应用将关闭并安装更新，然后自动重启。',
      buttons: ['立即安装', '稍后安装']
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        // 用户同意立即更新，关闭后端服务并退出应用
        isAppQuitting = true;
        if (serverProcess) {
          stopSpringBootServer(serverProcess).then(() => {
            log.info('Spring Boot服务已关闭，准备安装更新');
            autoUpdater.quitAndInstall(false, true);
          }).catch((error) => {
            log.error('关闭Spring Boot服务失败', error);
            autoUpdater.quitAndInstall(false, true);
          });
        } else {
          autoUpdater.quitAndInstall(false, true);
        }
      }
    });
  });

  // 设置自动下载
  autoUpdater.autoDownload = true;

  // 开始检查更新
  if (app.isPackaged) {
    // 仅在打包环境下检查更新
    log.info('开始检查更新');
    autoUpdater.checkForUpdates();
  } else {
    log.info('开发环境下不检查更新');
  }
}

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
  try {
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
          if (app.isPackaged) {
            log.info('手动检查更新');
            autoUpdater.checkForUpdates();
          } else {
            dialog.showMessageBox({
              type: 'info',
              title: '开发模式',
              message: '开发模式下无法检查更新'
            });
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
  } catch (error) {
    log.error('创建系统托盘失败:', error);
    // 简化错误处理，不再创建空图标
    // 如果您想要一个更简单的备用方案，可以预先打包一个空图标文件
    dialog.showErrorBox('警告', '无法创建系统托盘图标，部分功能可能受限');
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

    // 设置系统托盘
    setupTray();

    // 设置自动更新
    setupAutoUpdater();

    // 定期检查更新 (每小时检查一次)
    setInterval(() => {
      if (app.isPackaged) {
        log.info('定期检查更新');
        autoUpdater.checkForUpdates();
      }
    }, 60 * 60 * 1000);

    // 添加IPC处理器处理前端请求
    ipcMain.handle('check-for-updates', () => {
      if (app.isPackaged) {
        log.info('前端请求检查更新');
        autoUpdater.checkForUpdates();
        return { checking: true };
      }
      return { checking: false, reason: 'In development mode' };
    });

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