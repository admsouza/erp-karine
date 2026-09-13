import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AgendaPage } from './pages/AgendaPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExamsPage } from './pages/ExamsPage';
import { FinancialPage } from './pages/FinancialPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtocolsPage } from './pages/ProtocolsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';

export function App() {
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
