/**
 * 華語 (HuaLang) - 專屬現代中文代碼編輯器
 * 具備即時中文語法高亮、行號同步、智慧自動補全、括號自動配對與除錯行指示
 */

import { KEYWORDS } from '../lang/lexer.js';

export const AUTOCOMPLETE_ITEMS = [
  { label: '變數', insertText: '變數 名稱 = 數值;', detail: '宣告可變變數', kind: 'keyword' },
  { label: '常數', insertText: '常數 名稱 = 數值;', detail: '宣告不可變常數', kind: 'keyword' },
  { label: '設', insertText: '設 變數名 = 數值;', detail: '簡潔宣告變數', kind: 'keyword' },
  { label: '印出(...)', insertText: '印出("文字內容");', detail: '在控制台印出訊息', kind: 'builtin' },
  { label: '輸入(...)', insertText: '輸入("請輸入：");', detail: '彈出視窗請求使用者輸入', kind: 'builtin' },
  { label: '等待(毫秒)', insertText: '等待(500);', detail: '非同步暫停指定毫秒數', kind: 'builtin' },
  { label: '若 (條件) { ... }', insertText: '若 (條件) {\n  \n} 否則 {\n  \n}', detail: '條件判斷陳述', kind: 'snippet' },
  { label: '當 (條件) { ... }', insertText: '當 (條件) {\n  \n}', detail: '當型循環 (While 迴圈)', kind: 'snippet' },
  { label: '從 ... 到 ... 循環', insertText: '從 1 到 10 循環 (i) {\n  \n}', detail: '指定區間計數迴圈', kind: 'snippet' },
  { label: '遍歷 ... 於 ...', insertText: '遍歷 陣列 於 項目 {\n  \n}', detail: '遍歷陣列各元素 (ForEach)', kind: 'snippet' },
  { label: '函式 名稱(參數) { ... }', insertText: '函式 名稱(參數) {\n  回傳 數值;\n}', detail: '定義自訂函式', kind: 'snippet' },
  { label: '回傳', insertText: '回傳 數值;', detail: '從函式返回值', kind: 'keyword' },
  { label: '跳出', insertText: '跳出;', detail: '中斷跳出當前循環', kind: 'keyword' },
  { label: '算術.隨機數', insertText: '算術.隨機數(最小值, 最大值)', detail: '產生指定範圍的隨機浮點數', kind: 'builtin' },
  { label: '算術.整數隨機數', insertText: '算術.整數隨機數(1, 100)', detail: '產生指定範圍的隨機整數', kind: 'builtin' },
  { label: '算術.平方根', insertText: '算術.平方根(數值)', detail: '計算平方根', kind: 'builtin' },
  { label: '海龜.前進', insertText: '海龜.前進(100);', detail: '海龜向前移動指定距離', kind: 'turtle' },
  { label: '海龜.右轉', insertText: '海龜.右轉(90);', detail: '海龜順時針轉指定角度', kind: 'turtle' },
  { label: '海龜.左轉', insertText: '海龜.左轉(90);', detail: '海龜逆時針轉指定角度', kind: 'turtle' },
  { label: '海龜.設顏色', insertText: '海龜.設顏色("翡翠");', detail: '設定海龜畫筆顏色', kind: 'turtle' },
  { label: '海龜.畫圓', insertText: '海龜.畫圓(50);', detail: '以當前位置為起點畫圓', kind: 'turtle' },
  { label: '陣列.長度', insertText: '陣列.長度(清單)', detail: '取得陣列項目個數', kind: 'builtin' },
  { label: '字串.長度', insertText: '字串.長度(文字)', detail: '取得字串字元個數', kind: 'builtin' },
  { label: '音效.音階', insertText: '音效.音階("Do", 300);', detail: '使用 Web Audio 發出指定音符', kind: 'audio' }
];

export class ChineseCodeEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.initialValue = options.value || '';
    this.onChange = options.onChange || null;
    this.highlightLineNumber = null;

    this.initDOM();
    this.bindEvents();
    this.setValue(this.initialValue);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="hl-editor-wrapper">
        <div class="hl-gutter" id="hlGutter"></div>
        <div class="hl-code-area">
          <pre class="hl-highlight" id="hlHighlight" aria-hidden="true"><code></code></pre>
          <textarea class="hl-textarea" id="hlTextarea" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="在此輸入「華語」程式碼..."></textarea>
        </div>
        <div class="hl-autocomplete-box" id="hlAutocomplete" style="display: none;"></div>
      </div>
    `;

    this.gutter = this.container.querySelector('#hlGutter');
    this.highlightCode = this.container.querySelector('#hlHighlight code');
    this.highlightPre = this.container.querySelector('#hlHighlight');
    this.textarea = this.container.querySelector('#hlTextarea');
    this.autocompleteBox = this.container.querySelector('#hlAutocomplete');
    this.activeAutocompleteIndex = 0;
    this.filteredSuggestions = [];
  }

  bindEvents() {
    this.textarea.addEventListener('input', () => {
      this.updateHighlighting();
      this.updateLineNumbers();
      this.triggerAutocomplete();
      if (this.onChange) this.onChange(this.getValue());
    });

    this.textarea.addEventListener('scroll', () => {
      this.syncScroll();
    });

    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // 點擊其他地方關閉自動補全
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideAutocomplete();
      }
    });
  }

  syncScroll() {
    const top = this.textarea.scrollTop;
    const left = this.textarea.scrollLeft;
    this.highlightPre.scrollTop = top;
    this.highlightPre.scrollLeft = left;
    this.gutter.scrollTop = top;
  }

  handleKeydown(e) {
    // 若自動補全選單開啟
    if (this.autocompleteBox.style.display !== 'none') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeAutocompleteIndex = (this.activeAutocompleteIndex + 1) % this.filteredSuggestions.length;
        this.renderAutocomplete();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeAutocompleteIndex =
          (this.activeAutocompleteIndex - 1 + this.filteredSuggestions.length) % this.filteredSuggestions.length;
        this.renderAutocomplete();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.applySelectedSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        this.hideAutocomplete();
        return;
      }
    }

    // Tab 鍵縮排 (2 空格)
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;

      this.textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      this.updateHighlighting();
      this.updateLineNumbers();
      return;
    }

    // 括號自動配對
    const pairMap = {
      '(': ')',
      '[': ']',
      '{': '}',
      '「': '」',
      '『': '』',
      '"': '"',
      "'": "'"
    };

    if (pairMap[e.key]) {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;
      const closeChar = pairMap[e.key];

      e.preventDefault();
      const selected = val.substring(start, end);
      this.textarea.value = val.substring(0, start) + e.key + selected + closeChar + val.substring(end);
      this.textarea.selectionStart = start + 1;
      this.textarea.selectionEnd = end + 1;
      this.updateHighlighting();
      return;
    }
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(val) {
    this.textarea.value = val;
    this.updateHighlighting();
    this.updateLineNumbers();
  }

  setHighlightLine(lineNum) {
    this.highlightLineNumber = lineNum;
    this.updateLineNumbers();
  }

  clearHighlightLine() {
    this.highlightLineNumber = null;
    this.updateLineNumbers();
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n');
    let html = '';
    for (let i = 1; i <= lines.length; i++) {
      const isCur = i === this.highlightLineNumber;
      html += `<div class="hl-line-number ${isCur ? 'active-exec' : ''}">${isCur ? '▶ ' : ''}${i}</div>`;
    }
    this.gutter.innerHTML = html;
  }

  updateHighlighting() {
    const raw = this.textarea.value;
    this.highlightCode.innerHTML = this.highlightSyntax(raw) + '\n';
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  highlightSyntax(code) {
    // 依行解析語法高亮
    const lines = code.split('\n');
    return lines.map(line => {
      let result = '';
      let i = 0;

      while (i < line.length) {
        // 註解 (// 或 # 或 註：)
        if (
          line.slice(i, i + 2) === '//' ||
          line[i] === '#' ||
          line.slice(i, i + 2) === '註：' ||
          line.slice(i, i + 2) === '註:'
        ) {
          result += `<span class="hl-token-comment">${this.escapeHtml(line.slice(i))}</span>`;
          break;
        }

        // 字串 "...", '...', 「...」
        if (line[i] === '"' || line[i] === "'" || line[i] === '「') {
          const quote = line[i];
          const closing = quote === '「' ? '」' : quote;
          let str = quote;
          i++;
          while (i < line.length && line[i] !== closing) {
            if (line[i] === '\\' && i + 1 < line.length) {
              str += line[i] + line[i + 1];
              i += 2;
            } else {
              str += line[i++];
            }
          }
          if (i < line.length) str += line[i++];
          result += `<span class="hl-token-string">${this.escapeHtml(str)}</span>`;
          continue;
        }

        // 數字
        if (/[0-9]/.test(line[i])) {
          let num = '';
          while (i < line.length && /[0-9\.]/.test(line[i])) {
            num += line[i++];
          }
          result += `<span class="hl-token-number">${num}</span>`;
          continue;
        }

        // 漢字與英文單詞識別
        if (/[a-zA-Z_\$\u4e00-\u9fa5]/.test(line[i])) {
          let word = '';
          while (i < line.length && /[a-zA-Z0-9_\$\u4e00-\u9fa5]/.test(line[i])) {
            word += line[i++];
          }

          if (KEYWORDS.has(word)) {
            result += `<span class="hl-token-keyword">${this.escapeHtml(word)}</span>`;
          } else if (['印出', '輸出', '輸入', '等待', '算術', '字串', '陣列', '海龜', '畫布', '音效', '長度'].includes(word)) {
            result += `<span class="hl-token-builtin">${this.escapeHtml(word)}</span>`;
          } else {
            result += `<span class="hl-token-ident">${this.escapeHtml(word)}</span>`;
          }
          continue;
        }

        // 運算子
        if (/[=+\-*/%^!<>|&]/.test(line[i])) {
          let op = line[i++];
          while (i < line.length && /[=+\-*/%^!<>|&]/.test(line[i])) {
            op += line[i++];
          }
          result += `<span class="hl-token-operator">${this.escapeHtml(op)}</span>`;
          continue;
        }

        // 括號與標點
        result += this.escapeHtml(line[i++]);
      }
      return result;
    }).join('\n');
  }

  triggerAutocomplete() {
    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.slice(0, pos);
    const lastWordMatch = textBefore.match(/([a-zA-Z_\u4e00-\u9fa5]+)$/);

    if (!lastWordMatch) {
      this.hideAutocomplete();
      return;
    }

    const word = lastWordMatch[1];
    if (word.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.filteredSuggestions = AUTOCOMPLETE_ITEMS.filter(item =>
      item.label.includes(word) || item.insertText.includes(word) || item.detail.includes(word)
    );

    if (this.filteredSuggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.activeAutocompleteIndex = 0;
    this.renderAutocomplete();
    this.showAutocomplete();
  }

  showAutocomplete() {
    this.autocompleteBox.style.display = 'block';
  }

  hideAutocomplete() {
    this.autocompleteBox.style.display = 'none';
  }

  renderAutocomplete() {
    let html = '';
    this.filteredSuggestions.forEach((item, idx) => {
      const active = idx === this.activeAutocompleteIndex ? 'active' : '';
      html += `
        <div class="hl-ac-item ${active}" data-idx="${idx}">
          <span class="hl-ac-badge hl-badge-${item.kind}">${item.kind === 'keyword' ? '語法' : item.kind === 'builtin' ? '內建' : item.kind === 'turtle' ? '繪圖' : '範本'}</span>
          <span class="hl-ac-label">${this.escapeHtml(item.label)}</span>
          <span class="hl-ac-detail">${this.escapeHtml(item.detail)}</span>
        </div>
      `;
    });
    this.autocompleteBox.innerHTML = html;

    // 點擊事件
    this.autocompleteBox.querySelectorAll('.hl-ac-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.getAttribute('data-idx'));
        this.activeAutocompleteIndex = idx;
        this.applySelectedSuggestion();
      });
    });
  }

  applySelectedSuggestion() {
    const item = this.filteredSuggestions[this.activeAutocompleteIndex];
    if (!item) return;

    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.slice(0, pos);
    const textAfter = this.textarea.value.slice(pos);
    const lastWordMatch = textBefore.match(/([a-zA-Z_\u4e00-\u9fa5]+)$/);

    let prefixLen = 0;
    if (lastWordMatch) {
      prefixLen = lastWordMatch[1].length;
    }

    const newBefore = textBefore.slice(0, textBefore.length - prefixLen);
    this.textarea.value = newBefore + item.insertText + textAfter;
    const newPos = newBefore.length + item.insertText.length;
    this.textarea.selectionStart = this.textarea.selectionEnd = newPos;

    this.hideAutocomplete();
    this.updateHighlighting();
    this.updateLineNumbers();
    this.textarea.focus();
    if (this.onChange) this.onChange(this.getValue());
  }
}
