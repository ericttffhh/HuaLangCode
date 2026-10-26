/**
 * 華語 (HuaLang / .chine) - VSCode 官方擴充套件入口
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let terminal = null;

function getOrCreateTerminal() {
  if (terminal && !terminal.exitStatus) {
    return terminal;
  }
  terminal = vscode.window.createTerminal({
    name: '華語 (HuaLang)',
    iconPath: new vscode.ThemeIcon('play')
  });
  return terminal;
}

function activate(context) {
  console.log('華語 (HuaLang / .chine) VSCode 擴充套件已成功啟動！');

  const cliPath = path.join(__dirname, 'bin', 'chine.js');

  // 1. 命令：一鍵執行當前 .chine 程式
  const runCmd = vscode.commands.registerCommand('chine.run', async (uri) => {
    let filePath = uri ? uri.fsPath : null;
    if (!filePath) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        if (editor.document.isDirty) {
          await editor.document.save();
        }
        filePath = editor.document.fileName;
      }
    }

    if (!filePath || !filePath.endsWith('.chine')) {
      vscode.window.showWarningMessage('請在編輯器中開啟一個 .chine 華語原始碼檔案！');
      return;
    }

    const term = getOrCreateTerminal();
    term.show();
    term.sendText(`node "${cliPath}" run "${filePath}"`);
  });

  // 2. 命令：編譯為原生 ARM64 機械語言執行檔並執行
  const compileNativeCmd = vscode.commands.registerCommand('chine.compileNative', async (uri) => {
    let filePath = uri ? uri.fsPath : null;
    if (!filePath) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        if (editor.document.isDirty) await editor.document.save();
        filePath = editor.document.fileName;
      }
    }

    if (!filePath || !filePath.endsWith('.chine')) {
      vscode.window.showWarningMessage('請在編輯器中開啟一個 .chine 華語原始碼檔案！');
      return;
    }

    const outputBinaryPath = filePath.replace(/\.chine$/, '');
    const term = getOrCreateTerminal();
    term.show();
    term.sendText(`node -e "
      const { Lexer } = require('./src/lang/lexer.js');
      const { Parser } = require('./src/lang/parser.js');
      const { NativeARM64Compiler } = require('./src/compiler/native-compiler.js');
      const fs = require('fs');
      const src = fs.readFileSync('${filePath}', 'utf-8');
      const ast = new Parser(new Lexer(src).tokenize()).parse();
      const compiler = new NativeARM64Compiler();
      const asm = compiler.compileToAssembly(ast);
      fs.writeFileSync('${filePath}.s', asm);
      console.log('✔ 已生成 ARM64 組合語言：${filePath}.s');
      compiler.assembleAndLinkNative(asm, '${outputBinaryPath}');
      console.log('✔ 已組譯與連結為原生機械語言：${outputBinaryPath}');
      console.log('🚀 開始執行原生機械碼：');
      console.log(compiler.runNativeBinary('${outputBinaryPath}'));
    "`);
  });

  // 3. 命令：編譯為華語組合語言 (.casm)
  const compileCasmCmd = vscode.commands.registerCommand('chine.compileCasm', async (uri) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.chine')) {
      vscode.window.showWarningMessage('請在編輯器中開啟一個 .chine 華語原始碼檔案！');
      return;
    }
    if (editor.document.isDirty) await editor.document.save();
    const filePath = editor.document.fileName;
    const casmPath = filePath.replace(/\.chine$/, '.casm');

    const term = getOrCreateTerminal();
    term.show();
    term.sendText(`node "${cliPath}" compile "${filePath}" -o "${casmPath}"`);

    setTimeout(async () => {
      if (fs.existsSync(casmPath)) {
        const doc = await vscode.workspace.openTextDocument(casmPath);
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
      }
    }, 1000);
  });

  // 4. 命令：在 VSCode 內部開啟 Web IDE Webview
  const openWebIDECmd = vscode.commands.registerCommand('chine.openWebIDE', () => {
    const panel = vscode.window.createWebviewPanel(
      'chineWebIDE',
      '華語 (HuaLang) 視覺化 IDE',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0d1117; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe src="http://127.0.0.1:3000"></iframe>
      </body>
      </html>
    `;
  });

  // 底部狀態列「▶ 執行華語程式」按鈕
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'chine.run';
  statusBarItem.text = '$(play) 執行華語';
  statusBarItem.tooltip = '執行當前 .chine 華語程式檔 (Ctrl+F5)';

  function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.fileName.endsWith('.chine')) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  vscode.window.onDidChangeActiveTextEditor(updateStatusBar);
  updateStatusBar();

  context.subscriptions.push(runCmd, compileNativeCmd, compileCasmCmd, openWebIDECmd, statusBarItem);
}

function deactivate() {
  if (terminal) {
    terminal.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};
