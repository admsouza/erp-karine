import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { CloseIcon } from '../../shared/components/Icons';
import { navItemsPara } from './navigation';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Menu lateral administrativo. Em telas pequenas funciona como gaveta. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const itens = navItemsPara(user?.role);
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div>
            <p className="text-sm font-semibold text-white">ERP Clínica</p>
            <p className="text-[11px] text-slate-400">Gestão da clínica</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {itens.map(({ label, to, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-600/90 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <ItemIcon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-slate-500">
          Versão 0.1.0
        </div>
      </aside>
    </>
  );
}
