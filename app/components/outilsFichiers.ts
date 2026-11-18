// Outils utilisés dans le navigateur : lecture des fichiers, image de la 1re page d'un PDF, découpe de la photo

export function lireBase64(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result).split(",")[1] || "");
    lecteur.onerror = () => reject(new Error("Fichier illisible"));
    lecteur.readAsDataURL(fichier);
  });
}

export function typeAccepte(fichier: File): string | null {
  const nom = fichier.name.toLowerCase();
  if (fichier.type === "application/pdf" || nom.endsWith(".pdf")) return "application/pdf";
  if (fichier.type.startsWith("image/")) return fichier.type;
  return null;
}

// Dessine la 1re page (PDF) ou l'image dans un canvas d'environ 1100 px de large
export async function premierePage(fichier: File): Promise<HTMLCanvasElement | null> {
  try {
    const canvas = document.createElement("canvas");
    if (typeAccepte(fichier) === "application/pdf") {
      const pdfjs: any = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) }).promise;
      const page = await doc.getPage(1);
      const echelle = 1100 / page.getViewport({ scale: 1 }).width;
      const vue = page.getViewport({ scale: echelle });
      canvas.width = Math.round(vue.width);
      canvas.height = Math.round(vue.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport: vue } as any).promise;
      return canvas;
    }
    const url = URL.createObjectURL(fichier);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const echelle = Math.min(1, 1600 / img.width);
    canvas.width = Math.round(img.width * echelle);
    canvas.height = Math.round(img.height * echelle);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return canvas;
  } catch (e) {
    console.error("Première page non lue", e);
    return null;
  }
}

export function canvasEnJpegBase64(canvas: HTMLCanvasElement, qualite = 0.75): string {
  return canvas.toDataURL("image/jpeg", qualite).split(",")[1] || "";
}

// Découpe la photo (cadre [ymin, xmin, ymax, xmax] de 0 à 1000) et la réduit à 240 px de large
export function decouperPhoto(canvas: HTMLCanvasElement, cadre: number[] | null | undefined): string | null {
  if (!cadre || cadre.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = cadre.map((v) => Math.max(0, Math.min(1000, Number(v) || 0)));
  if (ymax - ymin < 20 || xmax - xmin < 20) return null;
  const marge = 0.03;
  const x = Math.max(0, (xmin / 1000 - marge) * canvas.width);
  const y = Math.max(0, (ymin / 1000 - marge) * canvas.height);
  const l = Math.min(canvas.width - x, ((xmax - xmin) / 1000 + 2 * marge) * canvas.width);
  const h = Math.min(canvas.height - y, ((ymax - ymin) / 1000 + 2 * marge) * canvas.height);
  const sortie = document.createElement("canvas");
  sortie.width = 240;
  sortie.height = Math.round((240 * h) / l);
  sortie.getContext("2d")!.drawImage(canvas, x, y, l, h, 0, 0, sortie.width, sortie.height);
  return sortie.toDataURL("image/jpeg", 0.8);
}
