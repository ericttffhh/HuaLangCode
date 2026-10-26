# 華語 (HuaLang) - 獨立高階程式語言 (.chine) 暨完整編譯工具鏈

> **語言定位**：獨立高階程式語言  
> **專屬副檔名**：`.chine`  
> **核心工具鏈架構**：自研編譯器 (Compiler) ➔ 組譯器 (Assembler) ➔ 連結器 (Linker) ➔ HuaVM 堆疊虛擬機 / 原生 ARM64 機械語言

---

## 🧩 VS Code 專屬官方擴充套件 (VSCode Extension)

我們已將華語完整打包為 VS Code 擴充套件，並已**自動安裝至您的本機 VS Code** (`~/.vscode/extensions/hualang.chine-lang-1.0.0`)！

同時於專案根目錄提供離線安裝包：  
📦 **`chine-lang-1.0.0.vsix`**

### 🎨 VS Code 功能特色：
1. **完整中文化語法高亮**：自動識別 `.chine` 檔案，支援關鍵字、字串、運算子、內建庫與全形標點符號。
2. **編輯器右上角 ▶「一鍵執行」按鈕**：在 VS Code 打開任何 `.chine` 檔案，右上角會出現綠色執行按鈕，點擊立即在下方終端機運行！
3. **快捷鍵支援**：按 `Cmd + F5`（Windows/Linux 為 `Ctrl + F5`）直接執行當前檔案。
4. **右鍵選單指令**：
   - ▶ **執行華語程式**
   - ⚡ **編譯為原生 ARM64 機械語言並執行**（直接生成真實 CPU 機械碼執行檔）
   - 📄 **編譯為華語組合語言 (.casm)**（並排檢視組譯代碼）
   - 🌐 **開啟海龜繪圖可視化 Web IDE**
5. **智慧程式碼片段補全 (Snippets)**：
   - 輸入 `設` ➔ 自動展開變數宣告模板
   - 輸入 `若` ➔ 自動展開條件分支模板
   - 輸入 `從` ➔ 自動展開計數迴圈模板
   - 輸入 `函式` ➔ 自動展開函式定義模板
   - 輸入 `海龜` ➔ 自動展開繪圖範本

---

## 🏗️ 雙軌編譯與機械語言執行管線

華語支援兩種完整的編譯執行途徑：

### 途徑 A：真實硬體 ARM64 組合語言 ➔ 原生機械語言 (Native Machine Code)
```text
[原始碼] .chine 
    ➔ (ARM64 編譯器) ➔ [真實組合語言] .s 
    ➔ (原生組譯器 as) ➔ [Mach-O 目標檔] .o 
    ➔ (原生連結器 ld) ➔ [原生二進位機械語言執行檔] ./a.out 
    ➔ 電腦 CPU 核心直接執行！
```

### 途徑 B：自研 HuaVM Bytecode 工具鏈
```text
[原始碼] .chine 
    ➔ (編譯器 Compiler) ➔ [華語組合語言] .casm 
    ➔ (組譯器 Assembler) ➔ [目標檔] .cobj 
    ➔ (連結器 Linker) ➔ [可執行檔] .cbinary 
    ➔ HuaVM 堆疊虛擬機高效率執行！
```

---

## 💻 命令列 CLI 使用說明

本專案提供命令列工具 [`bin/chine.js`](file:///Users/test/Desktop/chinese%20code/bin/chine.js)：

```bash
# 1. 直接執行 .chine 檔案
node bin/chine.js run 範例.chine

# 2. 編譯為華語組語 (.casm)
node bin/chine.js compile 範例.chine -o 範例.casm

# 3. 組譯為目標檔 (.cobj)
node bin/chine.js assemble 範例.casm -o 範例.cobj

# 4. 連結為可執行檔 (.cbinary)
node bin/chine.js link 範例.cobj -o 範例.cbinary

# 5. 編譯為真實 ARM64 組合語言並組譯為原生機械語言執行檔：
node test-native-binary.js
```

---

## 🌐 網頁版雲端 IDE

本地 Web IDE 伺服器目前運作於：
👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

包含海龜繪圖、音效合成、變數即時監控、AST 語法樹、組合語言檢視與 JavaScript 雙向轉譯。
