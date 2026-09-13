/**
 * Cria (ou atualiza a senha de) um usuário do sistema.
 *
 * Uso:
 *   node dist/scripts/create-user.js --email a@b.com --password "Senha123" --name "Nome"
 *   node dist/scripts/create-user.js --email a@b.com --password "Senha123" --no-force-change
 *
 * É um script administrativo: roda fora do contexto do Nest, usando o mesmo
 * `DATABASE_URL` da aplicação. Idempotente por e-mail: se o usuário existir,
 * atualiza nome/senha/perfil em vez de duplicar.
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

interface Args {
  email?: string;
  password?: string;
  name?: string;
  role: 'ADMIN' | 'USER';
  forceChange: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { role: 'ADMIN', forceChange: true };
  for (let i = 0; i < argv.length; i += 1) {
    const atual = argv[i];
    const proximo = argv[i + 1];
    if (atual === '--email') args.email = proximo;
    else if (atual === '--password') args.password = proximo;
    else if (atual === '--name') args.name = proximo;
    else if (atual === '--role' && (proximo === 'ADMIN' || proximo === 'USER')) args.role = proximo;
    else if (atual === '--no-force-change') args.forceChange = false;
    if (atual.startsWith('--') && atual !== '--no-force-change') i += 1;
  }
  return args;
}

const SENHA_REGEX = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,72}$/;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.password) {
    console.error('uso: node dist/scripts/create-user.js --email <email> --password <senha> [--name <nome>] [--role ADMIN|USER] [--no-force-change]');
    process.exit(1);
  }
  if (!SENHA_REGEX.test(args.password)) {
    console.error('senha fraca: mínimo 8 caracteres, com letras e números.');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL não definido.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const email = args.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(args.password, 10);
    const name = args.name ?? email.split('@')[0];

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash, role: args.role, active: true, mustChangePassword: args.forceChange },
      create: { name, email, passwordHash, role: args.role, mustChangePassword: args.forceChange },
    });

    console.log(`usuário ok: ${user.email} (${user.role}) | troca de senha no próximo acesso: ${user.mustChangePassword}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('falhou:', error instanceof Error ? error.message : error);
  process.exit(1);
});
