# Task 02C-6｜getConsultantResources API 實作完成紀錄

## 一、任務背景

Task 02C 的目標，是將原本放在雲端共享資料夾中的顧問資源，逐步整合進「元馨醫管家」LIFF 顧問業務大廳。

本階段完成 Apps Script 後端 API：

```text
getConsultantResources
```

此 API 用於讓未來顧問業務大廳前端讀取：

```text
consultant_resources_顧問資源中心
```

並顯示顧問可使用的資源清單。

---

## 二、本階段完成項目

本次已完成：

1. 新增 `ConsultantResourceService.gs`
2. 新增 `getConsultantResourcesForPortal(lineUserId)`
3. 新增測試函式 `testGetConsultantResourcesForPortal()`
4. 修改 `Code.gs`
5. 新增 GET action：`getConsultantResources`
6. 新增 POST action：`getConsultantResources`
7. 新增 POST handler：`handleConsultantResourcesPost(payload)`
8. 部署新版 Apps Script Web App
9. 正式 Web App URL 測試成功

---

## 三、Apps Script 新增檔案

### 新增檔案

```text
ConsultantResourceService.gs
```

### 主要職責

此檔案負責：

* 讀取 `consultant_resources_顧問資源中心`
* 驗證 LINE 使用者是否為有效顧問
* 只回傳 `是否顯示 = 是` 的資源
* 依 `排序` 欄位由小到大排序
* 回傳顧問資源中心前端需要的白名單欄位

---

## 四、API Action

### GET 測試用 action

```text
getConsultantResources
```

測試格式：

```text
?action=getConsultantResources&lineUserId=Uxxxxxxxx
```

### POST 前端用 action

```json
{
  "action": "getConsultantResources",
  "lineAccessToken": "LINE LIFF access token"
}
```

正式前端建議使用 `lineAccessToken`，由後端驗證 LINE 身分後取得 `lineUserId`。

測試時可使用：

```json
{
  "action": "getConsultantResources",
  "lineUserId": "Uxxxxxxxx"
}
```

---

## 五、正式 Web App 測試結果

正式 Web App URL 測試成功。

### 測試 action

```text
getConsultantResources
```

### 測試顧問

```text
HC0000｜元馨醫管家官方
```

### 測試結果

API 已成功回傳：

```json
{
  "status": "success",
  "success": true,
  "authorized": true,
  "consultant": {
    "consultantId": "HC0000",
    "consultantName": "元馨醫管家官方"
  },
  "resources": []
}
```

實際測試時，`resources` 已成功回傳 8 筆顧問資源資料。

---

## 六、目前回傳資源清單

目前 Google Sheet 已建立第一版 8 筆資源。

| 資源ID     | 分類   | 標題           | 權限類型 | 排序 |
| -------- | ---- | ------------ | ---- | -- |
| RS000001 | 行銷素材 | 推廣行銷素材｜顧問用   | 顧問限定 | 10 |
| RS000008 | 行銷素材 | 推廣行銷素材｜會員用   | 公開連結 | 15 |
| RS000002 | 常用話術 | 常用連結：合約與收款   | 顧問限定 | 20 |
| RS000003 | 獎金制度 | 獎金結算表        | 顧問限定 | 30 |
| RS000004 | 培訓中心 | 官方 LINE 教學影片 | 顧問限定 | 40 |
| RS000005 | 健康專欄 | 健康專欄文章       | 公開連結 | 50 |
| RS000006 | 重要公告 | 最新消息／公告事項    | 顧問限定 | 60 |
| RS000007 | 行銷素材 | 特約醫院健檢項目     | 公開連結 | 70 |

---

## 七、API 回傳欄位

每筆 resource 回傳欄位如下：

| API 欄位      | Google Sheet 欄位 | 說明                 |
| ----------- | --------------- | ------------------ |
| resourceId  | 資源ID            | 資源唯一編號             |
| category    | 分類              | 資源分類               |
| title       | 標題              | 顧問大廳顯示名稱           |
| description | 簡介              | 資源簡短說明             |
| fileUrl     | 檔案連結            | Google Drive 或其他連結 |
| type        | 資源類型            | 文件、圖片、影片、連結、文字     |
| visibility  | 是否顯示            | 是 / 否              |
| accessType  | 權限類型            | 顧問限定 / 公開連結        |
| sortOrder   | 排序              | 數字越小越前面            |
| updatedAt   | 最後更新時間          | 資源最後更新日期           |

---

## 八、安全原則

本階段 API 採用以下安全原則：

1. 不採信前端傳入的顧問ID。
2. 以 LINE 使用者 ID 查詢顧問身份。
3. 只有有效顧問可以取得資源清單。
4. 只回傳 `是否顯示 = 是` 的資源。
5. 不回傳 Google Sheet 整列原始資料。
6. 不回傳內部備註、建立人、最後更新人等內部管理欄位。
7. 顧問限定與公開連結由 `權限類型` 欄位標記，前端未來可依此顯示提醒。

---

## 九、本階段不做的事情

本階段只完成後端 API，不進行以下事項：

* 不修改 LINE 官方帳號「啟動業務大廳」入口
* 不修改 LIFF Endpoint URL
* 不修改前端顧問業務大廳畫面
* 不改一般會員入口
* 不移除既有雲端共享資料夾
* 不自動變更 Google Drive 權限
* 不實作前端資源中心 UI
* 不實作顧問資源點擊追蹤

---

## 十、驗收結果

本階段驗收結果：

* [x] `ConsultantResourceService.gs` 已新增
* [x] `getConsultantResourcesForPortal(lineUserId)` 已可正常執行
* [x] `testGetConsultantResourcesForPortal()` 測試成功
* [x] `Code.gs` 已加入 GET action：`getConsultantResources`
* [x] `Code.gs` 已加入 POST action：`getConsultantResources`
* [x] Apps Script Web App 已部署新版
* [x] 正式 Web App URL 測試成功
* [x] API 成功回傳官方顧問 `HC0000`
* [x] API 成功回傳 8 筆資源資料
* [x] 未修改 LINE 官方帳號入口
* [x] 未修改前端畫面

---

## 十一、後續任務

下一步建議進入：

```text
Task 02C-7：顧問業務大廳前端新增「顧問資源中心」入口
```

初期前端目標：

* 在顧問業務大廳新增「顧問資源中心」區塊
* 呼叫 `getConsultantResources`
* 顯示分類、標題、簡介、資源類型、權限類型
* 提供「開啟資源」按鈕
* 顧問限定資源顯示提醒文字
* 公開連結資源顯示可轉發提示
