async function resizeToBlob(file: File, maxSize: number, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Navegador sem suporte a imagens.');
    if (type === 'image/jpeg') {
      // JPEG não tem transparência: fundo branco em vez de preto
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao converter imagem.'))), type, quality)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Redimensiona uma imagem no navegador e devolve PNG (mantém transparência). */
export function resizeToPngBlob(file: File, maxSize = 512): Promise<Blob> {
  return resizeToBlob(file, maxSize, 'image/png');
}

/** Redimensiona e comprime uma foto no navegador (JPEG), para galerias. */
export function resizeToJpegBlob(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  return resizeToBlob(file, maxSize, 'image/jpeg', quality);
}
