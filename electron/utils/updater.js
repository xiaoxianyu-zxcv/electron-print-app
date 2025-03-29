const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// 配置日志
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // 不自动下载，先询问用户

/**
 * 初始化自动更新
 * @param {BrowserWindow} mainWindow 主窗口实例
 */
function initAutoUpdater(mainWindow) {
    log.info('初始化自动更新模块');

    // 检查更新出错
    autoUpdater.on('error', (error) => {
        log.error('检查更新出错', error);
    });

    // 检查更新中
    autoUpdater.on('checking-for-update', () => {
        log.info('正在检查更新...');
    });

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
        log.info('发现新版本:', info.version);

        dialog.showMessageBox({
            type: 'info',
            title: '发现新版本',
            message: `发现新版本: ${info.version}`,
            detail: '是否现在下载更新？',
            buttons: ['下载', '稍后提醒我'],
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // 没有发现新版本
    autoUpdater.on('update-not-available', () => {
        log.info('当前已是最新版本');
    });

    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj) => {
        const progressPercent = Math.round(progressObj.percent);
        log.info(`下载进度: ${progressPercent}%`);

        // 发送下载进度到渲染进程
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-progress', {
                percent: progressPercent
            });
        }
    });

    // 更新下载完成
    autoUpdater.on('update-downloaded', () => {
        log.info('更新已下载完成，准备安装');

        dialog.showMessageBox({
            type: 'info',
            title: '安装更新',
            message: '更新已下载完成',
            detail: '应用将关闭并安装更新，之后会自动重启',
            buttons: ['立即安装', '稍后安装'],
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                // 退出并安装更新
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });
}

/**
 * 检查更新
 */
function checkForUpdates() {
    log.info('手动检查更新');
    autoUpdater.checkForUpdates().catch(err => {
        log.error('检查更新失败', err);
    });
}

module.exports = {
    initAutoUpdater,
    checkForUpdates
};