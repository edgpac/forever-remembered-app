import { createContext, useContext, useEffect, useState } from "react";
import { T } from "./translations";

export type Lang = "en" | "es";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof T.en;
};

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: T.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("fh-lang") as Lang | null;
    if (stored === "en" || stored === "es") setLangState(stored);
  }, []);

  // Keep <html lang> in sync
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("fh-lang", l);
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
