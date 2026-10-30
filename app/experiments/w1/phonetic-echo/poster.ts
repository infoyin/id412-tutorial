import { FONT } from "./draw";
import { FOIL, theme } from "./theme";
import type { Entry } from "./words";

// The ⧉ button: the field as a 3:4 poster. A title band, the field itself (cropped to the
// blocks, so the wheel and empty space are left out), the pairs connected this session, and
// a credit line. Light or dark like the page. Returns a PNG data URL.

const W = 1500;
const H = 2000;
const PAD = 90;

export function makePoster(field: HTMLCanvasElement, crop: { x: number; y: number; w: number; h: number }, scale: number, connected: Entry[]) {
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

  // The field, fitted into the middle area.
  const top = PAD + 210 + 50;
  const bottom = H - PAD - 330;
  const boxW = W - PAD * 2;
  const boxH = bottom - top;
  const k = Math.min(boxW / crop.w, boxH / crop.h);
  const dw = crop.w * k;
  const dh = crop.h * k;
  ctx.drawImage(field, crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale, PAD + (boxW - dw) / 2, top + (boxH - dh) / 2, dw, dh);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(PAD, top, boxW, boxH);

  // Connected pairs.
  let y = bottom + 70;
  ctx.fillStyle = ink;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(connected.length ? `已連結 ${connected.length} 組 · 연결 ${connected.length}쌍 · ${connected.length} connected` : "對話開始 · 대화를 시작하세요 · Start a dialogue", PAD, y);
  y += 56;
  ctx.font = `700 40px ${FONT}`;
  const line = connected.map((e) => `${e.hanja} ${e.korean.hangul}`).join("   ");
  let text = line;
  while (text && ctx.measureText(text).width > W - PAD * 2) text = text.slice(0, -2);
  ctx.fillText(text + (text.length < line.length ? " …" : ""), PAD, y);

  // Credit line.
  ctx.fillRect(PAD, H - PAD - 70, W - PAD * 2, 3);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText("Mini Project [ID412] Interactive Space · Yin Jie Chen 진윤제 陳胤傑", PAD, H - PAD - 22);
  ctx.textAlign = "right";
  ctx.fillText("KAIST Visual Instruments Lab", W - PAD, H - PAD - 22);

  return c.toDataURL("image/png");
}
