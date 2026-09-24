/* Shared by the birth-details form and the numerology page: a DD / MM / YYYY
   field that formats as you type and validates against the real calendar. */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const digits = v => String(v || '').replace(/\D/g, '');

export function formatDate(raw) {
  const d = digits(raw).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(' / ');
}

/** {iso, error} — real calendar validation, not a length check. */
export function checkDate(raw) {
  const d = digits(raw);
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
