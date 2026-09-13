import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { RequireAuth } from '../../features/auth/components/RequireAuth';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { ChangePasswordPage } from '../../features/auth/pages/ChangePasswordPage';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { ClientsPage } from '../../features/clients/pages/ClientsPage';
import { ProceduresPage } from '../../features/procedures/pages/ProceduresPage';
import { ProcedureDetailPage } from '../../features/procedures/pages/ProcedureDetailPage';
import { ClientDetailPage } from '../../features/clients/pages/ClientDetailPage';
import { AgendaPage } from '../../features/appointments/pages/AgendaPage';
import { SubscriptionsPage } from '../../features/subscriptions/pages/SubscriptionsPage';
import { FinancialPage } from '../../features/financial/pages/FinancialPage';
import { ProtocolsPage } from '../../features/protocols/pages/ProtocolsPage';
import { ProtocolDetailPage } from '../../features/protocols/pages/ProtocolDetailPage';
import { ExamsPage } from '../../features/exams/pages/ExamsPage';
import { AuditPage } from '../../features/audit/pages/AuditPage';
import { RequireRole } from '../../features/auth/components/RequireRole';
import { NotFoundPage } from './NotFoundPage';

/**
 * Rotas da aplicação.
 *
 * `/login` é pública. `/trocar-senha` exige sessão (e é obrigatória quando a
 * senha é temporária). Todo o resto passa por `RequireAuth`.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/trocar-senha" element={<ChangePasswordPage />} />

        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/procedimentos" element={<ProceduresPage />} />
          <Route path="/procedimentos/:id" element={<ProcedureDetailPage />} />
          <Route path="/assinaturas" element={<SubscriptionsPage />} />
          <Route path="/financeiro" element={<FinancialPage />} />
          <Route path="/protocolos" element={<ProtocolsPage />} />
          <Route path="/protocolos/:id" element={<ProtocolDetailPage />} />
          <Route path="/exames" element={<ExamsPage />} />
          <Route path="/auditoria" element={<RequireRole role="ADMIN"><AuditPage /></RequireRole>} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
