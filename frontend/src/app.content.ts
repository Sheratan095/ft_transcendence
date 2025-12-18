import { t, type Dictionary } from "intlayer";

const appContent = {
  key: "app",
  content: {
    viteLogo: t({
      en: "Vite logo",
      fr: "Logo Vite",
      es: "Logo Vite",
    }),
    reactLogo: t({
      en: "Logo",
      fr: "Logo",
      es: "Logo",
    }),

    title: "Vite + TypeScript",

    count: t({
      en: "count is ",
      fr: "le compte est ",
      es: "el recuento es ",
    }),

    edit: t({
      en: 'Edit <code>src/main.ts</code> and save to test HMR',
      fr: 'Éditez <code>src/main.ts</code> et enregistrez pour tester HMR',
      es: 'Edita <code>src/main.ts</code> y guarda para probar HMR',
    }),

    readTheDocs: t({
      en: "Click on the Vite logo to learn more",
      fr: "Cliquez sur le logo Vite pour en savoir plus",
      es: "Haga clic en el logotipo de Vite para obtener más información",
    }),
  },
} satisfies Dictionary;

export default appContent;