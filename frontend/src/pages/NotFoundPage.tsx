import { Link } from 'react-router-dom';

/** Página exibida quando a rota não existe. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl font-semibold text-slate-300">404</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-800">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">
        O endereço acessado não existe no sistema.
      </p>
      <Link
        to="/"
        className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Voltar para o dashboard
      </Link>
    </div>
  );
}
