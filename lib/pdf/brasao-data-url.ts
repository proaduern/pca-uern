import fs from "fs";
import path from "path";

let brasaoDataUrlCache: string | null = null;

export function obterBrasaoUernDataUrl(): string {
  if (brasaoDataUrlCache) {
    return brasaoDataUrlCache;
  }

  const candidatos = [
    path.join(process.cwd(), "public", "brasao-uern.jpg"),
    path.join(__dirname, "..", "..", "public", "brasao-uern.jpg"),
    path.join(process.cwd(), "pca-uern", "pca-uern", "public", "brasao-uern.jpg"),
    "C:\\Users\\pedro\\.gemini\\antigravity-ide\\scratch\\pca-uern\\pca-uern\\public\\brasao-uern.jpg",
  ];

  for (const p of candidatos) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const buf = fs.readFileSync(/*turbopackIgnore: true*/ p);
        brasaoDataUrlCache = `data:image/jpeg;base64,${buf.toString("base64")}`;
        return brasaoDataUrlCache;
      }
    } catch {
      // continua procurando
    }
  }

  // Fallback string se não encontrar
  return "";
}
