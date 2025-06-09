package org.example.print.service;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.example.print.bean.PrintTask;
import org.example.print.bean.PrintTaskStatus;
import org.example.print.component.PrintMetrics;
import org.example.print.component.PrintTaskPersistence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.print.*;
import javax.print.attribute.Attribute;
import javax.print.attribute.AttributeSet;
import javax.print.attribute.standard.PrinterState;
import javax.print.attribute.standard.PrinterStateReason;
import javax.print.attribute.standard.PrinterStateReasons;
import javax.print.attribute.standard.Severity;
import javax.print.event.PrintJobAdapter;
import javax.print.event.PrintJobEvent;
import javax.print.event.PrintJobListener;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.print.PageFormat;
import java.awt.print.Printable;
import java.awt.print.PrinterException;
import javax.swing.JTextArea;
import javax.swing.JPanel;
import javax.swing.UIManager;

@Service
@Slf4j
public class UnifiedPrintService {

    @Value("${print.max-retry:3}")
    private int maxRetry;


    @Value("${print.printer-name}")
    private String configuredPrinterName;

    @Autowired
    private PrintMetrics printMetrics;

    @Autowired
    private PrintTaskPersistence printTaskPersistence;


    @Value("${print.qrcode-path:static/qrcode.jpg}")
    private String qrcodePath;

    //模拟打印
    @Value("${print.test-mode:false}")
    private boolean testMode;

    @Autowired
    private org.springframework.core.io.ResourceLoader resourceLoader;

    // 获取所有打印机
    public List<PrintService> getAllPrinters() {
        return Arrays.asList(PrintServiceLookup.lookupPrintServices(null, null));
    }

    // 根据名称获取打印机
    public PrintService getPrinterByName(String printerName) {
        String targetPrinter = printerName;
        if (targetPrinter == null || targetPrinter.trim().isEmpty()) {
            targetPrinter = configuredPrinterName;
        }

        PrintService[] services = PrintServiceLookup.lookupPrintServices(null, null);
        if (services == null || services.length == 0) {
            log.error("当前进程无法访问打印服务");
            log.error("当前进程用户: " + System.getProperty("user.name"));
            log.error("当前进程路径: " + System.getProperty("user.dir"));
            return null;
        }

        // 打印所有可用打印机，帮助排查
        log.info("系统中可用的打印机列表:");
        for (PrintService service : services) {
            log.info("打印机: {}", service.getName());
        }

        // 1. 首先尝试使用指定名称的打印机
        for (PrintService service : services) {
            if (service.getName().equals(targetPrinter)) {
                log.info("使用指定打印机: {}", service.getName());
                return service;
            }
        }

        // 2. 如果找不到指定打印机，尝试使用系统默认打印机
        PrintService defaultPrintService = PrintServiceLookup.lookupDefaultPrintService();
        if (defaultPrintService != null) {
            log.info("找不到指定打印机: {}, 使用系统默认打印机: {}",
                    targetPrinter, defaultPrintService.getName());
            return defaultPrintService;
        }

        // 3. 如果还是没有，使用第一个可用打印机
        if (services.length > 0) {
            log.info("找不到指定和默认打印机，使用第一个可用打印机: {}", services[0].getName());
            return services[0];
        }

        log.error("找不到任何可用打印机");
        return null;
    }

    // 执行打印任务
    public CompletableFuture<PrintResult> executePrint(PrintTask task) {
        return CompletableFuture.supplyAsync(() -> {
            try {


                if (testMode) {
                    // 将打印内容保存到文件而不是实际打印
                    saveToFile(task.getContent(), "print_test_" + task.getTaskId() + ".txt");
                    log.info("测试模式：打印内容已保存到文件");

                    // 更新任务状态
                    task.setStatus(PrintTaskStatus.COMPLETED);
                    printTaskPersistence.markTaskAsCompleted(task);
                    printMetrics.recordSuccess();

                    return new PrintResult(true, "测试模式打印成功");
                }


                if (!isPrinterReady(task.getPrinterName())) {
                    throw new PrinterNotAvailableException("打印机未就绪: " + task.getPrinterName());
                }

                PrintService printService = getPrinterByName(task.getPrinterName());
                if (printService == null) {
                    throw new PrinterNotAvailableException("找不到可用的打印机");
                }

                String formattedContent;

                // 尝试解析为JSON，如果失败则当作纯文本处理
                try {
                    JSONObject printData = JSONObject.parseObject(task.getContent());
                    formattedContent = formatPrintContent(printData);
                } catch (Exception e) {
                    // 如果不是JSON格式，直接使用内容
                    log.info("内容不是JSON格式，按纯文本处理");
                    formattedContent = task.getContent();
                }

                DocPrintJob job = printService.createPrintJob();

                // 检查打印机名称，如果是PDF打印机，则使用不同的打印方式
                if (printService.getName().toLowerCase().contains("pdf")) {
                    log.info("检测到PDF打印机，使用Printable接口进行打印");
                    // 为PDF打印机创建可打印内容
                    Printable printable = createPrintableForPdf(formattedContent);
                    Doc pdfDoc = new SimpleDoc(printable, DocFlavor.SERVICE_FORMATTED.PRINTABLE, null);
                    job.print(pdfDoc, null);
                } else {
                    log.info("使用物理打印机（ESC/POS）模式进行打印");
                    // 原始的物理打印机逻辑
                    // 1. 首先打印文本内容
                    Doc doc = new SimpleDoc(formattedContent.getBytes("GBK"),
                            DocFlavor.BYTE_ARRAY.AUTOSENSE,
                            null);


                    // 执行打印
                    job.print(doc, null);


                    // 2. 然后打印二维码图片
                    try {
                        org.springframework.core.io.Resource resource;
                        if (qrcodePath.startsWith("classpath:")) {
                            resource = resourceLoader.getResource(qrcodePath);
                        } else {
                            resource = resourceLoader.getResource("file:" + qrcodePath);
                        }

                        if (resource.exists()) {
                            log.info("二维码文件存在: {}", resource);
                            BufferedImage qrImage = ImageIO.read(resource.getInputStream());

                            //先打印对二维码的说明文字
                            StringBuilder imageDesc = new StringBuilder();
                            final String ESC = "\u001B";
                            final String ALIGN_CENTER = ESC + "a" + (char) 0x01;
                            final String NORMAL_SIZE = ESC + "!" + (char) 0x00;


                            imageDesc.append(ALIGN_CENTER)
                                    .append(NORMAL_SIZE)
                                    .append("扫描下方二维码，关注我们的小程序\n\n");


                            Doc desDoc = new SimpleDoc(imageDesc.toString().getBytes("GBK"), DocFlavor.BYTE_ARRAY.AUTOSENSE, null);
                            job.print(desDoc,null);

                            //打印图片
                            DocFlavor flavor = DocFlavor.SERVICE_FORMATTED.RENDERABLE_IMAGE;
                            Doc imageDoc = new SimpleDoc(qrImage, flavor, null);
                            job.print(imageDoc,null);

                            // 最后添加几行空白并切纸
                            Doc footerDoc = new SimpleDoc("\n\n\n\n\n".getBytes("GBK"),
                                    DocFlavor.BYTE_ARRAY.AUTOSENSE, null);
                            job.print(footerDoc, null);

                        }
                    }catch (Exception e){
                        log.error("打印二维码失败", e);
                    }
                }

                // 更新任务状态
                task.setStatus(PrintTaskStatus.COMPLETED);
                printTaskPersistence.markTaskAsCompleted(task);
                printMetrics.recordSuccess();

                return new PrintResult(true, "打印成功");
            } catch (Exception e) {
                task.setStatus(PrintTaskStatus.FAILED);
                printMetrics.recordFailure();
                log.error("打印失败: {}", task.getTaskId(), e);
                return new PrintResult(false, "打印失败: " + e.getMessage());
            }
        });
    }



    // 检查打印机状态
    public boolean isPrinterReady(String printerName) {
        try {
            PrintService printer = getPrinterByName(printerName);
            if (printer == null) {
                log.error("未找到打印机: {}", printerName);
                return false;
            }

            // 打印详细的属性信息
            AttributeSet attributes = printer.getAttributes();
            for (Attribute attr : attributes.toArray()) {
                log.info("打印机属性: {} = {}", attr.getName(), attributes.get(attr.getClass()));
            }

            PrinterState printerState = printer.getAttribute(PrinterState.class);
            PrinterStateReasons stateReasons = printer.getAttribute(PrinterStateReasons.class);

            if (printerState == null) {
                log.warn("无法获取打印机状态，假定打印机可用");
                return true;
            }

            if (stateReasons != null && !stateReasons.isEmpty()) {
                for (PrinterStateReason reason : stateReasons.keySet()) {
                    if (stateReasons.get(reason) == Severity.ERROR) {
                        log.error("打印机错误: {}", reason);
                        return false;
                    }
                }
            }

            return true;
        } catch (Exception e) {
            log.error("检查打印机状态时发生错误", e);
            return false;
        }
    }

    // 格式化打印内容
    private String formatPrintContent(JSONObject data) {
        StringBuilder content = new StringBuilder();

        // ESC/POS 指令常量
        final String ESC = "\u001B";
        final String GS = "\u001D";

        // 字体大小控制 - 修改这些指令
        final String SMALL_SIZE = ESC + "!" + (char) 0x01;     // 小号字体
        final String NORMAL_SIZE = ESC + "!" + (char) 0x00;    // 正常大小
        final String L_SIZE = ESC + "!" + (char) 0x02;    // 正常大小
        final String LARGE_SIZE = ESC + "!" + (char) 0x11;     // 稍大一点(加粗+小号)
        final String DOUBLE_HEIGHT = ESC + "!" + (char) 0x10;  // 双倍高度
        final String DOUBLE_WIDTH = ESC + "!" + (char) 0x20;   // 双倍宽度
        final String DOUBLE_SIZE = ESC + "!" + (char) 0x30;    // 双倍大小(宽+高)
        // 对齐方式控制
        final String ALIGN_LEFT = ESC + "a" + (char) 0x00;     // 左对齐
        final String ALIGN_CENTER = ESC + "a" + (char) 0x01;   // 居中对齐
        final String ALIGN_RIGHT = ESC + "a" + (char) 0x02;    // 右对齐
        // 分隔线
        final String DIVIDER = "--------------------------------\n";

        // 获取商品数组，兼容旧版本数据格式
        JSONArray goodsItems;
        if (data.containsKey("goodsItems")) {
            goodsItems = data.getJSONArray("goodsItems");
        } else {
            goodsItems = new JSONArray();
        }

        // 计算商品总数量
        int totalQty = 0;
        for (int i = 0; i < goodsItems.size(); i++) {
            JSONObject item = goodsItems.getJSONObject(i);
            totalQty += item.getIntValue("sell_num", 0);
        }

        // 判断订单类型（线上/线下）
        boolean isOnline = data.getIntValue("type", 1) == 1; // 默认为线上

        // 判断配送类型
        int pickupType = data.getIntValue("pickup_type", 0); // 默认为配送
        String deliveryType = pickupType == 0 ? "配送单" : "自提单";

        // 打印两份联单：商家联和用户联
        for (int i = 0; i < 2; i++) {
            boolean isMerchantCopy = (i == 0); // 第一份是商家联，第二份是用户联

            // 1. 标题 - 指尖赤壁（居中，大字体）
            content.append(ALIGN_CENTER)
                    .append(DOUBLE_SIZE)
                    .append("指尖赤壁\n")
                    .append(NORMAL_SIZE)
                    .append(DIVIDER);


            // 2. 联单类型（左：商家联/用户联，右：动态单据类型）
            // 修改：使用新增的 bill_type 字段，而不是固定的判断逻辑
            String billType = data.containsKey("bill_type") ? data.getString("bill_type") : "配送单";
            content.append(ALIGN_CENTER)
                    .append(LARGE_SIZE)
                    .append(String.format("%-20s%s", isMerchantCopy ? "商家联" : "用户联", billType))
                    .append("\n");

            // 3. 商家名称（居中）
            content.append(ALIGN_CENTER)
                    .append(SMALL_SIZE)
                    .append(data.containsKey("merchant") ? data.getString("merchant") : "指尖赤壁")
                    .append("\n")
                    .append(SMALL_SIZE);

            // 4. 当日第几单
            content.append(ALIGN_LEFT)
                    .append("#")
                    .append(data.containsKey("day_index") ? data.getString("day_index") : "")
                    .append("\n")
                    .append(DIVIDER);

            // 5. 商品列表头部
            content.append(ALIGN_LEFT)
                    .append(SMALL_SIZE)
                    .append(formatTableRow("商品", "数量", "单价", "小计"))
                    .append("\n");


            // 商品明细 - 修改为两行显示
            double totalAmount = 0;
            for (int j = 0; j < goodsItems.size(); j++) {
                JSONObject item = goodsItems.getJSONObject(j);
                String goodsName = item.containsKey("goods_name") ? item.getString("goods_name") : "";
                String goodsCode = item.containsKey("goods_code") ? item.getString("goods_code") : "";
                int qty = item.getIntValue("sell_num", 0);
                double price = item.containsKey("sell_price") ? item.getDoubleValue("sell_price") : 0;
                double subtotal = item.containsKey("sell_subtotal") ? item.getDoubleValue("sell_subtotal") : 0;
                totalAmount += subtotal;

                // 商品名称单独一行，不再截断
                content.append(ALIGN_LEFT)
                        .append(NORMAL_SIZE)  // 恢复正常字体显示商品名
                        .append(goodsName)
                        .append("\n");

                // 新增：如果是餐饮商品，显示规格信息
                boolean isFood = item.getBooleanValue("is_food", false);
                if (isFood && item.containsKey("spec_text")) {
                    String specText = item.getString("spec_text");
                    if (specText != null && !specText.trim().isEmpty()) {
                        content.append(ALIGN_LEFT)
                                .append(SMALL_SIZE)  // 使用小号字体显示规格
                                .append(specText)
                                .append("\n");
                    }
                }

                // 商品详细信息行，使用专门的对齐方法
                content.append(ALIGN_LEFT)
                        .append(SMALL_SIZE)  // 使用与表头相同的小号字体
                        .append(formatTableRow(goodsCode, String.valueOf(qty), String.valueOf(price), String.valueOf(subtotal)))
                        .append("\n");
            }


            // 6. 原价和数量
            content.append(ALIGN_LEFT)
                    .append(String.format("%-20s%s", "总计: ￥" + String.format("%.2f", data.containsKey("goods_price") ? data.getDoubleValue("goods_price") : 0),
                            "总数: " + totalQty))
                    .append("\n");


            // 7. 运费和优惠
            double discount = (data.containsKey("all_money") ? data.getDoubleValue("all_money") : 0)
                    - (data.containsKey("pay_money") ? data.getDoubleValue("pay_money") : 0);
            //content.append(ALIGN_LEFT)
            //        .append(String.format("%-20s%s",
            //                "优惠: ￥" + String.format("%.2f", discount),
            //                "运费: ￥" + String.format("%.2f", data.containsKey("delivery_fee") ? data.getDoubleValue("delivery_fee") : 0)))
            //        .append("\n");

            content.append(ALIGN_LEFT).append("运费: ￥").append(data.containsKey("delivery_fee") ? data.getDoubleValue("delivery_fee") : 0)
                    .append("\n");

            //打包费
            content.append(ALIGN_LEFT).append("打包费: ￥").append(data.containsKey("pack_fee") ? data.getDoubleValue("pack_fee") : 0)
                    .append("\n");

            content.append(ALIGN_LEFT).append("优惠: ￥").append(discount)
                    .append("\n");

            // 8. 应收，实付金额
            content.append(ALIGN_LEFT)
                    .append(String.format("%-20s%s", "应收: ￥" + (data.containsKey("all_money") ? data.getDoubleValue("all_money") : 0),
                            "实收: ￥" + (data.containsKey("pay_money") ? data.getDoubleValue("pay_money") : 0)))
                    .append("\n")
                    .append(DIVIDER);



            // 9. 线上或线下
            content.append(isOnline ? "线上订单" : "线下订单")
                    .append("\n");

            // 订单其他信息
            content.append("订单号: ")
                    .append(data.containsKey("orderNo") ? data.getString("orderNo") : "")
                    .append("\n");

            // 支付方式
            int payType = data.getIntValue("pay_type", 0);
            String payMethod = "未知";
            if (payType == 1) payMethod = "微信小程序";
            else if (payType == 2) payMethod = "余额支付";

            content.append("支付方式: ")
                    .append(payMethod)
                    .append("\n");

            // 支付时间
            content.append("支付时间: ")
                    .append(data.containsKey("orderTime") ? data.getString("orderTime") : "")
                    .append("\n")
                    .append(DIVIDER);

            String name = data.containsKey("user_name") ? data.getString("user_name") : "";
            String phone = data.containsKey("user_phone") ? data.getString("user_phone") : "";
            // 如果是配送单，添加收货信息
            if (pickupType == 0 && data.containsKey("user_name")) {
                content.append("收货人: ")
                        .append(name.isEmpty() ? "**" : name.charAt(0) + "**")
                        .append("\n");
                content.append("电话: ")
                        .append(phone.isEmpty() ? "**" : phone.substring(0, 3) + "****" + phone.substring(7))
                        .append("\n");
                content.append("地址: ")
                        .append(data.containsKey("user_address") ? data.getString("user_address") : "")
                        .append("\n");
            }

            // 备注信息
            if (data.containsKey("remark") && !(data.containsKey("remark") ? data.getString("remark") : "").isEmpty()) {
                content.append("备注: ")
                        .append(data.containsKey("remark") ? data.getString("remark") : "")
                        .append("\n");
            }

            // 修改：根据 show_schedule_time 和 bill_type 来决定时间显示
            boolean showScheduleTime = data.getBooleanValue("show_schedule_time", false);
            if (showScheduleTime && data.containsKey("delivery_time") &&
                    !data.getString("delivery_time").isEmpty()) {

                String timeLabel;
                String currentBillType = data.containsKey("bill_type") ? data.getString("bill_type") : "配送单";

                // 根据单据类型确定时间标签
                if ("自提单".equals(currentBillType)) {
                    timeLabel = "自提时间";
                } else if ("预约单".equals(currentBillType)) {
                    timeLabel = "预约时间";
                } else {
                    timeLabel = "配送时间"; // 默认
                }

                content.append(timeLabel + ": ")
                        .append(data.getString("delivery_time"))
                        .append("\n");
            }


            // 添加打印时间
            content.append("打印时间: ")
                    .append(getCurrentTime())
                    .append("\n\n\n");


            // 添加切纸或足够的空行以便手撕
            if (i == 0) { // 第一联结束，添加更多空行作为两联之间的间隔
                content.append("\n\n\n\n\n");
            } else {
                content.append("\n\n");
            }
        }

        return content.toString();
    }


    // 获取当前时间
    private String getCurrentTime() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    // 计算字符串在热敏打印机上的显示宽度（中文字符占2个单位，英文字符占1个单位）
    private int getDisplayWidth(String str) {
        if (str == null) return 0;
        int width = 0;
        for (char c : str.toCharArray()) {
            if (c >= 0x4E00 && c <= 0x9FFF) { // 中文字符范围
                width += 2;
            } else {
                width += 1;
            }
        }
        return width;
    }

    // 格式化表格行，确保列对齐
    private String formatTableRow(String col1, String col2, String col3, String col4) {
        // 定义每列的显示宽度（以英文字符为单位）
        int[] columnWidths = {12, 4, 6, 6}; // "商品", "数量", "单价", "小计"
        
        StringBuilder row = new StringBuilder();
        String[] columns = {col1, col2, col3, col4};
        
        for (int i = 0; i < columns.length; i++) {
            String column = columns[i] != null ? columns[i] : "";
            int currentWidth = getDisplayWidth(column);
            int targetWidth = columnWidths[i];
            
            // 添加列内容
            row.append(column);
            
            // 添加空格来达到目标宽度
            int spacesToAdd = targetWidth - currentWidth;
            if (spacesToAdd > 0) {
                for (int j = 0; j < spacesToAdd; j++) {
                    row.append(" ");
                }
            }
            
            // 列之间添加一个空格分隔
            if (i < columns.length - 1) {
                row.append(" ");
            }
        }
        
        return row.toString();
    }


    // 打印结果类
    public static class PrintResult {
        private final boolean success;
        private final String message;

        public PrintResult(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }
    }

    // 自定义异常
    public static class PrinterNotAvailableException extends RuntimeException {
        public PrinterNotAvailableException(String message) {
            super(message);
        }
    }


    private void saveToFile(String content, String fileName) {
        try {
            // 确保保存目录存在
            File dir = new File("print_tests");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // 创建文件并写入内容
            File file = new File(dir, fileName);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(content.getBytes(StandardCharsets.UTF_8));
            }

            log.info("已将打印内容保存到文件: {}", file.getAbsolutePath());
        } catch (IOException e) {
            log.error("保存打印内容到文件失败", e);
        }
    }

    private Printable createPrintableForPdf(String content) {
        return (graphics, pageFormat, pageIndex) -> {
            if (pageIndex > 0) {
                return Printable.NO_SUCH_PAGE;
            }

            try {
                // 使用跨平台的逻辑字体
                UIManager.setLookAndFeel(UIManager.getCrossPlatformLookAndFeelClassName());
            } catch (Exception e) {
                log.warn("设置跨平台外观失败", e);
            }

            Graphics2D g2d = (Graphics2D) graphics;
            g2d.translate(pageFormat.getImageableX(), pageFormat.getImageableY());

            // 设置字体，使用逻辑字体以保证在不同系统上都可用
            g2d.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 10));

            // 使用JTextArea来处理自动换行
            JTextArea textArea = new JTextArea(content);
            textArea.setFont(g2d.getFont());
            textArea.setLineWrap(true);
            textArea.setWrapStyleWord(true);
            textArea.setSize((int) pageFormat.getImageableWidth(), Integer.MAX_VALUE);
            
            // 将JTextArea内容绘制到Graphics对象上
            JPanel panel = new JPanel();
            panel.add(textArea);
            panel.setSize((int) pageFormat.getImageableWidth(), (int) pageFormat.getImageableHeight());
            panel.validate();
            textArea.paint(g2d);

            return Printable.PAGE_EXISTS;
        };
    }

}
