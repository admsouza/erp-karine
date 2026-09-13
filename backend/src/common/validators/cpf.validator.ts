import { registerDecorator, type ValidationOptions, ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';

/** Remove tudo que não for dígito (aceita CPF com ou sem máscara). */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

/** Valida CPF pelo dígito verificador (rejeita sequências repetidas). */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  const digits = cpf.split('').map(Number);
  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += digits[index] * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

@ValidatorConstraint({ name: 'isCpf', async: false })
export class CpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidCpf(value);
  }

  defaultMessage(): string {
    return 'CPF inválido.';
  }
}

/** Decorator de validação de CPF (com ou sem máscara). */
export function IsCpf(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: CpfConstraint,
    });
  };
}
