import { AlertTriangle } from 'lucide-react';

export default function ShowcaseNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center space-y-3">
        <AlertTriangle className="size-12 mx-auto text-warning" />
        <h1 className="text-xl font-bold text-slate-900">Página indisponível</h1>
        <p className="text-slate-500 text-sm">O link pode estar incorreto ou a página do buffet ainda não foi publicada.</p>
      </div>
    </div>
  );
}
