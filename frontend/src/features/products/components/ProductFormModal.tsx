import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { formatCentsToBRL, parseBRLToCents } from '../../../shared/utils/format';
import { createProduct, updateProduct } from '../api/products-api';
import type { Product } from '../types/product';

/** Cadastro/edição de produto. Valor é simples (o preço aplicado fica gravado no lançamento). */
export function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  /** Ausente = cadastro novo. */
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [price, setPrice] = useState(
    product ? formatCentsToBRL(product.priceCents) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const corpo = {
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        priceCents: price ? parseBRLToCents(price) : 0,
      };
      if (product) await updateProduct(product.id, corpo);
      else await createProduct(corpo);
      onSaved();
      onClose();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={product ? 'Editar produto' : 'Novo produto'}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label="Nome"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Unidade"
            hint="Ex.: unidade, caixa, ml"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
        <Input
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Mudar o valor aqui não altera lançamentos anteriores: cada venda guarda o
          valor que foi aplicado.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Salvando…' : product ? 'Salvar alteração' : 'Adicionar produto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
