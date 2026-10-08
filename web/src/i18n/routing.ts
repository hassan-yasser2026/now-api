import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localeDetection: false,
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
