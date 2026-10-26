import { Lexer } from './src/lang/lexer.js';
import { Parser } from './src/lang/parser.js';
import { Compiler } from './src/compiler/compiler.js';
import { Assembler } from './src/compiler/assembler.js';
import { Linker } from './src/compiler/linker.js';
import { HuaVM } from './src/compiler/vm.js';

console.log("=== 測試華語 (.chine) 完整工具鏈：編譯器 -> 組譯器 -> 連結器 -> HuaVM 虛擬機 ===");

const chineSource = `
// 華語原始碼：測試高階語言完整編譯鏈
設 甲 = 15;
設 乙 = 27;
設 總和 = 甲 + 乙;

印出("【HuaVM 執行成功】甲 =", 甲, "乙 =", 乙, "總和 =", 總和);

若 (總和 > 30) {
  印出("條件判斷成功：總和大於 30！");
} 否則 {
  印出("總和小於等於 30。");
}

從 1 到 5 循環 (計數) {
  印出("計數迴圈：", 計數);
}
`;

try {
  // 1. 語法解析
  console.log("1. 剖析原始碼 (.chine)...");
  const lexer = new Lexer(chineSource);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  // 2. 編譯器 (.chine -> .casm)
  console.log("2. 編譯為組合語言 (.casm)...");
  const compiler = new Compiler();
  const casm = compiler.compile(ast);
  console.log("--- 產生的華語組語 (.casm) 片段 ---");
  console.log(casm.split('\n').slice(0, 16).join('\n') + '\n...');

  // 3. 組譯器 (.casm -> .cobj)
  console.log("\n3. 組譯為目標檔 (.cobj)...");
  const assembler = new Assembler();
  const cobj = assembler.assemble(casm);
  console.log(`   目標檔產生成功：常數數 ${cobj.constantPool.length}，符號數 ${Object.keys(cobj.symbolTable).length}，指令數 ${cobj.codeSegment.length}`);

  // 4. 連結器 (.cobj -> .cbinary)
  console.log("\n4. 連結為可執行檔 (.cbinary)...");
  const linker = new Linker();
  const cbinary = linker.link(cobj);
  console.log(`   可執行檔產生成功：入口點 IP:${cbinary.entryPoint}，總指令數 ${cbinary.instructions.length}`);

  // 5. 虛擬機執行 (HuaVM)
  console.log("\n5. HuaVM 虛擬機載入可執行檔並執行：");
  const vmOutput = [];
  const vm = new HuaVM({
    onPrint: (msg) => {
      console.log(`   [HuaVM 輸出] ${msg}`);
      vmOutput.push(msg);
    }
  });

  await vm.run(cbinary);

  console.log("\n🎉 完整工具鏈測試通過！編譯器、組譯器、連結器、HuaVM 虛擬機運作正常！");
} catch (err) {
  console.error("❌ 工具鏈測試失敗：", err);
  process.exit(1);
}
