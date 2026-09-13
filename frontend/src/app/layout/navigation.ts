import {
  AuditIcon,
  CalendarIcon,
  ClientsIcon,
  DashboardIcon,
  ExamIcon,
  FinancialIcon,
  IntegrationIcon,
  ProcedureIcon,
  ProtocolIcon,
  SubscriptionIcon,
  UsersIcon,
} from '../../shared/components/Icons';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof DashboardIcon;
  /** Perfis que enxergam o item; ausente = todos. */
  roles?: ('ADMIN' | 'USER')[];
  /** Seção do menu (ex.: "Sistema"). Ausente = item de primeiro nível. */
  group?: string;
}

/** Grupos do menu, na ordem em que aparecem. */
export const NAV_GROUPS = ['Sistema'] as const;

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
  // Seção Sistema: administração do próprio sistema (hoje toda de ADMIN).
  { label: 'Auditoria', to: '/sistema/auditoria', icon: AuditIcon, roles: ['ADMIN'], group: 'Sistema' },
  { label: 'Usuários', to: '/sistema/usuarios', icon: UsersIcon, roles: ['ADMIN'], group: 'Sistema' },
  { label: 'Integração', to: '/sistema/integracoes', icon: IntegrationIcon, roles: ['ADMIN'], group: 'Sistema' },
];

/** Itens visíveis para o perfil informado (regra também aplicada no backend). */
export function navItemsPara(role: 'ADMIN' | 'USER' | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role ? item.roles.includes(role) : false));
}

/** Itens de primeiro nível (sem seção). */
export function navItemsRaizPara(role: 'ADMIN' | 'USER' | undefined): NavItem[] {
  return navItemsPara(role).filter((item) => !item.group);
}

/** Itens de uma seção do menu. */
export function navItemsDoGrupoPara(role: 'ADMIN' | 'USER' | undefined, grupo: string): NavItem[] {
  return navItemsPara(role).filter((item) => item.group === grupo);
}
