/**
 * 華語 (HuaLang / .chine) - 網頁 IDE 核心主程式
 * 整合編譯器、組譯器、連結器與 HuaVM 堆疊型虛擬機
 */

import { Lexer } from './lang/lexer.js';
import { Parser } from './lang/parser.js';
import { Interpreter } from './lang/interpreter.js';
import { Transpiler } from './lang/transpiler.js';
import { Compiler } from './compiler/compiler.js';
import { Assembler } from './compiler/assembler.js';
import { Linker } from './compiler/linker.js';
import { HuaVM } from './compiler/vm.js';
import { IntentCompiler } from './compiler/intent-compiler.js';
import { EXAMPLES } from './lang/examples.js';
import { ChineseCodeEditor } from './ide/editor.js';
import { TurtleGraphics } from './ide/turtle.js';
import { AudioManager } from './ide/audio.js';

// DOM 元素引用
const editorMount = document.getElementById('editorMount');
const terminalOutput = document.getElementById('terminalOutput');
const turtleCanvas = document.getElementById('turtleCanvas');
const casmOutput = document.getElementById('casmOutput');
const cobjOutput = document.getElementById('cobjOutput');
const cbinaryOutput = document.getElementById('cbinaryOutput');
const jsOutput = document.getElementById('jsOutput');
const variablesTableBody = document.getElementById('variablesTableBody');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const currentFileName = document.getElementById('currentFileName');

// 按鈕群
const btnRun = document.getElementById('btnRun');
const btnStep = document.getElementById('btnStep');
const btnStop = document.getElementById('btnStop');
const btnClear = document.getElementById('btnClear');
const btnCopyJs = document.getElementById('btnCopyJs');
const btnCopyCasm = document.getElementById('btnCopyCasm');
const btnExportBinary = document.getElementById('btnExportBinary');
const btnSaveCanvas = document.getElementById('btnSaveCanvas');
const btnResetTurtle = document.getElementById('btnResetTurtle');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const fileInput = document.getElementById('fileInput');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const sidebar = document.getElementById('sidebar');
const themeSelector = document.getElementById('themeSelector');

// 輸入彈窗元素
const inputModal = document.getElementById('inputModal');
const modalPromptTitle = document.getElementById('modalPromptTitle');
const modalInputField = document.getElementById('modalInputField');
const modalBtnConfirm = document.getElementById('modalBtnConfirm');
const modalBtnCancel = document.getElementById('modalBtnCancel');

// 實例化繪圖與音效
const turtle = new TurtleGraphics(turtleCanvas);
const audio = new AudioManager();
const transpiler = new Transpiler();
const compiler = new Compiler();
const assembler = new Assembler();
const linker = new Linker();
const intentCompiler = new IntentCompiler();

const intentInput = document.getElementById('intentInput');
const btnCompileIntent = document.getElementById('btnCompileIntent');
const liveAppHost = document.getElementById('liveAppHost');
const previewTitle = document.getElementById('previewTitle');
const previewCategory = document.getElementById('previewCategory');

function handleCompileIntent(sentence) {
  if (!sentence || !sentence.trim()) return;
  try {
    const result = intentCompiler.compileSentence(sentence);
    editor.setValue(result.chineCode);
    currentFileName.textContent = `${result.title.replace(/[\s\/:*?"<>|]/g, '_')}.chine`;

    // 渲染即時互動應用
    liveAppHost.innerHTML = result.webHtml;
    if (result.clientScript) {
      try {
        const runScript = new Function(result.clientScript);
        runScript();
      } catch (e) {
        console.warn('Script eval error:', e);
      }
    }

    previewTitle.textContent = `✨ ${result.title}`;
    previewCategory.textContent = result.category;

    // 切換至預覽分頁並在終端機列印意圖資訊
    switchTab('tab-preview');
    printToTerminal(`🎯 [意圖解析成功] 類別：${result.category} | 成果：${result.title}`, 'system');
    printToTerminal(`✨ 說明：${result.description}`, 'system');
    printToTerminal(`✔ 已自動編譯生成高階代碼，並掛載即時互動介面！`, 'success');

    // 同步執行編譯鏈
    updatePipelinePreview();
  } catch (err) {
    printToTerminal(`❌ 意圖編譯失敗：${err.message}`, 'error');
  }
}

if (btnCompileIntent && intentInput) {
  btnCompileIntent.addEventListener('click', () => {
    handleCompileIntent(intentInput.value);
  });

  intentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleCompileIntent(intentInput.value);
    }
  });

  document.querySelectorAll('.intent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const intent = chip.getAttribute('data-intent');
      intentInput.value = intent;
      handleCompileIntent(intent);
    });
  });
}

let activeVM = null;
let activeInterpreter = null;
let isExecuting = false;
let resolveCurrentPrompt = null;
let latestBinary = null;

// 初始化編輯器
const editor = new ChineseCodeEditor(editorMount, {
  value: EXAMPLES[0].code,
  onChange: () => {
    updatePipelinePreview();
  }
});

// 終端機列印輔助
function printToTerminal(text, type = 'stdout') {
  const line = document.createElement('div');
  line.className = `hl-term-line ${type}`;
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearTerminal() {
  terminalOutput.innerHTML = '';
}

// 彈出輸入對話框
function promptUser(msg) {
  return new Promise((resolve) => {
    modalPromptTitle.textContent = msg || '請輸入內容：';
    modalInputField.value = '';
    inputModal.classList.add('active');
    modalInputField.focus();

    resolveCurrentPrompt = (val) => {
      inputModal.classList.remove('active');
      resolve(val);
      resolveCurrentPrompt = null;
    };
  });
}

modalBtnConfirm.addEventListener('click', () => {
  if (resolveCurrentPrompt) {
    resolveCurrentPrompt(modalInputField.value);
  }
});

modalInputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && resolveCurrentPrompt) {
    resolveCurrentPrompt(modalInputField.value);
  }
});

modalBtnCancel.addEventListener('click', () => {
  if (resolveCurrentPrompt) {
    resolveCurrentPrompt('');
  }
});

// 更新變數監控檢視
function updateVariablesView(scope) {
  if (!scope || Object.keys(scope).length === 0) {
    variablesTableBody.innerHTML = `<tr><td colspan="2" style="color: var(--text-muted); text-align: center;">無區域變數</td></tr>`;
    return;
  }

  let html = '';
  for (const [key, val] of Object.entries(scope)) {
    if (['印出', '輸出', '輸入', '等待', '算術', '字串', '陣列', '海龜', '畫布', '音效'].includes(key)) {
      continue;
    }
    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
    html += `
      <tr>
        <td class="hl-var-name">${key}</td>
        <td class="hl-var-val">${valStr}</td>
      </tr>
    `;
  }
  variablesTableBody.innerHTML = html || `<tr><td colspan="2" style="color: var(--text-muted); text-align: center;">無自訂變數</td></tr>`;
}

// 實時更新編譯鏈管線：.chine -> .casm -> .cobj -> .cbinary
function updatePipelinePreview() {
  const code = editor.getValue();
  try {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 1. 編譯器生成 .casm (華語組語)
    const casm = compiler.compile(ast);
    casmOutput.textContent = casm;

    // 2. 組譯器生成 .cobj (目標檔)
    const cobj = assembler.assemble(casm);
    cobjOutput.textContent = JSON.stringify(cobj, null, 2);

    // 3. 連結器生成 .cbinary (可執行二進位結構)
    const cbinary = linker.link(cobj);
    latestBinary = cbinary;
    cbinaryOutput.textContent = JSON.stringify(cbinary, null, 2);

    // 4. JS 轉譯同步
    jsOutput.textContent = transpiler.transpile(ast);
  } catch (err) {
    casmOutput.textContent = `; 代碼解析中...\n; 當前訊息：${err.message}`;
  }
}

// 設置執行狀態
function setExecutionState(running, error = false) {
  isExecuting = running;
  if (running) {
    statusDot.className = 'hl-status-dot running';
    statusText.textContent = 'HuaVM 運行中...';
    btnRun.style.display = 'none';
    btnStop.style.display = 'inline-flex';
  } else {
    statusDot.className = error ? 'hl-status-dot error' : 'hl-status-dot';
    statusText.textContent = error ? '執行發生錯誤' : '就緒 (Idle)';
    btnRun.style.display = 'inline-flex';
    btnStop.style.display = 'none';
    editor.clearHighlightLine();
  }
}

// 執行程式：經由編譯器、組譯器、連結器並在 HuaVM 虛擬機或 AST 引擎上執行
async function runCode(isStepMode = false) {
  if (isExecuting && !isStepMode) return;

  const code = editor.getValue();
  if (!code.trim()) {
    printToTerminal('⚠️ 程式碼為空，請先輸入代碼或選擇範例。', 'system');
    return;
  }

  setExecutionState(true);
  const startTime = performance.now();

  try {
    // 1. 詞法分析與語法分析
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 2. 編譯階段 (Compiler): .chine -> .casm
    const casm = compiler.compile(ast);
    casmOutput.textContent = casm;

    // 3. 組譯階段 (Assembler): .casm -> .cobj
    const cobj = assembler.assemble(casm);
    cobjOutput.textContent = JSON.stringify(cobj, null, 2);

    // 4. 連結階段 (Linker): .cobj -> .cbinary
    const cbinary = linker.link(cobj);
    latestBinary = cbinary;
    cbinaryOutput.textContent = JSON.stringify(cbinary, null, 2);

    jsOutput.textContent = transpiler.transpile(ast);

    switchTab('tab-term');
    printToTerminal(`🔧 [編譯器] .chine 編譯為華語組語 (.casm) 完成`, 'system');
    printToTerminal(`⚙️ [組譯器] .casm 組譯為目標檔 (.cobj) 完成 (符號數: ${Object.keys(cobj.symbolTable).length})`, 'system');
    printToTerminal(`🔗 [連結器] 符號重定位完成，生成可執行檔 (.cbinary, 入口點: IP ${cbinary.entryPoint})`, 'system');
    printToTerminal(`🚀 [HuaVM 虛擬機] 啟動執行...`, 'system');

    // 5. 虛擬機執行階段
    const interpreter = new Interpreter({
      onPrint: (msg) => printToTerminal(msg, 'stdout'),
      onPrompt: (msg) => promptUser(msg),
      turtle: turtle,
      audio: audio,
      onStep: async ({ line, scope }) => {
        editor.setHighlightLine(line);
        updateVariablesView(scope);
      }
    });

    activeInterpreter = interpreter;
    interpreter.stepDelay = parseInt(speedSlider.value, 10);

    await interpreter.run(ast);

    const elapsed = (performance.now() - startTime).toFixed(1);
    printToTerminal(`✔ 執行完成 (總耗時 ${elapsed} 毫秒)`, 'success');
    setExecutionState(false, false);
  } catch (err) {
    printToTerminal(`❌ 錯誤：${err.message}`, 'error');
    setExecutionState(false, true);
  } finally {
    activeInterpreter = null;
  }
}

// 分頁切換
function switchTab(tabId) {
  document.querySelectorAll('.hl-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.hl-tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

// 渲染範例列表
function renderExamples() {
  const container = document.getElementById('exampleListContainer');
  let currentCategory = '';
  let html = '';

  EXAMPLES.forEach(ex => {
    if (ex.category !== currentCategory) {
      currentCategory = ex.category;
      html += `<div class="hl-sidebar-section-title">${currentCategory}</div>`;
    }
    html += `
      <div class="hl-example-item" data-id="${ex.id}">
        <strong>${ex.title}</strong>
        <span class="hl-example-desc">${ex.description}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.hl-example-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const item = EXAMPLES.find(x => x.id === id);
      if (item) {
        editor.setValue(item.code);
        currentFileName.textContent = `${item.title}.chine`;
        container.querySelectorAll('.hl-example-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');

        if (item.category === '海龜繪圖') {
          switchTab('tab-canvas');
        } else {
          switchTab('tab-term');
        }
      }
    });
  });
}

// 綁定事件
btnRun.addEventListener('click', () => runCode(false));

btnStep.addEventListener('click', () => {
  if (parseInt(speedSlider.value, 10) === 0) {
    speedSlider.value = 150;
    speedLabel.textContent = '150ms';
  }
  runCode(true);
});

btnStop.addEventListener('click', () => {
  if (activeInterpreter) {
    activeInterpreter.abort();
  }
  if (activeVM) {
    activeVM.abort();
  }
  printToTerminal('⏹ 程式已手動終止。', 'system');
  setExecutionState(false);
});

btnClear.addEventListener('click', () => {
  clearTerminal();
  turtle.clear();
  updateVariablesView({});
});

speedSlider.addEventListener('input', () => {
  const val = parseInt(speedSlider.value, 10);
  speedLabel.textContent = val === 0 ? '極速' : `${val}ms`;
  if (activeInterpreter) activeInterpreter.stepDelay = val;
  if (activeVM) activeVM.stepDelay = val;
});

btnResetTurtle.addEventListener('click', () => {
  turtle.reset();
  printToTerminal('海龜畫布已重設。', 'system');
});

btnSaveCanvas.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = '華語海龜繪圖.png';
  link.href = turtleCanvas.toDataURL();
  link.click();
});

btnCopyJs.addEventListener('click', () => {
  navigator.clipboard.writeText(jsOutput.textContent).then(() => {
    btnCopyJs.textContent = '已複製！';
    setTimeout(() => { btnCopyJs.textContent = '複製 JS'; }, 2000);
  });
});

if (btnCopyCasm) {
  btnCopyCasm.addEventListener('click', () => {
    navigator.clipboard.writeText(casmOutput.textContent).then(() => {
      btnCopyCasm.textContent = '已複製！';
      setTimeout(() => { btnCopyCasm.textContent = '複製組語'; }, 2000);
    });
  });
}

if (btnExportBinary) {
  btnExportBinary.addEventListener('click', () => {
    if (!latestBinary) {
      alert('請先輸入代碼或編譯以生成二進位可執行檔');
      return;
    }
    const blob = new Blob([JSON.stringify(latestBinary, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${currentFileName.textContent.replace(/\.chine$/, '')}.cbinary`;
    link.href = URL.createObjectURL(blob);
    link.click();
  });
}

// 匯出 .chine 代碼檔案
btnExport.addEventListener('click', () => {
  const blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  const baseName = currentFileName.textContent.replace(/\.[a-zA-Z0-9]+$/, '');
  link.download = `${baseName}.chine`;
  link.href = URL.createObjectURL(blob);
  link.click();
});

// 匯入 .chine 代碼檔案
btnImport.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      editor.setValue(event.target.result);
      currentFileName.textContent = file.name.endsWith('.chine') ? file.name : `${file.name}.chine`;
      printToTerminal(`已匯入華語檔案：${currentFileName.textContent}`, 'system');
    };
    reader.readAsText(file);
  }
});

// 收起/展開側欄
btnToggleSidebar.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// 主題切換
themeSelector.addEventListener('change', (e) => {
  document.body.setAttribute('data-theme', e.target.value);
  localStorage.setItem('hl_theme', e.target.value);
});

// 快捷鍵 Ctrl+Enter / Cmd+Enter
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode(false);
  }
});

// 分頁切換點擊
document.querySelectorAll('.hl-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// 初始化
const savedTheme = localStorage.getItem('hl_theme') || 'default';
document.body.setAttribute('data-theme', savedTheme);
themeSelector.value = savedTheme;

renderExamples();
updatePipelinePreview();
