import { Todo } from '../../../domain/entities/todo.entity';
import { ITodoRepository } from '../../../domain/repositories/todo-repository.interface';

/**
 * DTO para criação de uma tarefa
 */
export interface CreateTodoDTO {
  text: string;
}

/**
 * Caso de uso para criar uma nova tarefa
 */
export class CreateTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(data: CreateTodoDTO): Promise<Todo> {
    const todo = Todo.create(data.text);
    return this.todoRepository.create(todo);
  }
}