import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca a rota como pública (sem sessão). Usar apenas em health e login. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
