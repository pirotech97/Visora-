declare module 'html-to-pdfmake' {
  function htmlToPdfmake(html: string, options?: any): any;
  export = htmlToPdfmake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: any;
  export = pdfFonts;
}
