import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, dictFor, type Dict, type Lang } from '@/lib/i18n';

const LANG_KEY = 'pizza-planner/lang';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dict: Dict;
}

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => undefined,
  dict: dictFor(DEFAULT_LANG),
});

function getStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} | null {
  try {
    // Lazy require so unit tests never load the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    return AsyncStorage.default ?? AsyncStorage;
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    let active = true;
    const storage = getStorage();
    if (!storage) return;
    void storage
      .getItem(LANG_KEY)
      .then((raw) => {
        if (active && (raw === 'da' || raw === 'en')) setLangState(raw);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    const storage = getStorage();
    if (storage) void storage.setItem(LANG_KEY, next).catch(() => undefined);
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang, dict: dictFor(lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
