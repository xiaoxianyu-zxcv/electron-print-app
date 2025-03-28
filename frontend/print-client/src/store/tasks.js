import { defineStore } from 'pinia'
import { fetchPendingTasks, addPrintTask } from '../services/api'

export const useTaskStore = defineStore('tasks', {
    state: () => ({
        tasks: [],
        isLoading: false,
        error: null,
        queueStats: {
            totalTasks: 0,
            pendingTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            successRate: 0
        }
    }),

    getters: {
        // 按状态筛选任务
        pendingTasks: (state) => state.tasks.filter(task => task.status === 'PENDING'),
        printingTasks: (state) => state.tasks.filter(task => task.status === 'PRINTING'),
        completedTasks: (state) => state.tasks.filter(task => task.status === 'COMPLETED'),
        failedTasks: (state) => state.tasks.filter(task => task.status === 'FAILED'),

        // 获取所有任务数量
        taskCount: (state) => state.tasks.length
    },

    actions: {
        // 加载待处理任务
        async loadPendingTasks() {
            this.isLoading = true
            this.error = null

            try {
                const tasks = await fetchPendingTasks()
                this.tasks = tasks
                this.updateQueueStats()
            } catch (error) {
                this.error = error.message || '加载任务失败'
                console.error('加载任务失败', error)
            } finally {
                this.isLoading = false
            }
        },

        // 添加打印任务
        async addTask(task) {
            this.isLoading = true
            this.error = null

            try {
                const result = await addPrintTask(task)
                this.tasks.unshift(result) // 添加到任务列表开头
                this.updateQueueStats()
                return result
            } catch (error) {
                this.error = error.message || '添加任务失败'
                console.error('添加任务失败', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        // 更新任务状态
        updateTaskStatus(taskId, status) {
            const task = this.tasks.find(t => t.taskId === taskId)
            if (task) {
                task.status = status
                this.updateQueueStats()
            }
        },

        // 添加从WebSocket收到的任务
        addOrUpdateTask(task) {
            const existingTask = this.tasks.find(t => t.taskId === task.taskId)

            if (existingTask) {
                // 更新现有任务
                Object.assign(existingTask, task)
            } else {
                // 添加新任务
                this.tasks.unshift(task)
            }

            this.updateQueueStats()
        },

        // 更新队列统计信息
        updateQueueStats() {
            const totalTasks = this.tasks.length
            const pendingTasks = this.pendingTasks.length
            const printingTasks = this.printingTasks.length
            const completedTasks = this.completedTasks.length
            const failedTasks = this.failedTasks.length

            const successRate = totalTasks > 0
                ? (completedTasks / totalTasks * 100).toFixed(1)
                : 0

            this.queueStats = {
                totalTasks,
                pendingTasks,
                printingTasks,
                completedTasks,
                failedTasks,
                successRate
            }
        }
    }
})