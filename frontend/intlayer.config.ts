import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  internationalization: {
	locales: [
	  Locales.ENGLISH,
	  Locales.FRENCH,
	  Locales.ITALIAN,
	],
	defaultLocale: Locales.ENGLISH,
  },
};

export default config;