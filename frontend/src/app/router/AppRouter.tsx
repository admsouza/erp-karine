import { Navigate, Route, Routes } from 'react-router-dom';
import { AgendaPage } from '../../features/appointments/pages/AgendaPage';
import { ClientsPage } from '../../features/clients/pages/ClientsPage';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { ExamsPage } from '../../features/exams/pages/ExamsPage';
import { FinancialPage } from '../../features/financial/pages/FinancialPage';
import { ProtocolsPage } from '../../features/protocols/pages/ProtocolsPage';
import { SubscriptionsPage } from '../../features/subscriptions/pages/SubscriptionsPage';
import { AdminLayout } from '../layout/AdminLayout';
import { NotFoundPage } from './NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/assinaturas" element={<SubscriptionsPage />} />
        <Route path="/financeiro" element={<FinancialPage />} />
        <Route path="/protocolos" element={<ProtocolsPage />} />
        <Route path="/exames" element={<ExamsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
