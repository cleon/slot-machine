import en from '../assets/l10n/en.json'
import es from '../assets/l10n/es.json'

const DICTS = { en, es } as const
export type Lang = keyof typeof DICTS

export function createI18n(lang: Lang) {
  const dict: Record<string, string> = DICTS[lang]
  const fallback: Record<string, string> = DICTS.en
  return {
    lang,
    locale: lang === 'es' ? 'es-ES' : 'en-US',
    t(key: string, vars?: Record<string, string | number>): string {
      let value = dict[key] ?? fallback[key] ?? key
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          value = value.replaceAll(`{{${name}}}`, String(replacement))
        }
      }
      return value
    },
  }
}

export type I18n = ReturnType<typeof createI18n>
