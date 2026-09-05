import { Injectable } from '@angular/core';
import type { LangCode } from './models';
import { Lot } from './models';
import { baleCountLabel, fixIndic, pdfLabels } from './pdf-i18n.data';

type RGB = [number, number, number];

/**
 * Builds the same "cutting job card" PDF the old Node backend produced, but
 * entirely in the browser (jsPDF) — no server involved. Ported 1:1 from the
 * original server/app.js print handler.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  async printLot(lot: Lot, lang: LangCode): Promise<void> {
    const doc = await this.renderPdf(lot, lang);
    const blobUrl = doc.output('bloburl');
    const win = window.open(blobUrl as unknown as string, '_blank');
    if (!win) window.location.href = blobUrl as unknown as string;
  }

  /**
   * Opens the OS share sheet (WhatsApp, Drive, "Save to Files"/download, etc.)
   * with the PDF attached as a real file. Falls back to a direct file download
   * on desktop browsers that don't support the Web Share File API.
   */
  async sharePdf(lot: Lot, lang: LangCode): Promise<void> {
    const doc = await this.renderPdf(lot, lang);
    const fileName = `${lot.lotNumber || 'lot'}-job-card.pdf`;
    const blob = doc.output('blob') as Blob;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: fileName });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    doc.save(fileName);
  }

  private async renderPdf(lot: Lot, lang: LangCode) {
    // jsPDF (and its html2canvas dependency) is sizeable — load it only when a
    // print is actually requested instead of shipping it in the main bundle.
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    let FAM = 'helvetica';
    if (lang === 'hi') {
      const { NOTO_DEVANAGARI } = await import('./pdf-fonts/noto-devanagari');
      doc.addFileToVFS('NotoHi.ttf', NOTO_DEVANAGARI);
      doc.addFont('NotoHi.ttf', 'NotoHi', 'normal');
      FAM = 'NotoHi';
    } else if (lang === 'gu') {
      const { NOTO_GUJARATI } = await import('./pdf-fonts/noto-gujarati');
      doc.addFileToVFS('NotoGu.ttf', NOTO_GUJARATI);
      doc.addFont('NotoGu.ttf', 'NotoGu', 'normal');
      FAM = 'NotoGu';
    }

    const L = pdfLabels(lang);
    const fx = lang === 'en' ? (s: string) => s : fixIndic;

    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 14;
    const RIGHT = PW - M;
    const CW = RIGHT - M;

    const INK: RGB = [17, 24, 39];
    const MUTED: RGB = [107, 114, 128];
    const LINE: RGB = [214, 219, 227];
    const BRAND: RGB = [47, 91, 234];
    const SOFT: RGB = [244, 246, 251];

    const val = (v: unknown): string => (v === 0 || v ? fx(String(v)) : '—');
    const font = (style: 'normal' | 'bold' = 'normal', size?: number) => {
      doc.setFont(FAM, FAM === 'helvetica' ? style : 'normal');
      if (size) doc.setFontSize(size);
    };
    const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
    const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
    const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

    const OKBG: RGB = [235, 250, 241];
    const OKFG: RGB = [21, 128, 61];
    const WARNBG: RGB = [255, 243, 227];
    const WARNFG: RGB = [180, 83, 9];
    const ZEBRA: RGB = [247, 249, 252];
    const TILE: RGB[] = [[37, 99, 235], [22, 163, 74], [217, 119, 6], [139, 92, 246]];
    const upper = (s: unknown) => (lang === 'en' ? String(s).toUpperCase() : String(s));

    // ---- Header ------------------------------------------------------
    fill(INK);
    doc.rect(0, 0, PW, 27, 'F');
    fill(BRAND);
    doc.rect(0, 27, PW, 1.4, 'F');
    fill(BRAND);
    doc.roundedRect(M, 7.5, 11, 11, 2.5, 2.5, 'F');
    font('bold', 8.5);
    ink([255, 255, 255]);
    doc.text('DP', M + 5.5, 14.6, { align: 'center' });
    font('bold', 14);
    doc.text('DP CREATION', M + 15, 12.8);
    font('normal', 7.5);
    ink([170, 190, 216]);
    doc.text(L('subtitle'), M + 15, 18);

    font('normal', 6.4);
    ink([150, 172, 200]);
    doc.text(L('jobCard'), RIGHT, 8, { align: 'right' });
    font('bold', 16);
    ink([255, 255, 255]);
    doc.text(lot.lotNumber || 'LOT', RIGHT, 15.5, { align: 'right' });
    const statusText = L(`st.${lot.status || 'Draft'}`);
    font('bold', 6.8);
    const sw = doc.getTextWidth(statusText) + 9;
    fill(BRAND);
    doc.roundedRect(RIGHT - sw, 19, sw, 5.6, 2.8, 2.8, 'F');
    ink([255, 255, 255]);
    doc.text(statusText, RIGHT - sw / 2, 22.7, { align: 'center' });

    let y = 36;

    const gap = () => { y += 4; };
    const ensure = (need: number) => {
      if (y + need > PH - 14) { doc.addPage(); y = 20; }
    };

    const sectionHead = (text: string) => {
      ensure(16);
      const label = upper(text);
      font('bold', 8);
      const w = doc.getTextWidth(label) + 10;
      fill(BRAND);
      doc.roundedRect(M, y, w, 6.8, 1.6, 1.6, 'F');
      ink([255, 255, 255]);
      doc.text(label, M + 5, y + 4.7);
      stroke(LINE);
      doc.line(M + w + 3, y + 3.4, RIGHT, y + 3.4);
      y += 11;
    };

    // ---- Lot + Fabric info cards -----------------------------------
    const infoCard = (x: number, w: number, title: string, pairs: Array<[string, unknown]>): number => {
      const rowH = 5.1;
      const h = 9 + pairs.length * rowH + 2;
      stroke(LINE);
      fill([255, 255, 255]);
      doc.roundedRect(x, y, w, h, 2, 2, 'S');
      fill(SOFT);
      doc.roundedRect(x, y, w, 8, 2, 2, 'F');
      doc.rect(x, y + 4, w, 4, 'F');
      stroke(LINE);
      doc.line(x, y + 8, x + w, y + 8);
      font('bold', 7);
      ink(MUTED);
      doc.text(upper(title), x + 4, y + 5.4);
      let ry = y + 14;
      pairs.forEach(([k, v]) => {
        font('normal', 8.2);
        ink(MUTED);
        doc.text(String(k), x + 4, ry);
        font('bold', 8.2);
        ink(INK);
        doc.text(doc.splitTextToSize(val(v), w - 36)[0] || '—', x + w - 4, ry, { align: 'right' });
        ry += rowH;
      });
      return h;
    };
    const colW = (CW - 6) / 2;
    const h1 = infoCard(M, colW, L('lotInfo'), [
      [L('date'), lot.date],
      [L('programDate'), lot.programDate],
      [L('cuttingDate'), lot.cuttingDate],
      [L('createdBy'), lot.createdBy],
    ]);
    const h2 = infoCard(M + colW + 6, colW, L('fabricInfo'), [
      [L('supplier'), lot.supplier],
      [`${L('shortNo')} / ${L('shortName')}`, [lot.shortNumber, lot.shortName].filter(Boolean).join(' — ')],
      [L('fabricType'), lot.fabricType],
      [L('color'), lot.color],
    ]);
    y += Math.max(h1, h2);

    // ---- Metric tiles (colour-coded) -----------------------------
    gap();
    const tiles: Array<[string, unknown]> = [
      ['MTR', lot.totalMeters],
      ['PCS', lot.totalPieces],
      ['PANA', lot.pana],
      ['AVG', lot.averageConsumption],
    ];
    const tGap = 4;
    const tw = (CW - tGap * 3) / 4;
    tiles.forEach(([label, value], i) => {
      const x = M + i * (tw + tGap);
      fill([255, 255, 255]);
      stroke(LINE);
      doc.roundedRect(x, y, tw, 15, 2, 2, 'FD');
      fill(TILE[i]);
      doc.roundedRect(x, y, tw, 1.6, 1.6, 1.6, 'F');
      doc.rect(x, y + 0.8, tw, 0.8, 'F');
      font('bold', 6.4);
      ink(MUTED);
      doc.text(label, x + 4, y + 6);
      font('bold', 13);
      ink(TILE[i]);
      doc.text(val(value), x + 4, y + 12.2);
    });
    y += 15;

    // ---- Size breakdown ------------------------------------------
    gap();
    sectionHead(L('sizeBreakdown'));
    const sizePairs = Object.entries(lot.sizeBreakdown || {})
      .map(([s, q]): [string, number] => [s, Number(q) || 0])
      .filter(([, q]) => q > 0);

    if (sizePairs.length) {
      const perRow = 13;
      for (let i = 0; i < sizePairs.length; i += perRow) {
        const chunk = sizePairs.slice(i, i + perRow);
        const cw = CW / perRow;
        const bw = cw * chunk.length;
        ensure(17);
        fill(BRAND);
        doc.rect(M, y, bw, 7, 'F');
        font('bold', 8);
        ink([255, 255, 255]);
        chunk.forEach(([s], col) => doc.text(String(s), M + cw * col + cw / 2, y + 4.9, { align: 'center' }));
        stroke(LINE);
        fill([255, 255, 255]);
        doc.rect(M, y + 7, bw, 9, 'FD');
        font('bold', 10);
        ink(INK);
        chunk.forEach(([, q], col) => doc.text(String(q), M + cw * col + cw / 2, y + 13, { align: 'center' }));
        stroke(LINE);
        for (let col = 1; col < chunk.length; col += 1) doc.line(M + cw * col, y + 7, M + cw * col, y + 16);
        y += 16;
      }
    } else {
      font('normal', 8.5);
      ink(MUTED);
      doc.text(L('noSizes'), M, y + 2);
      y += 6;
    }
    fill(INK);
    doc.roundedRect(M, y + 1.5, CW, 8.5, 2, 2, 'F');
    font('bold', 8.5);
    ink([255, 255, 255]);
    doc.text(L('totalPieces'), M + 4, y + 7);
    font('bold', 11);
    doc.text(String(lot.totalPieces || 0), RIGHT - 4, y + 7.2, { align: 'right' });
    y += 12;

    // ---- Bale / Roll table (two entries per line) --------------
    gap();
    sectionHead(L('baleDetails'));
    const bales = lot.bales || [];
    const baleMeters = bales.reduce((s, b) => s + (Number(b.meters) || 0), 0);
    const halfW = (CW - 6) / 2;
    const rowH = 6;

    const baleHeader = (x: number) => {
      fill(SOFT);
      stroke(LINE);
      doc.rect(x, y, halfW, 7, 'FD');
      font('bold', 6.6);
      ink(MUTED);
      doc.text(upper(L('baleNo')), x + 3, y + 4.7);
      doc.text(upper(L('meter')), x + halfW - 3, y + 4.7, { align: 'right' });
    };
    const baleRows = (x: number, list: typeof bales, startY: number): number => {
      let yy = startY;
      font('normal', 8.5);
      list.forEach((b, ri) => {
        if (ri % 2) { fill(ZEBRA); doc.rect(x, yy, halfW, rowH, 'F'); }
        ink(INK);
        doc.text(val(b.baleNumber), x + 3, yy + 4.2);
        doc.text(val(b.meters), x + halfW - 3, yy + 4.2, { align: 'right' });
        stroke(LINE);
        doc.line(x, yy + rowH, x + halfW, yy + rowH);
        yy += rowH;
      });
      return yy;
    };

    if (bales.length) {
      const mid = Math.ceil(bales.length / 2);
      ensure(14 + mid * rowH + 8);
      const yTop = y;
      baleHeader(M);
      baleHeader(M + halfW + 6);
      const yL = baleRows(M, bales.slice(0, mid), yTop + 7);
      const yR = baleRows(M + halfW + 6, bales.slice(mid), yTop + 7);
      stroke(LINE);
      doc.rect(M, yTop, halfW, yL - yTop, 'S');
      doc.rect(M + halfW + 6, yTop, halfW, Math.max(yR, yTop + 7) - yTop, 'S');
      y = Math.max(yL, yR) + 3;
    } else {
      fill(SOFT);
      stroke(LINE);
      doc.rect(M, y, CW, 7, 'FD');
      font('bold', 7);
      ink(MUTED);
      doc.text(upper(L('baleNo')), M + 3, y + 4.7);
      doc.text(upper(L('meter')), RIGHT - 3, y + 4.7, { align: 'right' });
      y += 7;
      font('normal', 8.5);
      ink(MUTED);
      doc.text(L('noBales'), M + 3, y + 5);
      y += 8;
    }

    fill([232, 238, 253]);
    doc.rect(M, y, CW, 8, 'F');
    stroke(LINE);
    doc.rect(M, y, CW, 8, 'S');
    font('bold', 8.5);
    ink(BRAND);
    doc.text(`${upper(L('total'))}   ·   ${baleCountLabel(lang, bales.length)}`, M + 3, y + 5.4);
    doc.text(String(baleMeters), RIGHT - 3, y + 5.4, { align: 'right' });
    y += 8;

    // reconciliation callout
    const diff = baleMeters - (Number(lot.totalMeters) || 0);
    if (lot.totalMeters) {
      const ok = diff === 0;
      y += 2.5;
      fill(ok ? OKBG : WARNBG);
      doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
      fill(ok ? OKFG : WARNFG);
      doc.roundedRect(M, y, 1.8, 9, 1.6, 1.6, 'F');
      doc.rect(M, y, 1.4, 9, 'F');
      font('bold', 8);
      ink(ok ? OKFG : WARNFG);
      doc.text(ok ? L('reconOk') : L('reconBad'), M + 5, y + 5.8);
      font('normal', 8);
      ink(INK);
      const detail = ok
        ? `Lot ${lot.totalMeters} = Bale ${baleMeters} MTR`
        : `Lot ${lot.totalMeters}  /  Bale ${baleMeters}  /  ${diff > 0 ? '+' : ''}${diff} MTR`;
      doc.text(detail, RIGHT - 5, y + 5.8, { align: 'right' });
      y += 9;
    }

    // ---- Cutting information --------------------------------
    gap();
    sectionHead(L('cuttingInfo'));
    const c = lot.cutting || ({} as Lot['cutting']);
    const cutPairs: Array<[string, unknown]> = [
      [L('pattern'), c.patternType], [L('markerLength'), c.markerLength], [L('markerWidth'), c.markerWidth],
      [L('layLength'), c.layLength], [L('layers'), c.noOfLayers], [L('plies'), c.noOfPlies],
    ];
    const ccw = CW / 3;
    const cutH = 8 + 2 * 9;
    stroke(LINE);
    fill([255, 255, 255]);
    doc.roundedRect(M, y, CW, cutH, 2, 2, 'S');
    cutPairs.forEach(([k, v], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = M + col * ccw + 5;
      const ry = y + 7.5 + row * 9;
      if (col) { stroke(LINE); doc.line(M + col * ccw, y + 3, M + col * ccw, y + cutH - 3); }
      font('normal', 7);
      ink(MUTED);
      doc.text(String(k), x, ry);
      font('bold', 9.5);
      ink(INK);
      doc.text(val(v), x, ry + 4.6);
    });
    y += cutH;

    // ---- Notes ---------------------------------------------
    gap();
    sectionHead(L('notes'));
    const noteLines = doc.splitTextToSize(fx(lot.notes || '—'), CW - 12);
    const nh = Math.max(13, noteLines.length * 4.7 + 8);
    stroke(LINE);
    fill([255, 255, 255]);
    doc.roundedRect(M, y, CW, nh, 2, 2, 'S');
    fill(BRAND);
    doc.roundedRect(M, y, 1.8, nh, 1.6, 1.6, 'F');
    doc.rect(M, y, 1.4, nh, 'F');
    font('normal', 9);
    ink(INK);
    doc.text(noteLines, M + 6, y + 6.5);
    y += nh + 4;

    // ---- Footer ------------------------------------------------
    ensure(19);
    const fy = Math.max(y + 3, PH - 22);
    fill(BRAND);
    doc.rect(M, fy, CW, 0.8, 'F');
    font('normal', 7.5);
    ink(MUTED);
    doc.text(`${L('operator')}: ${val(lot.createdBy)}`, M, fy + 6);
    doc.text(`${L('generated')}: ${new Date().toISOString().slice(0, 10)}`, M, fy + 10.5);
    stroke(LINE);
    doc.line(M + 64, fy + 12, M + 116, fy + 12);
    doc.text(L('opSignature'), M + 64, fy + 15.5);

    stroke(LINE);
    fill([255, 255, 255]);
    doc.roundedRect(RIGHT - 17, fy + 1, 17, 16, 2, 2, 'FD');
    font('bold', 5.2);
    ink(MUTED);
    doc.text(L('scan'), RIGHT - 8.5, fy + 6, { align: 'center' });
    font('bold', 6.6);
    ink(INK);
    doc.text(lot.lotNumber || '', RIGHT - 8.5, fy + 11.5, { align: 'center', maxWidth: 15 });

    return doc;
  }
}
