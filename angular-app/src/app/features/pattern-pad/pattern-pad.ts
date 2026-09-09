import { AfterViewInit, Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { TPipe } from '../../core/t.pipe';

type Pt = { x: number; y: number };
interface Stroke {
  color: string;
  size: number;
  pts: Pt[];
}
type Template = 'blank' | 'pants' | 'shirt';

const W = 900;
const H = 1120;

/**
 * Fingertip sketch pad for the pattern / farma. Emits a white-background JPEG
 * data URL (same shape as an uploaded photo) so it drops straight into the
 * lot's `patternImage` field — PDF and detail panel already render it.
 */
@Component({
  selector: 'app-pattern-pad',
  standalone: true,
  imports: [TPipe],
  templateUrl: './pattern-pad.html',
})
export class PatternPad implements AfterViewInit {
  readonly done = output<string | null>();

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx!: CanvasRenderingContext2D;

  readonly colors = ['#1e3a8a', '#111827', '#dc2626'];
  readonly sizes = [3, 6, 12];

  readonly template = signal<Template>('pants');
  readonly color = signal(this.colors[0]);
  readonly size = signal(6);
  readonly erasing = signal(false);

  private strokes: Stroke[] = [];
  private current: Stroke | null = null;

  ngAfterViewInit(): void {
    const cv = this.canvasRef().nativeElement;
    cv.width = W;
    cv.height = H;
    this.ctx = cv.getContext('2d')!;
    this.render();
  }

  setTemplate(t: Template): void {
    this.template.set(t);
    this.render();
  }
  setColor(c: string): void {
    this.color.set(c);
    this.erasing.set(false);
  }
  setSize(s: number): void {
    this.size.set(s);
  }
  toggleErase(): void {
    this.erasing.update((v) => !v);
  }
  undo(): void {
    this.strokes.pop();
    this.render();
  }
  clearAll(): void {
    this.strokes = [];
    this.render();
  }
  cancel(): void {
    this.done.emit(null);
  }
  save(): void {
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, W, H);
    octx.drawImage(this.canvasRef().nativeElement, 0, 0);
    this.done.emit(out.toDataURL('image/jpeg', 0.82));
  }

  onDown(e: PointerEvent): void {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.current = {
      color: this.erasing() ? '#ffffff' : this.color(),
      size: this.erasing() ? Math.max(this.size() * 3, 26) : this.size(),
      pts: [this.toXY(e)],
    };
  }
  onMove(e: PointerEvent): void {
    if (!this.current) return;
    e.preventDefault();
    this.current.pts.push(this.toXY(e));
    this.render();
  }
  onUp(): void {
    if (!this.current) return;
    this.strokes.push(this.current);
    this.current = null;
    this.render();
  }

  private toXY(e: PointerEvent): Pt {
    const r = this.canvasRef().nativeElement.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    this.drawTemplate();
    for (const s of this.strokes) this.drawStroke(s);
    if (this.current) this.drawStroke(this.current);
  }

  private drawStroke(s: Stroke): void {
    const ctx = this.ctx;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.1, s.pts[0].y + 0.1);
    ctx.stroke();
  }

  private drawTemplate(): void {
    const t = this.template();
    if (t === 'blank') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#c7ccd6';
    ctx.lineWidth = 3;
    if (t === 'pants') this.pantsPath(ctx);
    else this.shirtPath(ctx);
    ctx.restore();
  }

  private pantsPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(240, 120);
    ctx.lineTo(660, 120);
    ctx.lineTo(690, 320);
    ctx.lineTo(640, 1010);
    ctx.lineTo(500, 1010);
    ctx.lineTo(450, 540);
    ctx.lineTo(400, 1010);
    ctx.lineTo(260, 1010);
    ctx.lineTo(210, 320);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(224, 178);
    ctx.lineTo(676, 178);
    ctx.stroke();
  }

  private shirtPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(340, 170);
    ctx.lineTo(410, 130);
    ctx.lineTo(490, 130);
    ctx.lineTo(560, 170);
    ctx.lineTo(720, 280);
    ctx.lineTo(660, 380);
    ctx.lineTo(600, 320);
    ctx.lineTo(600, 860);
    ctx.lineTo(300, 860);
    ctx.lineTo(300, 320);
    ctx.lineTo(240, 380);
    ctx.lineTo(180, 280);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(410, 130);
    ctx.quadraticCurveTo(450, 185, 490, 130);
    ctx.stroke();
  }
}
