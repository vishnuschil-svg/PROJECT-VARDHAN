import { createContext, useContext, useMemo, useState } from "react";
import { formatLocalDate, formatMoney, getLocaleSettings, t } from "../services/localizationService";

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState("en-IN");
  const value = useMemo(() => ({
    locale,
    setLocale,
    settings: getLocaleSettings(locale),
    t: (key) => t(key, locale),
    formatMoney: (amount, currency) => formatMoney(amount, locale, currency),
    formatDate: (date) => formatLocalDate(date, locale),
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
