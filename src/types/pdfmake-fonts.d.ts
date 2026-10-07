// src/types/pdfmake-fonts.d.ts
declare module "pdfmake/fonts/Roboto" {
  type PdfMakeFontFaces = {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };

  const fonts: {
    Roboto: PdfMakeFontFaces;
  };

  export default fonts;
}
