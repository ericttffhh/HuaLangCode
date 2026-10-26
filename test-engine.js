import { Lexer } from './src/lang/lexer.js';
import { Parser } from './src/lang/parser.js';
import { Interpreter } from './src/lang/interpreter.js';
import { Transpiler } from './src/lang/transpiler.js';
import { EXAMPLES } from './src/lang/examples.js';

console.log("=== 測試華語 (HuaLang) 編譯與執行引擎 ===");

for (const ex of EXAMPLES) {
  console.log(`\n測試範例：${ex.title}`);
  try {
    const lexer = new Lexer(ex.code);
    const tokens = lexer.tokenize();
    console.log(`  分詞成功 (Token 數: ${tokens.length})`);

    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(`  語法分析成功 (AST 節點數: ${ast.body.length})`);

    const transpiler = new Transpiler();
    const js = transpiler.transpile(ast);
    console.log(`  JS 轉譯成功 (字數: ${js.length})`);

    // 如果不是需要使用者輸入或海龜畫布的範例，直接執行驗證
    if (ex.id === 'hello' || ex.id === 'fibonacci' || ex.id === 'student-grades' || ex.id === 'bubble-sort') {
      const output = [];
      const interpreter = new Interpreter({
        onPrint: (msg) => output.push(msg)
      });
      await interpreter.run(ast);
      console.log(`  執行成功！輸出行數: ${output.length}。範例輸出: ${output[0]}`);
    }
  } catch (err) {
    console.error(`  ❌ 錯誤：`, err);
    process.exit(1);
  }
}

console.log("\n🎉 所有範例測試通過！華語核心引擎運作完美！");
