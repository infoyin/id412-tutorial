import { useEffect, useState } from "react";
import styles from "./page.module.css";

// Top right: the time in Taipei, now and then the time in Seoul (in Korean), one hour apart.
//   臺北 2026.10.31（六）11:32:54 AM   ↔   서울 2026.10.31 (토) 오후 12:32:54
// Rendered only after mount, so the server's time never mismatches the browser's.

const SWITCH = 6; // seconds each city is shown
const ZH_DAYS = "日一二三四五六";
const KO_DAYS = "일월화수목금토";

// The parts of `date` as seen in `timeZone`.
function partsIn(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const hour = p.hour.padStart(2, "0");
  return { date: `${p.year}.${p.month}.${p.day}`, day, time: `${hour}:${p.minute}:${p.second}`, pm: p.dayPeriod === "PM" };
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (!now) return null;
  const korean = Math.floor(now.getTime() / 1000 / SWITCH) % 2 === 1;
  const t = partsIn(now, korean ? "Asia/Seoul" : "Asia/Taipei");

  return (
    <p className={styles.clock} aria-live="off" data-clock>
      {korean ? (
        <span key="ko" lang="ko">
          <b>서울</b> {t.date} ({KO_DAYS[t.day]}) {t.pm ? "오후" : "오전"} {t.time}
        </span>
      ) : (
        <span key="zh" lang="zh-Hant">
          <b>臺北</b> {t.date}（{ZH_DAYS[t.day]}）{t.time} {t.pm ? "PM" : "AM"}
        </span>
      )}
    </p>
  );
}
