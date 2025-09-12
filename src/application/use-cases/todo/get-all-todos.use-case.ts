import { Todo } from '../../../domain/entities/todo.entity';
import { ITodoRepository } from '../../../domain/repositories/todo-repository.interface';

/**
 * Caso de uso para obter todas as tarefas
 */
export class GetAllTodosUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(): Promise<Todo[]> {
    return this.todoRepository.findAll();
  }
}