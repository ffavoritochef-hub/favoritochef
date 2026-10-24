'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { slugify } from '@/lib/leads';

/** Cartão para imprimir: nome do buffet, QR grande e o link por extenso. */
async function renderCard(url: string, name: string): Promise<string> {
  const size = 1200;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { width: 900, margin: 0, errorCorrectionLevel: 'M' });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Inter, Arial, sans-serif';
  ctx.fillText(name.length > 30 ? name.slice(0, 29) + '…' : name, size / 2, 130);
  ctx.font = '40px Inter, Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Aponte a câmera e conheça nosso buffet', size / 2, 200);
  ctx.drawImage(qr, (size - 900) / 2, 270);
  ctx.font = '32px Inter, Arial, sans-serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), size / 2, 1260);
  return canvas.toDataURL('image/png');
}

export function ShowcaseQrDialog({
  open,
  onOpenChange,
  url,
  name,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string;
  name: string;
}) {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    renderCard(url, name)
      .then((d) => alive && setImg(d))
      .catch(() => toast.error('Não foi possível gerar o QR Code.'));
    return () => {
      alive = false;
    };
  }, [open, url, name]);

  const download = () => {
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `qrcode-${slugify(name) || 'vitrine'}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm !rounded-2xl">
        <DialogHeader>
          <DialogTitle>QR Code da vitrine</DialogTitle>
          <DialogDescription>Imprima e coloque no balcão, nas mesas dos eventos, em cartões e panfletos.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-white p-2">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={`QR Code para ${url}`} className="w-full h-auto" />
          ) : (
            <div className="aspect-[4/5] flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        <Button type="button" onClick={download} disabled={!img} className="w-full min-h-[48px] gap-2">
          <Download className="size-4" /> Baixar imagem (PNG)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
