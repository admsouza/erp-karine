import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/** Único ponto do módulo `auth` que fala com o Prisma na tabela `User`. */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}
