#!/usr/bin/env node

/**
 * 華語 (HuaLang / .chine) - 命令列編譯器工具鏈 CLI
 * 用法：
 *   chine run <file.chine>               - 直接編譯並執行 .chine 原始碼
 *   chine compile <file.chine> [-o out]   - 編譯為華語組語 (.casm)
 *   chine assemble <file.casm> [-o out]   - 組譯為目標檔 (.cobj)
 *   chine link <file.cobj> [-o out]       - 連結為二進位執行檔 (.cbinary)
 *   chine exec <file.cbinary>            - HuaVM 虛擬機直接執行二進位檔
 */

import fs from 'fs';
import path from 'path';
import { Lexer } from '../src/lang/lexer.js';
import { Parser } from '../src/lang/parser.js';
import { Compiler } from '../src/compiler/compiler.js';
import { Assembler } from '../src/compiler/assembler.js';
import { Linker } from '../src/compiler/linker.js';
import { HuaVM } from '../src/compiler/vm.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║          華語 (HuaLang / .chine) 獨立高階語言編譯工具鏈 CLI          ║
╚════════════════════════════════════════════════════════════════════╝

使用方式：
  node bin/chine.js run <原始碼.chine>              直接編譯、連結並在 HuaVM 執行
  node bin/chine.js compile <原始碼.chine> [-o 組語.casm]  編譯器：生成華語組合語言
  node bin/chine.js assemble <組語.casm> [-o 目標.cobj]    組譯器：生成目標檔
  node bin/chine.js link <目標.cobj> [-o 執行檔.cbinary]   連結器：生成可執行檔
  node bin/chine.js exec <執行檔.cbinary>                 HuaVM 虛擬機直接執行二進位檔
  node bin/chine.js ide                                  啟動 Web 整合開發環境
`);
}

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

try {
  if (command === 'run') {
    const filePath = args[1];
    if (!filePath) {
      console.error('錯誤：請指定 .chine 原始碼檔案路徑。');
      process.exit(1);
    }
    const source = fs.readFileSync(filePath, 'utf-8');
    const parser = new Parser(new Lexer(source).tokenize());
    const ast = parser.parse();
    const compiler = new Compiler();
    const casm = compiler.compile(ast);
    const assembler = new Assembler();
    const cobj = assembler.assemble(casm);
    const linker = new Linker();
    const binary = linker.link(cobj);

    const vm = new HuaVM({
      onPrint: (msg) => console.log(msg)
    });
    await vm.run(binary);
  }
  else if (command === 'compile') {
    const inputPath = args[1];
    const source = fs.readFileSync(inputPath, 'utf-8');
    const parser = new Parser(new Lexer(source).tokenize());
    const ast = parser.parse();
    const compiler = new Compiler();
    const casm = compiler.compile(ast);
    const outputPath = args[2] === '-o' && args[3] ? args[3] : inputPath.replace(/\.[a-zA-Z0-9]+$/, '.casm');
    fs.writeFileSync(outputPath, casm, 'utf-8');
    console.log(`✔ [編譯成功] 已生成華語組合語言：${outputPath}`);
  }
  else if (command === 'assemble') {
    const inputPath = args[1];
    const casm = fs.readFileSync(inputPath, 'utf-8');
    const assembler = new Assembler();
    const cobj = assembler.assemble(casm);
    const outputPath = args[2] === '-o' && args[3] ? args[3] : inputPath.replace(/\.[a-zA-Z0-9]+$/, '.cobj');
    fs.writeFileSync(outputPath, JSON.stringify(cobj, null, 2), 'utf-8');
    console.log(`✔ [組譯成功] 已生成目標檔：${outputPath}`);
  }
  else if (command === 'link') {
    const inputPath = args[1];
    const cobj = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const linker = new Linker();
    const binary = linker.link(cobj);
    const outputPath = args[2] === '-o' && args[3] ? args[3] : inputPath.replace(/\.[a-zA-Z0-9]+$/, '.cbinary');
    fs.writeFileSync(outputPath, JSON.stringify(binary, null, 2), 'utf-8');
    console.log(`✔ [連結成功] 已生成可執行檔：${outputPath} (魔數: ${binary.magic})`);
  }
  else if (command === 'exec') {
    const inputPath = args[1];
    const binary = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const vm = new HuaVM({
      onPrint: (msg) => console.log(msg)
    });
    await vm.run(binary);
  } else {
    console.error(`未知命令「${command}」`);
    printHelp();
  }
} catch (err) {
  console.error(`❌ 執行失敗：`, err.message);
  process.exit(1);
}
