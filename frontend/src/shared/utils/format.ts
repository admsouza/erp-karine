const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Converte centavos (formato usado pela API e pelo banco) para texto em reais.
 * Dinheiro nunca é manipulado como float na interface.
 */
export function formatCentsToBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '-';
  return BRL_FORMATTER.format(cents / 100);
}

/** Converte um texto digitado em reais ("1.234,56") para centavos. */
export function parseBRLToCents(value: string): number {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_FORMATTER.format(date);
}

/**
 * Data sem hora (vigências de valor). Lê só o `AAAA-MM-DD` da string ISO —
 * converter para Date mudaria o dia por causa do fuso (o banco guarda `DATE`).
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const [ano, mes, dia] = value.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
}

/** Hoje no fuso da clínica, em `AAAA-MM-DD` (valor de `<input type="date">`). */
export function todayISO(): string {
  const agora = new Date();
  const local = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Recife' }));
  const mes = String(local.getMonth() + 1).padStart(2, '0');
  const dia = String(local.getDate()).padStart(2, '0');
  return `${local.getFullYear()}-${mes}-${dia}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_TIME_FORMATTER.format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const RECIFE_DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Recife',
});

const RECIFE_DATE_ONLY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Recife',
});

const RECIFE_TIME_ONLY = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Recife',
});

/** Data e hora **no fuso da clínica** (trilha de auditoria, histórico de alterações). */
export function formatDateTimeRecife(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return RECIFE_DATE_TIME.format(date);
}

/** Data (AAAA-MM-DD) no fuso da clínica — valor pronto para `<input type="date">`. */
export function recifeDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return RECIFE_DATE_ONLY.format(date);
}

/** Hora (HH:MM) no fuso da clínica. */
export function recifeTimeValue(value: string | Date | null | undefined): string {
  if (!value) return '00:00';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '00:00';
  return RECIFE_TIME_ONLY.format(date);
}

/** Rótulos legíveis para os status vindos da API. */
export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());
}

/** Máscara de CPF: 000.000.000-00. Retorna '-' quando não informado. */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Telefone com DDD: (00) 00000-0000 ou (00) 0000-0000. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}
