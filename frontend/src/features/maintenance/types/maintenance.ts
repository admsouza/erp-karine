import { RESOURCE_KINDS } from '../../../shared/data/locais-recurso';

export const MAINTENANCE_TYPES = {
  RESOURCE_ACCOUNT: 'Locais do recurso',
  RESOURCE_ACCOUNT_SUGGESTION: 'Identificações sugeridas',
  CLIENT: 'Clientes',
  PROCEDURE: 'Procedimentos',
  PRODUCT: 'Produtos',
  SUBSCRIPTION_PLAN: 'Planos de assinatura',
} as const;
export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export const MAINTENANCE_TYPE_ORDER: MaintenanceType[] = [
  'RESOURCE_ACCOUNT',
  'RESOURCE_ACCOUNT_SUGGESTION',
  'CLIENT',
  'PROCEDURE',
  'PRODUCT',
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
  RESOURCE_ACCOUNT_SUGGESTION: '/financeiro',
  CLIENT: '/clientes',
  PROCEDURE: '/procedimentos',
  PRODUCT: '/produtos',
  SUBSCRIPTION_PLAN: '/assinaturas',
};

export const MAINTENANCE_FIELDS: Record<MaintenanceType, MaintenanceField[]> = {
  // O local do recurso tem formulário próprio no modal (lista única de identificação).
  RESOURCE_ACCOUNT: [],
  // A identificação sugerida é o próprio catálogo: nome livre + tipo.
  RESOURCE_ACCOUNT_SUGGESTION: [
    { key: 'name', label: 'Identificação' },
    {
      key: 'kind',
      label: 'Tipo',
      options: Object.entries(RESOURCE_KINDS).map(([value, label]) => ({
        value,
        label,
      })),
    },
  ],
  CLIENT: [
    { key: 'name', label: 'Nome do cliente' },
    { key: 'phone', label: 'Telefone' },
  ],
  PROCEDURE: [
    { key: 'name', label: 'Nome do procedimento' },
    { key: 'unit', label: 'Unidade de medida', options: UNIDADE },
  ],
  PRODUCT: [
    { key: 'name', label: 'Nome do produto' },
    { key: 'priceCents', label: 'Valor (R$)', moeda: true },
  ],
  SUBSCRIPTION_PLAN: [
    { key: 'name', label: 'Nome do plano' },
    { key: 'priceCents', label: 'Valor do plano (R$)', moeda: true },
  ],
};
