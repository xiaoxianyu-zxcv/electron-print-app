const { contextBridge, ipcRenderer } = require('electron');

// 在窗口对象上暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取Spring Boot服务端口
  getServerPort: () => ipcRenderer.invoke('get-server-port'),

  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // API请求代理
  apiRequest: (options) => ipcRenderer.invoke('api-request', options),

  // 检查服务状态
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),

  // 自动更新相关API
  update: {
    // 手动检查更新
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    // 监听更新事件
    onUpdateAvailable: (callback) =>
        ipcRenderer.on('update-available', (_, info) => callback(info)),

    onUpdateNotAvailable: (callback) =>
        ipcRenderer.on('update-not-available', () => callback()),

    onUpdateError: (callback) =>
        ipcRenderer.on('update-error', (_, error) => callback(error)),

    onUpdateDownloaded: (callback) =>
        ipcRenderer.on('update-downloaded', (_, info) => callback(info)),

    onDownloadProgress: (callback) =>
        ipcRenderer.on('download-progress', (_, progressObj) => callback(progressObj)),

    onUpdateChecking: (callback) =>
        ipcRenderer.on('checking-for-update', () => callback())
  }
});