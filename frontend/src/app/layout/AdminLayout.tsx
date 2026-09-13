import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApiHealth } from '../../shared/hooks/useApiHealth';
import { NAV_ITEMS } from './navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Estrutura administrativa: menu lateral + barra superior + conteúdo. */
export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const apiState = useApiHealth();

  const current = NAV_ITEMS.find((item) => item.to === location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMenu={() => setMenuOpen(true)}
          apiState={apiState}
          title={current?.label ?? 'ERP Clínica'}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
          ERP Clínica — sistema interno de gestão
        </footer>
      </div>
    </div>
  );
}
