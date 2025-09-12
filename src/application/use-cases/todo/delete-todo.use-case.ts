import { ITodoRepository } from '../../../domain/repositories/todo-repository.interface';

/**
 * DTO para exclusão de uma tarefa
 */
export interface DeleteTodoDTO {
  id: number;
}

/**
 * Caso de uso para excluir uma tarefa
 */
export class DeleteTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(data: DeleteTodoDTO): Promise<void> {
    const todo = await this.todoRepository.findById(data.id);
    
    if (!todo) {
      throw new Error('Todo not found');
    }
    
    await this.todoRepository.delete(data.id);
  }
}