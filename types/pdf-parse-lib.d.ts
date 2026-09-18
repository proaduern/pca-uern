// pdf-parse@1.x's package root (index.js) runs a debug-mode branch on module
// evaluation whenever bundlers (Turbopack/webpack) don't preserve `module.parent`,
// crashing with ENOENT trying to read its own test fixture. Importing the inner
// module directly skips that branch entirely — see lib/pdf-extrair-texto.ts.
declare module "pdf-parse/lib/pdf-parse.js" {
  import type PdfParse from "pdf-parse";
  const parse: typeof PdfParse;
  export default parse;
}
