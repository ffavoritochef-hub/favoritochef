'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  UtensilsCrossed,
  Smartphone,
  Download,
  CheckCircle2,
  EllipsisVertical,
  Share,
  SquarePlus,
  ArrowLeft,
  Monitor,
} from 'lucide-react';

type Platform = 'android' | 'ios';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <p className="font-semibold text-slate-900 leading-snug">{title}</p>
        {children && <div className="mt-1 text-sm text-slate-600 leading-relaxed">{children}</div>}
      </div>
    </li>
  );
}

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-slate-50 px-1.5 py-0.5 text-[13px] font-semibold text-slate-800 align-middle">
    {children}
  </span>
);

/** Manual público de instalação do app (PWA) no Android e no iPhone. */
export default function InstalarPage() {
  const [platform, setPlatform] = useState<Platform>('android');
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIOS) setPlatform('ios');
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installNow() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <UtensilsCrossed className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Instale o app no celular</h1>
          <p className="text-sm text-slate-500">
            O Agenda Buffet funciona como um aplicativo: fica com ícone na tela inicial, abre em tela cheia e não
            precisa de loja. Leva menos de 1 minuto.
          </p>
        </header>

        {installed && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>O app já está instalado neste aparelho.</strong> Procure o ícone &quot;Agenda Buffet&quot; na tela inicial.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-white p-1">
          {(
            [
              ['android', 'Android'],
              ['ios', 'iPhone / iPad'],
            ] as [Platform, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPlatform(k)}
              className={cn(
                'min-h-[44px] rounded-xl text-sm font-semibold transition',
                platform === k ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {platform === 'android' ? (
          <section className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Smartphone className="size-5 text-primary" /> Android
            </h2>

            {prompt && !installed && (
              <div className="space-y-2 rounded-xl bg-primary/5 p-4">
                <p className="text-sm text-slate-700">Seu celular permite instalar direto por aqui:</p>
                <Button onClick={installNow} size="lg" className="w-full gap-2 rounded-xl">
                  <Download className="size-5" /> Instalar agora
                </Button>
                <p className="text-xs text-slate-500">Se o botão não funcionar, siga os passos abaixo.</p>
              </div>
            )}

            <ol className="space-y-4">
              <Step n={1} title="Abra o site no Google Chrome">
                Acesse <strong>gerenciabuffet.digital</strong> pelo Chrome (não pelo navegador do WhatsApp ou do
                Instagram). Se abriu por um link, toque nos 3 pontinhos e escolha <Key>Abrir no Chrome</Key>.
              </Step>
              <Step n={2} title="Toque no menu do Chrome">
                São os 3 pontinhos <Key><EllipsisVertical className="size-3.5" /></Key> no canto superior direito.
              </Step>
              <Step n={3} title='Escolha "Instalar app"'>
                Em alguns celulares aparece como <Key>Adicionar à tela inicial</Key>.
              </Step>
              <Step n={4} title='Confirme em "Instalar"'>
                O ícone <strong>Agenda Buffet</strong> aparece na tela inicial. Abra por ele daqui em diante.
              </Step>
            </ol>

            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Samsung Internet: toque em <Key>☰</Key> e depois em <Key>Adicionar página a</Key> →{' '}
              <Key>Tela inicial</Key>.
            </p>
          </section>
        ) : (
          <section className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Smartphone className="size-5 text-primary" /> iPhone / iPad
            </h2>
            <ol className="space-y-4">
              <Step n={1} title="Abra o site no Safari">
                Acesse <strong>gerenciabuffet.digital</strong> pelo <strong>Safari</strong> (no iPhone, só o Safari
                consegue instalar). Se abriu pelo WhatsApp ou Instagram, toque em <Key>Abrir no Safari</Key>.
              </Step>
              <Step n={2} title="Toque no botão Compartilhar">
                É o quadrado com a seta para cima <Key><Share className="size-3.5" /></Key>, na barra de baixo (no
                iPad fica no topo).
              </Step>
              <Step n={3} title='Escolha "Adicionar à Tela de Início"'>
                Role a lista para baixo até achar <Key><SquarePlus className="size-3.5" /> Adicionar à Tela de Início</Key>.
              </Step>
              <Step n={4} title='Toque em "Adicionar"'>
                No canto superior direito. O ícone <strong>Agenda Buffet</strong> aparece na tela inicial.
              </Step>
            </ol>
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Não achou a opção? Confira se está no Safari e não numa aba anônima. Em iOS mais novos, ela pode estar
              em <Key>Compartilhar</Key> → <Key>Mais</Key>.
            </p>
          </section>
        )}

        <section className="space-y-3 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Monitor className="size-5 text-primary" /> No computador
          </h2>
          <p className="text-sm text-slate-600">
            No Chrome ou Edge, clique no ícone de instalar <Key><Download className="size-3.5" /></Key> no fim da barra
            de endereço, ou no menu → <Key>Instalar Agenda Buffet</Key>. Também dá para usar direto pelo navegador.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-white p-5 text-sm text-slate-600 sm:p-6">
          <h2 className="text-base font-bold text-slate-900">Dúvidas comuns</h2>
          <p>
            <strong>Precisa baixar da Play Store ou App Store?</strong> Não. A instalação é feita pelo navegador, como
            mostrado acima.
          </p>
          <p>
            <strong>Ocupa espaço?</strong> Quase nada. Os dados ficam salvos no sistema, não no celular.
          </p>
          <p>
            <strong>Preciso atualizar?</strong> Não. Toda melhoria chega sozinha ao abrir o app.
          </p>
          <p>
            <strong>Vou precisar entrar de novo?</strong> Sim, na primeira vez que abrir pelo ícone, entre com seu
            e-mail e senha.
          </p>
        </section>

        <Button asChild size="lg" variant="outline" className="w-full rounded-xl">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    </div>
  );
}
