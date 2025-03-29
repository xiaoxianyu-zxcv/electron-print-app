package org.example.print.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class UserAuthService {

    @Autowired
    private RemoteDataService remoteDataService;

    @Value("${remote.server.url:http://localhost:9090}")
    private String serverUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // 存储当前登录的用户信息
    private String userId;
    private String username;
    private String merchantId;

    /**
     * 用户登录
     */
    public Map<String, Object> login(String username, String password) {
        try {
            String url = serverUrl + "/api/user/login";

            // 创建登录请求
            Map<String, String> loginRequest = new HashMap<>();
            loginRequest.put("username", username);
            loginRequest.put("password", password);

            // 发送登录请求
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url,
                    loginRequest,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();

                // 保存用户信息
                this.userId = result.get("userId").toString();
                this.username = result.get("username").toString();
                this.merchantId = result.get("merchantId").toString();

                // 更新远程数据服务的用户信息
                remoteDataService.setUserInfo(this.userId, this.username, this.merchantId);

                log.info("用户登录成功: {}, 商户ID: {}", this.username, this.merchantId);

                return result;
            } else {
                log.warn("登录失败，服务器返回: {}", response.getStatusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("登录请求失败", e);
            return null;
        }
    }

    /**
     * 检查是否已登录
     */
    public boolean isLoggedIn() {
        return userId != null && merchantId != null;
    }

    /**
     * 获取当前商户ID
     */
    public String getCurrentMerchantId() {
        return merchantId;
    }

    /**
     * 获取当前用户ID
     */
    public String getCurrentUserId() {
        return userId;
    }

    /**
     * 登出
     */
    public void logout() {
        this.userId = null;
        this.username = null;
        this.merchantId = null;

        // 清除远程数据服务的用户信息
        remoteDataService.setUserInfo(null, null, null);

        log.info("用户已登出");
    }
}