package org.example.print.controller;

import lombok.extern.slf4j.Slf4j;
import org.example.print.service.UserAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@Slf4j
public class UserAuthController {

    @Autowired
    private UserAuthService userAuthService;

    /**
     * 处理登录请求
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        log.info("收到登录请求: {}", loginRequest.get("username"));

        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        if (username == null || password == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户名和密码不能为空");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = userAuthService.login(username, password);

        if (result != null) {
            result.put("success", true);
            return ResponseEntity.ok(result);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "登录失败，用户名或密码错误");
            return ResponseEntity.badRequest().body(response);
        }
    }


    /**
     * 登出
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        userAuthService.logout();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "已成功登出");

        return ResponseEntity.ok(response);
    }


    /**
     * 获取用户状态
     *
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("loggedIn", userAuthService.isLoggedIn());

        if (userAuthService.isLoggedIn()) {
            status.put("userId", userAuthService.getCurrentUserId());
            status.put("merchantId", userAuthService.getCurrentMerchantId());

            // 添加storeId到响应
            String storeId = userAuthService.getCurrentStoreId();
            status.put("storeId", storeId);

            log.info("返回用户状态 - userId: {}, merchantId: {}, storeId: {}",
                    userAuthService.getCurrentUserId(),
                    userAuthService.getCurrentMerchantId(),
                    storeId);
        }

        return ResponseEntity.ok(status);
    }

}
