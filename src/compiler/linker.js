/**
 * 華語 (HuaLang) - 連結器 (Linker)
 * 將多個目標檔 (.cobj) 與系統標準函式庫合併、解析外部符號與重定位，
 * 最終生成單一可執行的二進位檔案結構 (.cbinary / .cexec)
 */

export class Linker {
  constructor() {
    this.globalSymbolTable = {};
    this.unifiedConstantPool = [];
    this.mergedInstructions = [];
  }

  addConstant(val) {
    const idx = this.unifiedConstantPool.findIndex(c => c === val);
    if (idx !== -1) return idx;
    this.unifiedConstantPool.push(val);
    return this.unifiedConstantPool.length - 1;
  }

  link(mainObj, libObjs = []) {
    this.globalSymbolTable = {};
    this.unifiedConstantPool = [];
    this.mergedInstructions = [];

    const allObjects = [mainObj, ...libObjs];
    const moduleOffsets = []; // 每個目標檔在合併後代碼段的起始偏移量
    const constIndexMaps = []; // 每個目標檔舊常數索引 -> 新常數索引映射

    let currentBaseOffset = 0;

    // 階段一：計算各模組代碼段位址偏移，並合併符號表與常數池
    for (let i = 0; i < allObjects.length; i++) {
      const obj = allObjects[i];
      moduleOffsets.push(currentBaseOffset);

      // 常數池合併與映射
      const constMap = new Map();
      for (let oldIdx = 0; oldIdx < obj.constantPool.length; oldIdx++) {
        const newIdx = this.addConstant(obj.constantPool[oldIdx]);
        constMap.set(oldIdx, newIdx);
      }
      constIndexMaps.push(constMap);

      // 符號表合併
      for (const [symName, symInfo] of Object.entries(obj.symbolTable)) {
        const absoluteOffset = currentBaseOffset + symInfo.offset;
        if (this.globalSymbolTable[symName] !== undefined) {
          // 若重複定義非局部標籤則報錯
          if (!symName.startsWith('.')) {
            throw new Error(`符號重定義衝突：符號「${symName}」在多個目標檔中重複定義！`);
          }
        }
        this.globalSymbolTable[symName] = {
          ...symInfo,
          offset: absoluteOffset
        };
      }

      currentBaseOffset += obj.codeSegment.length;
    }

    // 階段二：合併指令段並重寫常數索引
    const pendingRelocations = [];

    for (let i = 0; i < allObjects.length; i++) {
      const obj = allObjects[i];
      const baseOffset = moduleOffsets[i];
      const constMap = constIndexMaps[i];

      for (const inst of obj.codeSegment) {
        let newOperand = inst.operand;

        // 若是指向常數池的指令 (如 載入常數、存入變數等)
        if (inst.opcode === 0x01 || inst.opcode === 0x02 || inst.opcode === 0x03 || inst.opcode === 0x04) {
          if (typeof inst.operand === 'number' && constMap.has(inst.operand)) {
            newOperand = constMap.get(inst.operand);
          }
        }

        this.mergedInstructions.push({
          ip: baseOffset + inst.ip,
          opcode: inst.opcode,
          operand: newOperand
        });
      }

      // 收集該目標檔的重定位請求
      for (const reloc of obj.relocations) {
        pendingRelocations.push({
          targetIp: baseOffset + reloc.ip,
          symbol: reloc.symbol,
          type: reloc.type
        });
      }
    }

    // 階段三：符號重定位 (Symbol Relocation Resolution)
    for (const reloc of pendingRelocations) {
      const sym = this.globalSymbolTable[reloc.symbol];
      if (!sym) {
        throw new Error(`連結失敗 (Linker Error)：無法解析的外部符號「${reloc.symbol}」於位置 IP:${reloc.targetIp}`);
      }

      // 將目標指令的運算元修正為解析後的絕對位址
      const targetInst = this.mergedInstructions[reloc.targetIp];
      if (targetInst) {
        targetInst.operand = sym.offset;
      }
    }

    // 檢查入口點
    let entryIP = 0;
    if (this.globalSymbolTable['_主程式入口']) {
      entryIP = this.globalSymbolTable['_主程式入口'].offset;
    }

    // 輸出可執行檔案結構 (.cbinary)
    const executable = {
      magic: 'CHINEXEC',
      version: '1.0.0',
      buildTime: Date.now(),
      entryPoint: entryIP,
      constantPool: this.unifiedConstantPool,
      symbolTable: this.globalSymbolTable,
      instructions: this.mergedInstructions
    };

    return executable;
  }
}
