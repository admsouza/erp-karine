import {
  CalendarIcon,
  ClientsIcon,
  DashboardIcon,
  ExamIcon,
  FinancialIcon,
  ProcedureIcon,
  ProtocolIcon,
  SubscriptionIcon,
} from '../../shared/components/Icons';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof DashboardIcon;
}

/** Itens do menu lateral administrativo. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: DashboardIcon },
  { label: 'Clientes', to: '/clientes', icon: ClientsIcon },
  { label: 'Agenda', to: '/agenda', icon: CalendarIcon },
  { label: 'Procedimentos', to: '/procedimentos', icon: ProcedureIcon },
  { label: 'Assinaturas', to: '/assinaturas', icon: SubscriptionIcon },
  { label: 'Financeiro', to: '/financeiro', icon: FinancialIcon },
  { label: 'Protocolos', to: '/protocolos', icon: ProtocolIcon },
  { label: 'Exames', to: '/exames', icon: ExamIcon },
];
