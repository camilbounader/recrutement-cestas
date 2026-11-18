// Copie le « moteur » de lecture des PDF dans /public, pour que le navigateur puisse afficher la 1re page des CV
// (sert à découper la photo du candidat). Lancé automatiquement après chaque npm install.
import { copyFileSync, existsSync } from "node:fs";

const source = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
if (existsSync(source)) {
  copyFileSync(source, "public/pdf.worker.min.mjs");
  console.log("Lecteur PDF copié dans public/");
} else {
  console.log("pdfjs-dist absent : lecteur PDF non copié");
}
