import { container } from '.';
import { GetAllTodosUseCase } from '../../application/use-cases/todo/get-all-todos.use-case';
import { CreateTodoUseCase } from '../../application/use-cases/todo/create-todo.use-case';
import { ToggleTodoUseCase } from '../../application/use-cases/todo/toggle-todo.use-case';
import { DeleteTodoUseCase } from '../../application/use-cases/todo/delete-todo.use-case';
import { ITodoRepository } from '../../domain/repositories/todo-repository.interface';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { TRPCAdapter } from '../../infrastructure/adapters/primary/trpc.adapter';

// Exporta as instâncias dos casos de uso
export const getAllTodosUseCase = container.get<GetAllTodosUseCase>('GetAllTodosUseCase');
export const createTodoUseCase = container.get<CreateTodoUseCase>('CreateTodoUseCase');
export const toggleTodoUseCase = container.get<ToggleTodoUseCase>('ToggleTodoUseCase');
export const deleteTodoUseCase = container.get<DeleteTodoUseCase>('DeleteTodoUseCase');

// Exporta as instâncias dos repositórios
export const todoRepository = container.get<ITodoRepository>('TodoRepository');
export const userRepository = container.get<IUserRepository>('UserRepository');

// Exporta as instâncias dos adaptadores
export const trpcAdapter = container.get<TRPCAdapter>('TRPCAdapter');