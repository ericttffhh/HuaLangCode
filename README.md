# 華語 (HuaLang) - 獨立高階程式語言 (.chine) 暨自然語言意圖編譯器

> **語言定位**：獨立高階程式語言 ＆ 一句話自然語言意圖編譯  
> **專屬副檔名**：`.chine`  
> **核心工具鏈**：意圖編譯器 (Intent Compiler) ➔ 高階原始碼 (.chine) ➔ 組合語言 (.casm / ARM64 .s) ➔ 目標檔 (.cobj) ➔ 執行檔 (.cbinary / Native Mach-O) ➔ HuaVM 堆疊虛擬機 / CPU 原生執行  
> **開源儲存庫**：[https://github.com/ericttffhh/HuaLangCode](https://github.com/ericttffhh/HuaLangCode)

---

## 🌟 重磅功能：一句話自然語言意圖編譯 (One-Sentence Intent Compiler)

只要在 Web IDE 頂部或命令列輸入**一句話描述你想做什麼**，華語意圖編譯器會自動分析語意，生成對應的 `.chine` 程式碼、編譯為二進位檔，並在右側「✨ 即時應用預覽」視窗直接掛載可互動的成果！

### 🎯 支援的意圖領域與範例：

1. **互動遊戲 (Canvas Games)**：
   - 語句：`「做一個貪食蛇遊戲」`
   - 生成：具備方向鍵控制、隨機食物生成、蛇身生長、碰撞判定與計分系統的即時畫布遊戲。
2. **現代響應式網頁 UI (Web App)**：
   - 語句：`「建立一個待辦事項網頁」`
   - 生成：支援輸入新增待辦、點擊劃線完成、刪除與本機狀態儲存的現代卡片式待辦清單。
3. **後端伺服器與 RESTful API (Backend Server)**：
   - 語句：`「建立一個RESTful API伺服器」`
   - 生成：支援路由分發（`/api/status`、`/api/users`）、JSON 回應、訪問計數與即時日誌主控台。
4. **互動式前端介面 (Interactive UI)**：
   - 語句：`「做一個點擊會變色的計數器網頁」`
   - 生成：具備漸層色彩切換、動態累加累減與重設功能的流暢 UI。

---

## 💻 命令列 CLI 使用方式

```bash
# 1. 一句話意圖編譯：直接生成貪食蛇遊戲
node bin/chine.js intent "做一個貪食蛇遊戲"

# 2. 直接在 HuaVM 虛擬機執行產生的程式
node bin/chine.js run 經典貪食蛇遊戲.chine

# 3. 意圖編譯 RESTful API 伺服器
node bin/chine.js intent "建立一個RESTful API伺服器"

# 4. 編譯為真實 ARM64 組合語言並組譯為原生二進位機械語言執行檔：
node test-native-binary.js
```

---

## 🌐 網頁版雲端 IDE (已在本地 3000 埠位運行)

訪問位址：👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

- **頂部意圖編譯列**：輸入一句話，點擊 `⚡ 編譯意圖`。
- **✨ 應用預覽面板**：直接在右側即時玩貪食蛇遊戲、點擊待辦清單、測試 API 伺服器。
- **終端機輸出**：同步顯示意圖剖析結果與 HuaVM 執行日誌。
- **編譯器組語 / 目標檔 / 執行檔面板**：即時查看生成的 `.casm`、`.cobj` 與 `.cbinary`。

---

## 🧩 VS Code 專屬擴充套件

擴充套件已為您自動安裝至 `~/.vscode/extensions/hualang.chine-lang-1.0.0`，並提供離線安裝包 `chine-lang-1.0.0.vsix`：
- 自動識別 `.chine` 檔案中文化語法高亮
- 右上角綠色 ▶「一鍵執行」按鈕 (快捷鍵 `Cmd+F5`)
- 右鍵選單支援「編譯為真實 ARM64 機械語言並執行」
