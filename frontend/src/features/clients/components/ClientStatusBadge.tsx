import { Badge } from '../../../shared/components/Badge';

/** Situação do cliente (inativação é soft delete: o registro continua no banco). */
export function ClientStatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge>;
}
