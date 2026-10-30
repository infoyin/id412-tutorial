import { FONT } from "./draw";
import { FOIL, theme } from "./theme";
import type { Entry } from "./words";

// The camera button: the field as a 3:4 poster. A title band, the field itself (cropped to
// the blocks, so the wheel and empty space are left out), a table of every pair in the picture,
// and a credit line. Light or dark like the page. Returns a PNG data URL.

const W = 1500;
const H = 2000;
const PAD = 90;

export function makePoster(
  field: HTMLCanvasElement,
  crop: { x: number; y: number; w: number; h: number },
  scale: number,
  shown: Entry[],
  connected: Set<string>,
) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const dark = theme.dark;
  const ink = theme.ink;
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, W, H);

  // Title band.
  ctx.fillStyle = dark ? FOIL.light : ink;
  ctx.fillRect(PAD, PAD, W - PAD * 2, 210);
  ctx.fillStyle = dark ? FOIL.ink : theme.paper;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 96px ${FONT}`;
  ctx.fillText("臺韓對話", PAD + 40, PAD + 120);
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText("대한 대화 · TW-KR DIALOGUE", PAD + 44, PAD + 178);
  const d = new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  ctx.textAlign = "right";
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(date, W - PAD - 40, PAD + 120);
  ctx.textAlign = "left";

  // The word table under the field: every pair in the picture, two columns.
  // ● = connected this session, ≠ = false friend.
  const cols = 2;
  const rowH = 58;
  const rows = Math.ceil(shown.length / cols);
  const tableH = 60 + rows * rowH;

  // The field, fitted into the middle area.
  const top = PAD + 210 + 50;
  const bottom = H - PAD - 110 - tableH;
  const boxW = W - PAD * 2;
  const boxH = bottom - top;
  const k = Math.min(boxW / crop.w, boxH / crop.h);
  const dw = crop.w * k;
  const dh = crop.h * k;
  ctx.drawImage(field, crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale, PAD + (boxW - dw) / 2, top + (boxH - dh) / 2, dw, dh);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(PAD, top, boxW, boxH);

  // Table header.
  let y = bottom + 56;
  ctx.fillStyle = ink;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("單字對照 · 단어 대조 · Word Pairs", PAD, y);
  ctx.textAlign = "right";
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText("● 已連結 · 연결됨 · connected    ≠ 偽友 · 가짜 친구 · false friend", W - PAD, y);
  ctx.textAlign = "left";
  y += 16;
  ctx.fillRect(PAD, y, W - PAD * 2, 2);

  // Rows: mark, 漢字, Tâi-lô, Hangul, romanization.
  const colW = (W - PAD * 2 - 40) / cols;
  shown.forEach((e, i) => {
    const x = PAD + (i % cols) * (colW + 40);
    const ry = y + 42 + Math.floor(i / cols) * rowH;
    const mark = e.status === "false_friend" ? "≠" : connected.has(e.id) ? "●" : "";
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(mark, x, ry);
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(e.hanja, x + 36, ry);
    let cx = x + 36 + ctx.measureText(e.hanja).width + 14;
    ctx.font = `400 22px "Helvetica Neue", Arial, ${FONT}`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(e.taiwanese.tailo, cx, ry);
    cx = x + colW * 0.56;
    ctx.globalAlpha = 1;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(e.korean.hangul, cx, ry);
    cx += ctx.measureText(e.korean.hangul).width + 14;
    ctx.font = `400 22px "Helvetica Neue", Arial, ${FONT}`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(e.korean.romanization, cx, ry);
    ctx.globalAlpha = 1;
    ctx.fillRect(x, ry + 18, colW, 1); // a thin rule under each row
  });

  // Credit line.
  ctx.fillRect(PAD, H - PAD - 70, W - PAD * 2, 3);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText("Created by Yin Jie Chen", PAD, H - PAD - 22);
  ctx.textAlign = "right";
  ctx.fillText("KAIST Visual Instruments Lab", W - PAD, H - PAD - 22);

  return c.toDataURL("image/png");
}
