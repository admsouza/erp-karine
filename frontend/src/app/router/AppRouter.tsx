import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { ClientsPage } from '../../features/clients/pages/ClientsPage';
import { ClientDetailPage } from '../../features/clients/pages/ClientDetailPage';
import { AgendaPage } from '../../features/appointments/pages/AgendaPage';
import { SubscriptionsPage } from '../../features/subscriptions/pages/SubscriptionsPage';
import { FinancialPage } from '../../features/financial/pages/FinancialPage';
import { ProtocolsPage } from '../../features/protocols/pages/ProtocolsPage';
import { ExamsPage } from '../../features/exams/pages/ExamsPage';
import { NotFoundPage } from './NotFoundPage';

/** Rotas da aplicação. Cada página vive dentro da sua feature. */
export function AppRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/:id" element={<ClientDetailPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="assinaturas" element={<SubscriptionsPage />} />
        <Route path="financeiro" element={<FinancialPage />} />
        <Route path="protocolos" element={<ProtocolsPage />} />
        <Route path="exames" element={<ExamsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
