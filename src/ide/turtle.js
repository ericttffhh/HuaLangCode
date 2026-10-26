/**
 * 華語 (HuaLang) - 海龜繪圖引擎 (Canvas Turtle Graphics)
 */

export class TurtleGraphics {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.penDown = true;
    this.color = '#38bdf8';
    this.width = 3;
    this.visible = true;
    this.paths = []; // 保存路徑以支援重繪
    this.reset();
  }

  translateColor(color) {
    const map = {
      '紅色': '#ef4444',
      '橙色': '#f97316',
      '橘色': '#f97316',
      '黃色': '#eab308',
      '綠色': '#22c55e',
      '青色': '#06b6d4',
      '藍色': '#3b82f6',
      '紫色': '#a855f7',
      '粉色': '#ec4899',
      '粉紅色': '#ec4899',
      '白色': '#ffffff',
      '黑色': '#0f172a',
      '灰色': '#94a3b8',
      '金色': '#f59e0b',
      '翡翠': '#10b981',
      '碧綠': '#10b981',
      '硃砂': '#e11d48',
      '靛藍': '#6366f1',
      '霓虹粉': '#f43f5e',
      '霓虹綠': '#4ade80',
      '霓虹藍': '#38bdf8'
    };
    return map[color] || color;
  }

  reset() {
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;
    this.angle = -90; // 朝向正上方
    this.penDown = true;
    this.color = '#38bdf8';
    this.width = 3;
    this.visible = true;
    this.clear();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTurtleCursor();
  }

  drawTurtleCursor() {
    if (!this.visible) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle + 90) * (Math.PI / 180));

    // 繪製海龜小箭頭
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  forward(distance) {
    const rad = (this.angle * Math.PI) / 180;
    const newX = this.x + distance * Math.cos(rad);
    const newY = this.y + distance * Math.sin(rad);

    if (this.penDown) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);
      this.ctx.lineTo(newX, newY);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.width;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    this.x = newX;
    this.y = newY;
  }

  backward(distance) {
    this.forward(-distance);
  }

  turnLeft(deg) {
    this.angle -= deg;
  }

  turnRight(deg) {
    this.angle += deg;
  }

  moveTo(x, y) {
    // 支援以畫布中心為 (0,0) 的座標系統
    const canvasX = this.canvas.width / 2 + x;
    const canvasY = this.canvas.height / 2 - y;

    if (this.penDown) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);
      this.ctx.lineTo(canvasX, canvasY);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.width;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    this.x = canvasX;
    this.y = canvasY;
  }

  setHeading(angleDeg) {
    this.angle = angleDeg - 90;
  }

  circle(radius) {
    if (!this.penDown) return;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, Math.abs(radius), 0, Math.PI * 2);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.width;
    this.ctx.stroke();
  }

  fillCircle(radius, fillColor) {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, Math.abs(radius), 0, Math.PI * 2);
    this.ctx.fillStyle = this.translateColor(fillColor || this.color);
    this.ctx.fill();
  }

  writeText(text, fontSize = 16) {
    this.ctx.save();
    this.ctx.font = `${fontSize}px "Noto Sans TC", sans-serif`;
    this.ctx.fillStyle = this.color;
    this.ctx.fillText(String(text), this.x, this.y);
    this.ctx.restore();
  }

  getAPI() {
    return {
      前進: (d = 100) => this.forward(Number(d)),
      後退: (d = 100) => this.backward(Number(d)),
      左轉: (deg = 90) => this.turnLeft(Number(deg)),
      右轉: (deg = 90) => this.turnRight(Number(deg)),
      移至: (x, y) => this.moveTo(Number(x), Number(y)),
      設角度: (deg) => this.setHeading(Number(deg)),
      抬筆: () => { this.penDown = false; },
      落筆: () => { this.penDown = true; },
      設顏色: (col) => { this.color = this.translateColor(String(col)); },
      設筆寬: (w) => { this.width = Number(w); },
      畫圓: (r = 50) => this.circle(Number(r)),
      實心圓: (r = 50, col) => this.fillCircle(Number(r), col),
      寫字: (txt, sz = 16) => this.writeText(txt, sz),
      清空: () => this.clear(),
      重設: () => this.reset(),
      隱藏海龜: () => { this.visible = false; },
      顯示海龜: () => { this.visible = true; }
    };
  }
}
