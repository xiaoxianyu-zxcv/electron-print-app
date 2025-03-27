package org.example.print.controller;

import lombok.extern.slf4j.Slf4j;
import org.example.print.bean.PrintTask;
import org.example.print.bean.PrintTaskStatus;
import org.example.print.component.PrintQueueManager;
import org.example.print.service.PrintTaskNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 打印消息控制器
 * 处理WebSocket/STOMP消息通信
 */
@Controller
@Slf4j
public class PrintMessageController {

    private final PrintQueueManager printQueueManager;
    private final PrintTaskNotificationService notificationService;

    @Autowired
    public PrintMessageController(
            PrintQueueManager printQueueManager,
            PrintTaskNotificationService notificationService) {
        this.printQueueManager = printQueueManager;
        this.notificationService = notificationService;
    }

    /**
     * 处理客户端发送的打印请求
     * 客户端发送到 /app/print
     */
    @MessageMapping("/print")
    @SendTo("/topic/print-status")
    public Map<String, Object> handlePrintRequest(Map<String, Object> printRequest) {
        String content = (String) printRequest.getOrDefault("content", "");
        String printerName = (String) printRequest.getOrDefault("printerName", null);

        log.info("收到WebSocket打印请求: {}", content);

        try {
            // 创建打印任务
            PrintTask task = PrintTask.builder()
                    .taskId(UUID.randomUUID().toString())
                    .content(content)
                    .status(PrintTaskStatus.PENDING)
                    .createTime(LocalDateTime.now())
                    .retryCount(0)
                    .printerName(printerName)
                    .build();

            // 添加到打印队列
            printQueueManager.addPrintTask(task);

            // 返回成功响应
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "打印请求已接收");
            response.put("taskId", task.getTaskId());
            return response;

        } catch (Exception e) {
            log.error("处理打印请求失败", e);

            // 返回错误响应
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "处理打印请求失败: " + e.getMessage());
            return response;
        }
    }

    /**
     * 处理心跳请求
     */
    @MessageMapping("/heartbeat")
    @SendTo("/topic/heartbeat")
    public Map<String, Object> handleHeartbeat() {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}
