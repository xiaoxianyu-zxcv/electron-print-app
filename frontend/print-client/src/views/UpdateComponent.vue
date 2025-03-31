<template>
  <div class="update-container">
    <el-card v-if="updateStatus !== 'idle'" class="update-card">
      <template #header>
        <div class="card-header">
          <span>软件更新</span>
        </div>
      </template>

      <div class="update-content">
        <!-- 检查更新中 -->
        <div v-if="updateStatus === 'checking'">
          <el-icon class="checking-icon"><Loading /></el-icon>
          <p>正在检查更新...</p>
        </div>

        <!-- 有可用更新 -->
        <div v-if="updateStatus === 'available'">
          <el-icon class="available-icon"><Connection /></el-icon>
          <p>发现新版本: {{ updateInfo.version }}</p>
          <p class="update-notes" v-if="updateInfo.releaseNotes">
            更新说明:
            <span v-html="updateInfo.releaseNotes"></span>
          </p>
          <el-progress
              v-if="downloadProgress > 0"
              :percentage="downloadProgress"
              :format="progressFormat"
              status="success" />
        </div>

        <!-- 更新已下载 -->
        <div v-if="updateStatus === 'downloaded'">
          <el-icon class="downloaded-icon"><SuccessFilled /></el-icon>
          <p>更新已下载完成，将在下次启动时安装</p>
          <el-button type="primary" @click="restartAndInstall">立即重启并安装</el-button>
        </div>

        <!-- 无可用更新 -->
        <div v-if="updateStatus === 'not-available'">
          <el-icon class="not-available-icon"><CircleCheckFilled /></el-icon>
          <p>当前已是最新版本</p>
        </div>

        <!-- 更新错误 -->
        <div v-if="updateStatus === 'error'">
          <el-icon class="error-icon"><WarningFilled /></el-icon>
          <p>更新检查失败: {{ errorMessage }}</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Loading, Connection, SuccessFilled, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue';

// 更新状态
const updateStatus = ref('idle');  // idle, checking, available, downloaded, not-available, error
const updateInfo = ref({});
const downloadProgress = ref(0);
const errorMessage = ref('');

// 检查是否在Electron环境中
const isElectron = window.electronAPI !== undefined;

// 格式化下载进度
const progressFormat = (percentage) => {
  return `${percentage.toFixed(1)}%`;
};

// 重启并安装更新
const restartAndInstall = () => {
  ElMessageBox.confirm(
      '应用将关闭并安装更新，然后自动重启。',
      '立即更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
  ).then(() => {
    // 这里实际上不需要做什么，因为点击确定后，主进程会处理安装和重启
  }).catch(() => {
    // 用户取消了操作
  });
};

// 手动检查更新
const checkForUpdates = async () => {
  if (!isElectron) return;

  updateStatus.value = 'checking';

  try {
    await window.electronAPI.update.checkForUpdates();
  } catch (error) {
    updateStatus.value = 'error';
    errorMessage.value = error.message || '检查更新失败';
  }
};

// 监听更新事件
onMounted(() => {
  if (!isElectron) return;

  // 检查更新中
  window.electronAPI.update.onUpdateChecking(() => {
    updateStatus.value = 'checking';
  });

  // 有可用更新
  window.electronAPI.update.onUpdateAvailable((info) => {
    updateStatus.value = 'available';
    updateInfo.value = info;
  });

  // 无可用更新
  window.electronAPI.update.onUpdateNotAvailable(() => {
    updateStatus.value = 'not-available';
    setTimeout(() => {
      updateStatus.value = 'idle';
    }, 3000);
  });

  // 更新下载进度
  window.electronAPI.update.onDownloadProgress((progressObj) => {
    downloadProgress.value = progressObj.percent || 0;
  });

  // 更新已下载
  window.electronAPI.update.onUpdateDownloaded((info) => {
    updateStatus.value = 'downloaded';
    updateInfo.value = info;
  });

  // 更新错误
  window.electronAPI.update.onUpdateError((error) => {
    updateStatus.value = 'error';
    errorMessage.value = error;
  });
});

// 导出方法供父组件调用
defineExpose({
  checkForUpdates
});
</script>

<style scoped>
.update-container {
  margin-bottom: 20px;
}

.update-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-content {
  text-align: center;
  padding: 20px 0;
}

.checking-icon,
.available-icon,
.downloaded-icon,
.not-available-icon,
.error-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.checking-icon {
  color: #909399;
  animation: rotate 2s linear infinite;
}

.available-icon {
  color: #409EFF;
}

.downloaded-icon {
  color: #67C23A;
}

.not-available-icon {
  color: #67C23A;
}

.error-icon {
  color: #F56C6C;
}

.update-notes {
  margin: 10px 0;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  text-align: left;
  max-height: 100px;
  overflow-y: auto;
  font-size: 14px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>