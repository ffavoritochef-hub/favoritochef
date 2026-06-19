'use client';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
          <h1 className="text-3xl font-bold mb-4">Ocorreu um erro!</h1>
          <p className="text-zinc-400 mb-6">{error.message || 'Algo deu errado.'}</p>
          <button 
            onClick={() => reset()} 
            className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg font-bold transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
