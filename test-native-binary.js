import fs from 'fs';
import { Lexer } from './src/lang/lexer.js';
import { Parser } from './src/lang/parser.js';
import { NativeARM64Compiler } from './src/compiler/native-compiler.js';

console.log("=== 測試華語 (.chine) 編譯為真實原生 ARM64 組合語言與機器碼執行檔 ===");

const sourceCode = `
// 華語原生編譯測試
設 數字甲 = 18;
設 數字乙 = 24;
設 總和 = 數字甲 + 數字乙;

印出("【原生 ARM64 機械碼執行】數字甲 =", 數字甲);
印出("【原生 ARM64 機械碼執行】數字乙 =", 數字乙);
印出("【原生 ARM64 機械碼執行】兩數加總 =", 總和);

若 (總和 >= 40) {
  印出("條件判斷通過：總和大於等於 40！");
} 否則 {
  印出("總和小於 40。");
}

從 1 到 5 循環 (計數) {
  印出("循環計數：", 計數);
}
`;

try {
  const parser = new Parser(new Lexer(sourceCode).tokenize());
  const ast = parser.parse();

  console.log("1. 正在生成真實 ARM64 (AArch64) 組合語言代碼 (.s)...");
  const nativeCompiler = new NativeARM64Compiler();
  const asm = nativeCompiler.compileToAssembly(ast);

  fs.writeFileSync('原生程式.s', asm, 'utf-8');
  console.log("✔ [組合語言產出完成] 儲存為 原生程式.s");
  console.log("--- 組合語言預覽 (前 25 行) ---");
  console.log(asm.split('\n').slice(0, 25).join('\n'));

  console.log("\n2. 調用系統原生組譯器 (Assembler) 與連結器 (Linker) 生成真正的機械語言執行檔...");
  const result = nativeCompiler.assembleAndLinkNative(asm, './原生程式');
  console.log(`✔ [原生機械語言執行檔產出完成] 檔案：${result.binaryPath}`);

  console.log("\n3. 直接由作業系統 CPU 核心執行原生二進位執行檔：");
  const output = nativeCompiler.runNativeBinary('./原生程式');
  console.log(output);

  console.log("🎉 成功！華語程式已直接轉成真實組合語言 (.s)，再組譯連結為原生機械語言二進位檔直接在 CPU 上執行！");
} catch (err) {
  console.error("❌ 測試失敗：", err);
  process.exit(1);
}
