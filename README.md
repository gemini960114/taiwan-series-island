# 龍象大戰 棒球島

2026 中華職棒台灣大賽「龍象大戰」（味全龍 vs 中信兄弟）的互動 3D 棒球島。

**線上版：** https://gemini960114.github.io/taiwan-series-island/

## 參考

版面與互動方式參考 [HEART 政策島](https://puma.taipei/heart-island)：一座低多邊形島嶼地圖、浮動名牌、時段切換和側邊索引清單。程式碼、3D 模型與內容都是另外製作的，主題換成棒球。

## 內容

- **3D 球場**：G4（10/21，臺北大巨蛋）兩隊的先發陣容，用動畫模擬投打、跑壘和全壘打煙火
- **啦啦隊**：小龍女與 Passion Sisters 全員，可點選查看資料
- **賽程**：G1–G7 比分、逐局比分和下一場開打倒數
- **應援曲**：自動播放進攻方的應援曲，攻守交換時切換
- **其他**：時段與颱風特效，以及手機版面與低／中／高畫質

場上的對戰是動畫模擬，不是真實的比賽過程。啦啦隊大頭圖是 AI 生成的風格化插畫，不是本人照片。

## 安裝與執行

需要 [Node.js](https://nodejs.org/) 20 以上。

```bash
npm install        # 安裝套件
npm run dev        # 開發模式，開啟 http://localhost:5173/
npm run build      # 建置正式版到 dist/
npm run preview    # 預覽建置結果
```

其他指令：

```bash
npm run images     # 從 art/cheer/ 的 PNG 原圖產生網頁用 WebP（原圖不在版本庫中）
npm run check      # 檢查啦啦隊名單、metadata、圖片，以及應援曲是否在 70 秒以內
```

推送到 `main` 時，GitHub Actions 會自動檢查、建置，再發布到 GitHub Pages（設定在 `.github/workflows/deploy.yml`）。

## 專案結構

```
index.html              頁面骨架
src/data.js             球隊、陣容、賽程、啦啦隊資料（要改內容從這裡改）
src/cheer-metadata.json 啦啦隊大頭圖對照表
src/                    3D 場景、比賽模擬、介面等程式模組
public/assets/          網頁用圖片與應援曲
scripts/                圖片產生與資料檢查腳本
```

## 資料來源

維基百科〈2026年台灣大賽〉、Yahoo 運動、自由時報、味全龍官網、NOWnews、TVBS、三立新聞。
