import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiConnectionState } from '../../shared/hooks/useApiHealth';
import { MenuIcon } from '../../shared/components/Icons';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface TopbarProps {
  onOpenMenu: () => void;
  apiState: ApiConnectionState;
  title: string;
}

const API_LABEL: Record<ApiConnectionState, string> = {
  checking: 'Verificando conexão',
  online: 'Conectado',
  offline: 'Sem conexão com a API',
};

const API_COLOR: Record<ApiConnectionState, string> = {
  checking: 'bg-slate-400',
  online: 'bg-emerald-500',
  offline: 'bg-rose-500',
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/** Barra superior com título da tela, status da API e menu do usuário. */
export function Topbar({ onOpenMenu, apiState, title }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!menuRef.current?.contains(evento.target as Node)) setMenuAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [menuAberto]);

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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {iniciais(user?.name ?? '')}
            </span>
            <span className="hidden max-w-[160px] truncate text-sm text-slate-700 sm:block">
              {user?.name ?? 'Sessão'}
            </span>
          </button>

          {menuAberto && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link
                to="/trocar-senha"
                role="menuitem"
                onClick={() => setMenuAberto(false)}
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Alterar senha
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuAberto(false);
                  void logout();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
