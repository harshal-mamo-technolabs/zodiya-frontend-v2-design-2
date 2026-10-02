/* Shared by the birth-details form and the numerology page: a DD / MM / YYYY
   field that formats as you type and validates against the real calendar. */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const digits = v => String(v || '').replace(/\D/g, '');

/* Formats as you type and only lets through what can still become a real
   date. Forgiving the way people type: "4" means day 04, "4/5/1990" means
   04 / 05 / 1990, and "35" means day 03 then month 05. Anything that cannot fit
   (a month 13, a year starting with 3) is simply not taken. checkDate does the
   full calendar check once the date is complete. */
export function formatDate(raw) {
  let d = '';
  const take = c => {
    const n = d.length;
    if (n === 0) d = c > '3' ? '0' + c : c;
    else if (n === 1) {
      const day = +(d + c);
      if (day >= 1 && day <= 31) d += c;
      else if (d !== '0') { d = '0' + d; take(c); } // "35": day 03, then 5 starts the month
    }
    else if (n === 2) d += c > '1' ? '0' + c : c;
    else if (n === 3) {
      const mon = +(d.slice(2) + c);
      if (mon >= 1 && mon <= 12) d += c;
      else if (d[2] !== '0') { d = d.slice(0, 2) + '0' + d[2]; take(c); }
    }
    else if (n === 4) { if (c === '1' || c === '2') d += c; }
    else if (n < 8) d += c;
  };
  for (const c of String(raw || '')) {
    if (/\d/.test(c)) take(c);
    // a separator after one digit closes that part: "4/" is day 04
    else if (/[/.\-\s]/.test(c)) {
      if (d.length === 1) d = '0' + d;
      else if (d.length === 3) d = d.slice(0, 2) + '0' + d[2];
    }
  }
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(' / ');
}

/** {iso, error} — real calendar validation, not a length check. */
export function checkDate(raw) {
  const d = digits(raw);
  if (d.length > 0 && d.length < 8) return { iso: null, error: null, partial: true };
  if (d.length < 8) return { iso: null, error: null };
  const day = +d.slice(0, 2), mon = +d.slice(2, 4), year = +d.slice(4, 8);
  const thisYear = new Date().getFullYear();
  if (mon < 1 || mon > 12) return { iso: null, error: 'Month must be 01 to 12' };
  if (year < 1900 || year > thisYear) return { iso: null, error: `Year must be 1900 to ${thisYear}` };
  const len = new Date(year, mon, 0).getDate();
  if (day < 1 || day > len) return { iso: null, error: `${MONTHS[mon - 1]} ${year} has ${len} days` };
  return { iso: `${year}-${d.slice(2, 4)}-${d.slice(0, 2)}`, error: null };
}

/** "12 / 09 / 1997" from "1997-09-12" */
export function isoToInput(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d} / ${m} / ${y}` : '';
}

/** ['9','30'] from "930", ['15','20'] from "1520" — a 3-digit entry is h:mm, not hh:m. */
function splitTime(raw) {
  const d = digits(raw).slice(0, 4);
  if (d.length <= 2) return [d, ''];
  if (d.length === 3) return +d.slice(0, 2) > 23 ? [d.slice(0, 1), d.slice(1, 3)] : [d.slice(0, 2), d.slice(2, 3)];
  return [d.slice(0, 2), d.slice(2, 4)];
}
export const formatTime = raw => splitTime(raw).filter(Boolean).join(' : ');
export function checkTime(raw) {
  const [H, M] = splitTime(raw);
  if (!H || M.length < 2) return { hm: null, error: null };
  const hh = +H, mm = +M;
  if (hh > 23) return { hm: null, error: 'Hour must be 00–23' };
  if (mm > 59) return { hm: null, error: 'Minute must be 00–59' };
  return { hm: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, error: null };
}

/** "38°43′N 9°08′W" */
export function coordText(lat, lon) {
  const f = (v, pos, neg) => {
    const a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′${v < 0 ? neg : pos}`;
  };
  return f(lat, 'N', 'S') + ' ' + f(lon, 'E', 'W');
}
