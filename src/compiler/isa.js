/**
 * 華語 (HuaLang) - HuaVM 虛擬機指令集 (Bytecode ISA)
 * 定義組語指令、操作碼 (Opcode) 與二進位標頭格式
 */

export const Opcode = {
  NOP: 0x00,          // 空指令
  LOAD_CONST: 0x01,   // 載入常數 (推入運算堆疊)
  LOAD_VAR: 0x02,     // 載入變數 (由局部/全域作用域讀取)
  STORE_VAR: 0x03,    // 存入變數 (彈出棧頂存入變數)
  LOAD_GLOBAL: 0x04,  // 載入全域/外來符號
  STORE_GLOBAL: 0x05, // 存入全域符號

  // 算術與運算
  ADD: 0x10,          // 加法
  SUB: 0x11,          // 減法
  MUL: 0x12,          // 乘法
  DIV: 0x13,          // 除法
  MOD: 0x14,          // 取餘數
  POW: 0x15,          // 次方

  // 比較與邏輯
  EQ: 0x20,           // 等於 ==
  NEQ: 0x21,          // 不等於 !=
  LT: 0x22,           // 小於 <
  GT: 0x23,           // 大於 >
  LTE: 0x24,          // 小於等於 <=
  GTE: 0x25,          // 大於等於 >=
  NOT: 0x26,          // 邏輯非 !
  AND: 0x27,          // 邏輯且 &&
  OR: 0x28,           // 邏輯或 ||

  // 跳躍與流程控制
  JUMP: 0x30,         // 無條件跳躍
  JUMP_IF_FALSE: 0x31,// 條件為假時跳躍
  JUMP_IF_TRUE: 0x32, // 條件為真時跳躍

  // 複合結構
  BUILD_ARRAY: 0x40,  // 建構陣列 (彈出 N 個元素)
  BUILD_OBJECT: 0x41, // 建構物件 (彈出 N 對鍵值)
  GET_PROP: 0x42,     // 取得屬性/索引
  SET_PROP: 0x43,     // 設定屬性/索引

  // 函式與系統呼叫
  CALL: 0x50,         // 呼叫函式
  RETURN: 0x51,       // 函式返回
  PRINT: 0x52,        // 內建印出 (列印 N 個參數)
  SYS_CALL: 0x53,     // 系統調用 (輸入、海龜繪圖、音效等)

  // 停機
  HALT: 0xFF          // 程式結束
};

// 中文組語助記詞 (Mnemonic) 與 Opcode 對照表
export const MNEMONIC_MAP = {
  '空操作': Opcode.NOP,
  '載入常數': Opcode.LOAD_CONST,
  '載入變數': Opcode.LOAD_VAR,
  '存入變數': Opcode.STORE_VAR,
  '載入全域': Opcode.LOAD_GLOBAL,
  '存入全域': Opcode.STORE_GLOBAL,
  '加法': Opcode.ADD,
  '減法': Opcode.SUB,
  '乘法': Opcode.MUL,
  '除法': Opcode.DIV,
  '取餘': Opcode.MOD,
  '次方': Opcode.POW,
  '等於': Opcode.EQ,
  '不等於': Opcode.NEQ,
  '小於': Opcode.LT,
  '大於': Opcode.GT,
  '小於等於': Opcode.LTE,
  '大於等於': Opcode.GTE,
  '邏輯非': Opcode.NOT,
  '邏輯且': Opcode.AND,
  '邏輯或': Opcode.OR,
  '跳躍': Opcode.JUMP,
  '跳躍若假': Opcode.JUMP_IF_FALSE,
  '跳躍若真': Opcode.JUMP_IF_TRUE,
  '建構陣列': Opcode.BUILD_ARRAY,
  '建構字典': Opcode.BUILD_OBJECT,
  '讀取成員': Opcode.GET_PROP,
  '寫入成員': Opcode.SET_PROP,
  '呼叫': Opcode.CALL,
  '返回': Opcode.RETURN,
  '印出': Opcode.PRINT,
  '系統呼叫': Opcode.SYS_CALL,
  '結束停機': Opcode.HALT
};

// 反向查詢助記詞
export const OPCODE_NAME_MAP = {};
for (const [name, code] of Object.entries(MNEMONIC_MAP)) {
  OPCODE_NAME_MAP[code] = name;
}
