import { Todo } from '../../../domain/entities/todo.entity';
import { ITodoRepository } from '../../../domain/repositories/todo-repository.interface';

/**
 * DTO para alternar o estado de uma tarefa
 */
export interface ToggleTodoDTO {
  id: number;
  completed: boolean;
}

/**
 * Caso de uso para alternar o estado de uma tarefa
 */
export class ToggleTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(data: ToggleTodoDTO): Promise<Todo> {
    const todo = await this.todoRepository.findById(data.id);
    
    if (!todo) {
      throw new Error('Todo not found');
    }
    
    // Atualiza o estado da tarefa
    if (data.completed) {
      todo.complete();
    } else {
      todo.uncomplete();
    }
    
    return this.todoRepository.update(todo);
  }
}