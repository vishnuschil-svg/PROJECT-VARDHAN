import { translations } from "../i18n/translations.js";
import { LOCALE_CONFIGS } from "../locales/localeConfig.js";

export function getLocaleSettings(locale = "en-IN") {
  return LOCALE_CONFIGS[locale] || LOCALE_CONFIGS["en-IN"];
}

export function formatMoney(value, locale = "en-IN", currency) {
  const settings = getLocaleSettings(locale);
  return new Intl.NumberFormat(settings.numberFormat, {
    style: "currency",
    currency: currency || settings.currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatLocalDate(value, locale = "en-IN") {
  const settings = getLocaleSettings(locale);
  return new Intl.DateTimeFormat(settings.dateFormat, { timeZone: settings.timezone }).format(new Date(value));
}

export function t(key, locale = "en-IN") {
  return translations[locale]?.[key] || translations["en-IN"]?.[key] || key;
}
