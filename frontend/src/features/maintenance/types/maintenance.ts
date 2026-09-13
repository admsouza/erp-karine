export const MAINTENANCE_TYPES = {
  RESOURCE_ACCOUNT: 'Locais do recurso',
  CLIENT: 'Clientes',
  PROCEDURE: 'Procedimentos',
  SUBSCRIPTION_PLAN: 'Planos de assinatura',
} as const;
export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export const MAINTENANCE_TYPE_ORDER: MaintenanceType[] = [
  'RESOURCE_ACCOUNT',
  'CLIENT',
  'PROCEDURE',
  'SUBSCRIPTION_PLAN',
];

export interface MaintenanceItem {
  id: string;
  type: MaintenanceType;
  label: string;
  secondary: string;
  active: boolean;
  updatedAt: string | null;
  /** Valores atuais dos campos editáveis (preenchem o formulário). */
  values: Record<string, string | number | null>;
}

export interface MaintenancePage {
  items: MaintenanceItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Campos que o hub consegue corrigir em cada tipo de cadastro. */
export interface MaintenanceField {
  key: 'name' | 'kind' | 'phone' | 'unit' | 'priceCents';
  label: string;
  options?: { value: string; label: string }[];
  moeda?: boolean;
}

const TIPO_LOCAL = [
  { value: 'CASH', label: 'Espécie' },
  { value: 'BANK', label: 'Banco' },
  { value: 'CARD', label: 'Conta de maquineta' },
];
const UNIDADE = [
  { value: 'SESSAO', label: 'Sessão' },
  { value: 'APLICACAO', label: 'Aplicação' },
  { value: 'REGIAO', label: 'Região' },
  { value: 'ML', label: 'ml' },
  { value: 'UNIDADE', label: 'Unidade' },
  { value: 'HORA', label: 'Hora' },
  { value: 'PACOTE', label: 'Pacote/Combo' },
];

/** Tela do módulo dono, para cadastrar o que a manutenção não cria. */
export const MAINTENANCE_HOME: Record<MaintenanceType, string> = {
  RESOURCE_ACCOUNT: '/financeiro',
  CLIENT: '/clientes',
  PROCEDURE: '/procedimentos',
  SUBSCRIPTION_PLAN: '/assinaturas',
};

export const MAINTENANCE_FIELDS: Record<MaintenanceType, MaintenanceField[]> = {
  RESOURCE_ACCOUNT: [
    { key: 'name', label: 'Identificação do local' },
    { key: 'kind', label: 'Tipo de local', options: TIPO_LOCAL },
  ],
  CLIENT: [
    { key: 'name', label: 'Nome do cliente' },
    { key: 'phone', label: 'Telefone' },
  ],
  PROCEDURE: [
    { key: 'name', label: 'Nome do procedimento' },
    { key: 'unit', label: 'Unidade de medida', options: UNIDADE },
  ],
  SUBSCRIPTION_PLAN: [
    { key: 'name', label: 'Nome do plano' },
    { key: 'priceCents', label: 'Valor do plano (R$)', moeda: true },
  ],
};
