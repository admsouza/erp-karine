import { MenuIcon } from './Icons';

interface TopbarProps {
  onOpenMenu: () => void;
  apiState: 'checking' | 'online' | 'offline';
  title: string;
}

const API_LABEL: Record<TopbarProps['apiState'], string> = {
  checking: 'Verificando conexão',
  online: 'Conectado',
  offline: 'Sem conexão com a API',
};

const API_COLOR: Record<TopbarProps['apiState'], string> = {
  checking: 'bg-slate-400',
  online: 'bg-emerald-500',
  offline: 'bg-rose-500',
};

/** Barra superior com título da tela, status da API e usuário. */
export function Topbar({ onOpenMenu, apiState, title }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <span className={`h-2 w-2 rounded-full ${API_COLOR[apiState]}`} />
          {API_LABEL[apiState]}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            DR
          </span>
          <span className="hidden text-sm text-slate-700 sm:block">Administração</span>
        </div>
      </div>
    </header>
  );
}
