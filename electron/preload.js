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

  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),


  // 监听更新进度
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },

  // 移除更新进度监听
  removeUpdateProgressListener: () => {
    ipcRenderer.removeAllListeners('update-progress');
  }


});