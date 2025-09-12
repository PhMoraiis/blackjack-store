import { PrismaClient } from '../../../../prisma/generated/client';

/**
 * Adaptador para o Prisma ORM
 * Implementa o padrão Singleton para garantir uma única instância do PrismaClient
 */
export class PrismaAdapter {
  private static instance: PrismaAdapter;
  private prismaClient: PrismaClient;

  private constructor() {
    this.prismaClient = new PrismaClient();
  }

  /**
   * Obtém a instância única do adaptador
   */
  public static getInstance(): PrismaAdapter {
    if (!PrismaAdapter.instance) {
      PrismaAdapter.instance = new PrismaAdapter();
    }
    return PrismaAdapter.instance;
  }

  /**
   * Obtém o cliente Prisma
   */
  public getClient(): PrismaClient {
    return this.prismaClient;
  }

  /**
   * Conecta ao banco de dados
   */
  public async connect(): Promise<void> {
    await this.prismaClient.$connect();
  }

  /**
   * Desconecta do banco de dados
   */
  public async disconnect(): Promise<void> {
    await this.prismaClient.$disconnect();
  }
}