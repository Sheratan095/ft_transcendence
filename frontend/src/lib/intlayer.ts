type Dict = Record<string, string>;
const dictionaries: Record<string, Dict> = {};
let currentLocale = 'en';

export function registerDictionary(locale: string, dict: Dict) {
  dictionaries[locale] = { ...(dictionaries[locale] || {}), ...dict };
}

export function setLocale(locale: string) {
  currentLocale = locale;
  try { localStorage.setItem('locale', locale); } catch {}
}

export function getLocale() {
  try { return localStorage.getItem('locale') || currentLocale; } catch { return currentLocale; }
}

export function t(key: string, vars?: Record<string, string | number>) {
  const dict = dictionaries[currentLocale] || {};
  let str = dict[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      str = String(str).replace(re, String(vars[k]));
    }
  }
  return str;
}

