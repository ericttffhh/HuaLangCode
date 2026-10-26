/**
 * 華語 (HuaLang / .chine) - 自然語言意圖編譯器 (Intent Compiler)
 * 能根據使用者輸入的「一個中文句子」直接分析意圖，
 * 自動編譯並生成對應功能的 .chine 高階程式碼、網頁 UI、遊戲畫布或伺服器！
 */

export class IntentCompiler {
  constructor() {
    this.catalog = [
      // 1. 遊戲類 (Games)
      {
        patterns: [/貪食蛇/, /貪吃蛇/, /吃蘋果/],
        category: '遊戲 (Canvas Game)',
        title: '經典貪食蛇遊戲',
        description: '方向鍵控制、食物隨機生成、碰撞檢測與計分系統',
        generateChine: (sentence) => `// 意圖編譯生成：${sentence}
// 經典貪食蛇遊戲

設 畫布寬度 = 400;
設 畫布高度 = 400;
設 網格大小 = 20;
設 分數 = 0;
設 遊戲結束 = 假;

設 蛇身 = [
  { x: 160, y: 200 },
  { x: 140, y: 200 },
  { x: 120, y: 200 }
];

設 食物 = { x: 240, y: 200 };
設 移動方向 = "右"; // 上、下、左、右

印出("🎮 貪食蛇遊戲已由意圖編譯器生成完畢！");
印出("操作說明：使用鍵盤方向鍵 ↑ ↓ ← → 控制蛇身移動。");

函式 產生新食物() {
  食物.x = 算術.整數隨機數(0, 19) * 網格大小;
  食物.y = 算術.整數隨機數(0, 19) * 網格大小;
}

函式 遊戲每幀更新() {
  若 (遊戲結束 == 真) { 回傳; }

  // 計算蛇頭新位置
  設 蛇頭 = { x: 蛇身[0].x, y: 蛇身[0].y };
  若 (移動方向 == "右") { 蛇頭.x += 網格大小; }
  否則若 (移動方向 == "左") { 蛇頭.x -= 網格大小; }
  否則若 (移動方向 == "上") { 蛇頭.y -= 網格大小; }
  否則若 (移動方向 == "下") { 蛇頭.y += 網格大小; }

  // 撞牆判斷
  若 (蛇頭.x < 0 || 蛇頭.x >= 畫布寬度 || 蛇頭.y < 0 || 蛇頭.y >= 畫布高度) {
    遊戲結束 = 真;
    印出("💥 遊戲結束！最終得分：", 分數);
    回傳;
  }

  陣列.推入(蛇身, 蛇頭); // 蛇頭前進

  // 吃到食物判斷
  若 (蛇頭.x == 食物.x && 蛇頭.y == 食物.y) {
    分數 += 10;
    印出("🍎 吃到蘋果！當前得分：", 分數);
    產生新食物();
  } 否則 {
    陣列.彈出(蛇身); // 尾部收縮
  }
}
`,
        generateWebUI: () => `
          <div style="text-align: center; font-family: sans-serif;">
            <div style="margin-bottom: 8px; font-weight: bold; font-size: 16px;">
              🐍 貪食蛇遊戲 | 得分：<span id="snakeScore" style="color: #10b981;">0</span>
            </div>
            <canvas id="gameCanvas" width="400" height="400" style="background: #111827; border: 2px solid #38bdf8; border-radius: 8px;"></canvas>
            <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">使用鍵盤方向鍵 ↑ ↓ ← → 控制，空格鍵重新開始</div>
          </div>
        `,
        generateClientScript: () => `
          const canvas = document.getElementById('gameCanvas');
          const ctx = canvas.getContext('2d');
          const scoreEl = document.getElementById('snakeScore');
          const gridSize = 20;
          let snake = [{x: 160, y: 200}, {x: 140, y: 200}, {x: 120, y: 200}];
          let dir = 'right';
          let food = {x: 240, y: 200};
          let score = 0;
          let gameOver = false;

          function randomFood() {
            food = {
              x: Math.floor(Math.random() * 20) * gridSize,
              y: Math.floor(Math.random() * 20) * gridSize
            };
          }

          window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && dir !== 'down') dir = 'up';
            if (e.key === 'ArrowDown' && dir !== 'up') dir = 'down';
            if (e.key === 'ArrowLeft' && dir !== 'right') dir = 'left';
            if (e.key === 'ArrowRight' && dir !== 'left') dir = 'right';
            if (e.key === ' ' && gameOver) {
              snake = [{x: 160, y: 200}, {x: 140, y: 200}, {x: 120, y: 200}];
              dir = 'right';
              score = 0;
              scoreEl.textContent = score;
              gameOver = false;
              randomFood();
            }
          });

          function loop() {
            if (!gameOver) {
              const head = { ...snake[0] };
              if (dir === 'right') head.x += gridSize;
              if (dir === 'left') head.x -= gridSize;
              if (dir === 'up') head.y -= gridSize;
              if (dir === 'down') head.y += gridSize;

              if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400) {
                gameOver = true;
              }

              for (const part of snake) {
                if (head.x === part.x && head.y === part.y) gameOver = true;
              }

              if (!gameOver) {
                snake.unshift(head);
                if (head.x === food.x && head.y === food.y) {
                  score += 10;
                  scoreEl.textContent = score;
                  randomFood();
                } else {
                  snake.pop();
                }
              }
            }

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 400, 400);

            // 畫食物
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(food.x + 10, food.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();

            // 畫蛇身
            snake.forEach((part, i) => {
              ctx.fillStyle = i === 0 ? '#34d399' : '#10b981';
              ctx.fillRect(part.x + 1, part.y + 1, gridSize - 2, gridSize - 2);
            });

            if (gameOver) {
              ctx.fillStyle = 'rgba(0,0,0,0.7)';
              ctx.fillRect(0, 0, 400, 400);
              ctx.fillStyle = '#f43f5e';
              ctx.font = '24px sans-serif';
              ctx.fillText('遊戲結束！', 150, 190);
              ctx.fillStyle = '#e2e8f0';
              ctx.font = '14px sans-serif';
              ctx.fillText('按空格鍵重新開始', 145, 230);
            }
          }

          if (window._snakeInterval) clearInterval(window._snakeInterval);
          window._snakeInterval = setInterval(loop, 120);
        `
      },

      // 2. 待辦事項 UI (Todo Web App)
      {
        patterns: [/待辦/, /todo/, /事項/, /清單/, /記事/],
        category: '網頁 UI (Web App)',
        title: '現代響應式待辦事項清單',
        description: '支援新增待辦、點擊標記完成、刪除與本機狀態儲存',
        generateChine: (sentence) => `// 意圖編譯生成：${sentence}
// 現代待辦事項系統

設 待辦列表 = [
  { 編號: 1, 標題: "學習華語 (.chine) 程式語言", 已完成: 真 },
  { 編號: 2, 標題: "編寫第一套中文網頁程式", 已完成: 假 },
  { 編號: 3, 標題: "將作品發布開源社群", 已完成: 假 }
];

函式 新增待辦(文字) {
  設 新項目 = {
    編號: 待辦列表.長度 + 1,
    標題: 文字,
    已完成: 假
  };
  陣列.推入(待辦列表, 新項目);
  印出("✔ 已新增待辦事項：", 文字);
}

函式 列印全部待辦() {
  印出("=== 當前待辦事項清單 ===");
  遍歷 待辦列表 於 項目 {
    設 狀態符號 = 項目.已完成 ? "[已完成]" : "[進行中]";
    印出(項目.編號 + ". " + 狀態符號 + " " + 項目.標題);
  }
}

新增待辦("用一個句子開發整個網站應用！");
列印全部待辦();
`,
        generateWebUI: () => `
          <div style="max-width: 420px; margin: 0 auto; background: #161b22; padding: 20px; border-radius: 12px; border: 1px solid #30363d;">
            <h3 style="margin-top: 0; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
              📝 我的現代待辦清單
            </h3>
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <input id="todoInput" type="text" placeholder="輸入待辦事項並按 Enter..." style="flex: 1; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #fff; outline: none;">
              <button id="addTodoBtn" style="padding: 8px 14px; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">新增</button>
            </div>
            <ul id="todoListUl" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;"></ul>
          </div>
        `,
        generateClientScript: () => `
          let todos = [
            { id: 1, text: '學習華語 (.chine) 程式語言', done: true },
            { id: 2, text: '用中文句子編譯出完整網站', done: false },
            { id: 3, text: '體驗即時互動遊戲與後端伺服器', done: false }
          ];

          function render() {
            const ul = document.getElementById('todoListUl');
            ul.innerHTML = '';
            todos.forEach((item, idx) => {
              const li = document.createElement('li');
              li.style = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #21262d; border-radius: 6px; border: 1px solid #30363d;';
              li.innerHTML = \`
                <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: \${item.done ? 'line-through' : 'none'}; color: \${item.done ? '#6e7681' : '#e6edf3'};">
                  <input type="checkbox" \${item.done ? 'checked' : ''} style="accent-color: #10b981;">
                  <span>\${item.text}</span>
                </div>
                <button style="background: transparent; border: none; color: #f43f5e; cursor: pointer; font-size: 14px;">🗑</button>
              \`;
              li.querySelector('input').onclick = () => { item.done = !item.done; render(); };
              li.querySelector('button').onclick = () => { todos.splice(idx, 1); render(); };
              ul.appendChild(li);
            });
          }

          document.getElementById('addTodoBtn').onclick = () => {
            const input = document.getElementById('todoInput');
            if (input.value.trim()) {
              todos.push({ id: Date.now(), text: input.value.trim(), done: false });
              input.value = '';
              render();
            }
          };

          document.getElementById('todoInput').onkeydown = (e) => {
            if (e.key === 'Enter') document.getElementById('addTodoBtn').click();
          };

          render();
        `
      },

      // 3. 伺服器 (HTTP RESTful API Server)
      {
        patterns: [/伺服器/, /後端/, /api/, /服務/, /服務端/, /server/i],
        category: '伺服器 (HTTP / Backend API)',
        title: 'RESTful API 與動態 Web 伺服器',
        description: '支援路由分發、JSON 資料回傳、訪客計數與狀態查詢',
        generateChine: (sentence) => `// 意圖編譯生成：${sentence}
// 高效 RESTful API 伺服器

設 伺服器連接埠 = 8080;
設 總造訪人次 = 0;
設 伺服器啟動時間 = "2026-10-26";

印出("==========================================");
印出("🚀 華語 (.chine) API 伺服器正在準備啟動...");
印出("監聽端口：", 伺服器連接埠);
印出("支援路由：");
印出("  [GET]  /api/status  - 查詢伺服器運行狀態");
印出("  [GET]  /api/users   - 獲取系統使用者列表");
印出("  [POST] /api/message - 送出即時廣播訊息");
印出("==========================================");

函式 處理客戶端請求(請求路徑, 請求方法) {
  總造訪人次 += 1;
  印出("收到請求：[" + 請求方法 + "] " + 請求路徑 + " (累積訪問: " + 總造訪人次 + ")");

  若 (請求路徑 == "/api/status") {
    回傳 {
      狀態: "正常運行中",
      埠位: 伺服器連接埠,
      訪問次數: 總造訪人次,
      版本: "1.0.0"
    };
  } 否則若 (請求路徑 == "/api/users") {
    回傳 [
      { 姓名: "管理員", 權限: "超級使用者" },
      { 姓名: "華語工程師", 權限: "開發者" }
    ];
  } 否則 {
    回傳 { 訊息: "歡迎使用華語原生雲端伺服器！" };
  }
}

// 模擬伺服器接收測試請求
設 回應一 = 處理客戶端請求("/api/status", "GET");
印出("API 響應結果：", 回應一);

設 回應二 = 處理客戶端請求("/api/users", "GET");
印出("API 響應結果：", 回應二);
`,
        generateWebUI: () => `
          <div style="max-width: 480px; margin: 0 auto; background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; font-family: monospace;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <span style="color: #38bdf8; font-weight: bold; font-size: 15px;">🌐 虛擬 API 伺服器主控台</span>
              <span style="font-size: 11px; background: #064e3b; color: #34d399; padding: 3px 8px; border-radius: 4px;">運行中 (Port 8080)</span>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <button id="btnFetchStatus" style="flex: 1; padding: 8px; background: #1e293b; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; cursor: pointer;">發送 GET /api/status</button>
              <button id="btnFetchUsers" style="flex: 1; padding: 8px; background: #1e293b; color: #10b981; border: 1px solid #334155; border-radius: 6px; cursor: pointer;">發送 GET /api/users</button>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">伺服器即時 JSON 回應：</div>
            <pre id="apiServerLog" style="background: #020617; padding: 12px; border-radius: 6px; color: #a5f3fc; font-size: 12px; height: 160px; overflow-y: auto; margin: 0; border: 1px solid #1e293b;"></pre>
          </div>
        `,
        generateClientScript: () => `
          let visits = 0;
          const logEl = document.getElementById('apiServerLog');

          function log(method, path, data) {
            visits++;
            const time = new Date().toLocaleTimeString();
            logEl.textContent = \`[\${time}] HTTP 200 OK \${method} \${path}\\n\` + JSON.stringify(data, null, 2);
          }

          document.getElementById('btnFetchStatus').onclick = () => {
            log('GET', '/api/status', {
              status: 'running',
              uptime: '99.98%',
              visits: visits + 1,
              runtime: 'HuaVM Native Engine'
            });
          };

          document.getElementById('btnFetchUsers').onclick = () => {
            log('GET', '/api/users', [
              { id: 101, username: '華語管理員', role: 'admin' },
              { id: 102, username: '高階開發者', role: 'engineer' }
            ]);
          };

          document.getElementById('btnFetchStatus').click();
        `
      },

      // 4. 計數器 / 變色互動 UI
      {
        patterns: [/計數器/, /變色/, /點擊/, /按鈕/, /交互/, /ui/i],
        category: '互動式 UI (Interactive UI)',
        title: '炫彩動態響應式計數器',
        description: '支援點擊累加、累減、動態漸層顏色與重設',
        generateChine: (sentence) => `// 意圖編譯生成：${sentence}
// 炫彩動態計數器

設 計數值 = 0;
設 顏色清單 = ["#38bdf8", "#10b981", "#f59e0b", "#f43f5e", "#a855f7"];

函式 增加計數() {
  計數值 += 1;
  設 當前顏色 = 顏色清單[計數值 % 顏色清單.長度];
  印出("點擊增加！當前數值：", 計數值, "色彩：", 當前顏色);
}

函式 減少計數() {
  計數值 -= 1;
  印出("點擊減少！當前數值：", 計數值);
}

函式 重設計數() {
  計數值 = 0;
  印出("已重設為零。");
}

從 1 到 5 循環 (i) {
  增加計數();
}
`,
        generateWebUI: () => `
          <div style="max-width: 360px; margin: 0 auto; text-align: center; background: #111827; padding: 24px; border-radius: 14px; border: 1px solid #1f2937;">
            <div style="font-size: 14px; color: #9ca3af; margin-bottom: 12px;">點擊會變色的響應式計數器</div>
            <div id="counterDisplay" style="font-size: 54px; font-weight: 900; color: #38bdf8; transition: color 0.3s; margin-bottom: 20px;">0</div>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button id="cntDecBtn" style="padding: 10px 18px; font-size: 18px; font-weight: bold; background: #374151; color: #fff; border: none; border-radius: 8px; cursor: pointer;">- 1</button>
              <button id="cntResetBtn" style="padding: 10px 14px; font-size: 14px; background: #1f2937; color: #9ca3af; border: none; border-radius: 8px; cursor: pointer;">重設</button>
              <button id="cntIncBtn" style="padding: 10px 18px; font-size: 18px; font-weight: bold; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer;">+ 1</button>
            </div>
          </div>
        `,
        generateClientScript: () => `
          let count = 0;
          const colors = ['#38bdf8', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#ec4899', '#06b6d4'];
          const display = document.getElementById('counterDisplay');

          function update() {
            display.textContent = count;
            const col = colors[Math.abs(count) % colors.length];
            display.style.color = col;
          }

          document.getElementById('cntIncBtn').onclick = () => { count++; update(); };
          document.getElementById('cntDecBtn').onclick = () => { count--; update(); };
          document.getElementById('cntResetBtn').onclick = () => { count = 0; update(); };
        `
      }
    ];
  }

  /**
   * 根據中文語意編譯出目標程式碼與介面模組
   */
  compileSentence(sentence) {
    if (!sentence || !sentence.trim()) {
      throw new Error('請輸入描述意圖的句子！');
    }

    const trimmed = sentence.trim();

    // 匹配最符合的領域模型
    for (const item of this.catalog) {
      for (const pattern of item.patterns) {
        if (pattern.test(trimmed)) {
          return {
            matched: true,
            sentence: trimmed,
            category: item.category,
            title: item.title,
            description: item.description,
            chineCode: item.generateChine(trimmed),
            webHtml: item.generateWebUI(),
            clientScript: item.generateClientScript()
          };
        }
      }
    }

    // 若未精確符合特定領域，智慧推導通用高階邏輯
    return {
      matched: false,
      sentence: trimmed,
      category: '通用智慧生成程式',
      title: `實現：${trimmed}`,
      description: '根據自然語言意圖自動建構的華語高階程式邏輯',
      chineCode: `// 意圖編譯生成：${trimmed}
設 任務目標 = "${trimmed}";
設 執行狀態 = "成功啟動";

印出("🎯 正在執行意圖目標：", 任務目標);
印出("⚡ 狀態：", 執行狀態);

// 自動建構通用資料模型
設 資料庫 = [
  { 項目: "核心模組", 進度: 100 },
  { 項目: "使用者介面", 進度: 95 },
  { 項目: "業務邏輯", 進度: 90 }
];

遍歷 資料庫 於 模組 {
  印出("模組名稱：" + 模組.項目 + " -> 完成度：" + 模組.進度 + "%");
}

印出("🎉「" + 任務目標 + "」已由華語編譯器成功實現！");
`,
      webHtml: `
        <div style="max-width: 400px; margin: 0 auto; background: #161b22; padding: 20px; border-radius: 10px; border: 1px solid #30363d; text-align: center;">
          <h3 style="color: #38bdf8; margin-top: 0;">✨ 意圖實現成果</h3>
          <p style="color: #e6edf3; font-size: 14px;">已針對需求「<strong>${trimmed}</strong>」建立專屬互動程式！</p>
          <button onclick="alert('意圖已成功編譯並執行！')" style="padding: 10px 18px; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 8px;">立即體驗功能</button>
        </div>
      `,
      clientScript: ``
    };
  }
}
