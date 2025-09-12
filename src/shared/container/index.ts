import { PrismaAdapter } from '../../infrastructure/adapters/secondary/prisma.adapter';
import { TRPCAdapter } from '../../infrastructure/adapters/primary/trpc.adapter';
import { PrismaTodoRepository } from '../../infrastructure/repositories/prisma-todo.repository';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { ITodoRepository } from '../../domain/repositories/todo-repository.interface';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { GetAllTodosUseCase } from '../../application/use-cases/todo/get-all-todos.use-case';
import { CreateTodoUseCase } from '../../application/use-cases/todo/create-todo.use-case';
import { ToggleTodoUseCase } from '../../application/use-cases/todo/toggle-todo.use-case';
import { DeleteTodoUseCase } from '../../application/use-cases/todo/delete-todo.use-case';

/**
 * Container de injeção de dependências
 * Implementa o padrão Service Locator para gerenciar as dependências da aplicação
 */
export class Container {
  private static instance: Container;
  private dependencies: Map<string, any> = new Map();

  private constructor() {
    this.registerAdapters();
    this.registerRepositories();
    this.registerUseCases();
  }

  /**
   * Obtém a instância única do container
   */
  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Registra os adaptadores no container
   */
  private registerAdapters(): void {
    // Adaptadores secundários (driven)
    const prismaAdapter = PrismaAdapter.getInstance();
    this.dependencies.set('PrismaAdapter', prismaAdapter);

    // Adaptadores primários (driver)
    const trpcAdapter = TRPCAdapter.getInstance();
    this.dependencies.set('TRPCAdapter', trpcAdapter);
  }

  /**
   * Registra os repositórios no container
   */
  private registerRepositories(): void {
    const prismaAdapter = this.get<PrismaAdapter>('PrismaAdapter');
    const prismaClient = prismaAdapter.getClient();

    // Repositórios
    const todoRepository = new PrismaTodoRepository(prismaClient);
    this.dependencies.set('TodoRepository', todoRepository);

    const userRepository = new PrismaUserRepository(prismaClient);
    this.dependencies.set('UserRepository', userRepository);
  }

  /**
   * Registra os casos de uso no container
   */
  private registerUseCases(): void {
    const todoRepository = this.get<ITodoRepository>('TodoRepository');

    // Casos de uso de Todo
    const getAllTodosUseCase = new GetAllTodosUseCase(todoRepository);
    this.dependencies.set('GetAllTodosUseCase', getAllTodosUseCase);

    const createTodoUseCase = new CreateTodoUseCase(todoRepository);
    this.dependencies.set('CreateTodoUseCase', createTodoUseCase);

    const toggleTodoUseCase = new ToggleTodoUseCase(todoRepository);
    this.dependencies.set('ToggleTodoUseCase', toggleTodoUseCase);

    const deleteTodoUseCase = new DeleteTodoUseCase(todoRepository);
    this.dependencies.set('DeleteTodoUseCase', deleteTodoUseCase);
  }

  /**
   * Obtém uma dependência do container
   */
  public get<T>(key: string): T {
    const dependency = this.dependencies.get(key);

    if (!dependency) {
      throw new Error(`Dependency ${key} not found in container`);
    }

    return dependency as T;
  }

  /**
   * Registra uma dependência no container
   */
  public register(key: string, dependency: any): void {
    this.dependencies.set(key, dependency);
  }
}

// Exporta uma instância única do container
export const container = Container.getInstance();