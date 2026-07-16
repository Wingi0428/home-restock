# 家用補貨提醒

一個可直接部署至 GitHub Pages 的純靜態網站，無須伺服器或資料庫。

## 功能

- 任意 ID 無密碼登入；不同 ID 的清單分開保存
- 內建「貓咪用品」與「消耗品」分類及範例項目
- 分類管理：新增自訂分類、選擇圖示與顏色、修改名稱、刪除空分類
- 新增、修改、刪除補貨項目
- 自訂補貨週期與下次購買日
- 一鍵 Reset，從今天重新開始倒數
- 保存 Coupang、Costco、全聯、蝦皮等常用購買連結
- 到期狀態、網站內提醒與瀏覽器通知
- 手機／平板／桌面響應式介面，可加入手機主畫面

> 資料使用瀏覽器 `localStorage`，只保存在目前裝置與瀏覽器。清除瀏覽器資料會一併清除清單；同一 ID 不會自動跨裝置同步。

## 舊版資料相容

升級部署不會清除既有 ID 或補貨清單。新版沿用原本的品項儲存鍵，第一次開啟時會為每個 ID 自動建立分類設定，並保留品項目前所屬的分類。修改分類名稱時，分類內的既有品項也會同步更新。

## GitHub Pages 部署

1. 在 GitHub 建立新的 repository。
2. 將此資料夾內的所有檔案（包含 `.github`）上傳至 repository 的 `main` 分支。
3. 到 repository 的 **Settings → Pages**。
4. 在 **Build and deployment** 的 Source 選擇 **GitHub Actions**。
5. 等待 `Deploy static site to Pages` workflow 完成，即可從 Pages 顯示的網址開啟。

也可以選擇 **Deploy from a branch**，指定 `main` 與 `/(root)`，本專案同樣可以直接運作。

## 本機預覽

不可直接雙擊測試通知與離線功能，請在此資料夾啟動任一靜態伺服器，例如：

```bash
python -m http.server 8080
```

再開啟 `http://localhost:8080`。
