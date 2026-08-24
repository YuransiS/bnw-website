/**
 * Ukrainian and Russian Cyrillic Transliteration & Slug Generator
 * Converts human readable step names (e.g. "Урок 1 (Контент)", "Здача ДЗ", "Клік по офферу 390")
 * into clean, URL-safe and variable-safe slugs (e.g. "urok_1_kontent", "zdacha_dz", "klik_po_offeru_390").
 */

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
  'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
  'я': 'ya', 'ы': 'y', 'э': 'e', 'ё': 'yo', 'ъ': ''
};

export function transliterateToSlug(input: string): string {
  if (!input || !input.trim()) return 'step';

  const lower = input.trim().toLowerCase();
  let result = '';

  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    if (CYRILLIC_MAP[char] !== undefined) {
      result += CYRILLIC_MAP[char];
    } else if (/[a-z0-9]/.test(char)) {
      result += char;
    } else {
      result += '_';
    }
  }

  // Clean duplicate underscores and leading/trailing underscores
  const cleanSlug = result
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleanSlug || 'step';
}
