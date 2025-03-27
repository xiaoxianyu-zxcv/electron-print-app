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
  checkServerStatus: () => ipcRenderer.invoke('check-server-status')
});