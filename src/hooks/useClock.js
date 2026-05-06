import { useState, useEffect } from 'react';

export function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const p = (n) => String(n).padStart(2, '0');

export function fmtTime(d) {
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtHM(d) {
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtDate(d) {
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function elapsed(startMs, nowMs) {
  let s = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return `${p(h)}:${p(m)}:${p(s)}`;
}
