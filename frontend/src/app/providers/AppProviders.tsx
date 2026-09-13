import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

/** Providers globais da aplicação (roteamento, tema, etc.). */
export function AppProviders({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
