import { PrismaClient } from '../../../prisma/generated/client';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';

/**
 * Implementação do repositório de usuários usando Prisma
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return new User(
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.createdAt,
      user.updatedAt,
      user.image || undefined
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return new User(
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.createdAt,
      user.updatedAt,
      user.image || undefined
    );
  }

  async create(user: User): Promise<User> {
    const createdUser = await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        image: user.image,
      },
    });

    return new User(
      createdUser.id,
      createdUser.name,
      createdUser.email,
      createdUser.emailVerified,
      createdUser.createdAt,
      createdUser.updatedAt,
      createdUser.image || undefined
    );
  }

  async update(user: User): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        updatedAt: user.updatedAt,
        image: user.image,
      },
    });

    return new User(
      updatedUser.id,
      updatedUser.name,
      updatedUser.email,
      updatedUser.emailVerified,
      updatedUser.createdAt,
      updatedUser.updatedAt,
      updatedUser.image || undefined
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}