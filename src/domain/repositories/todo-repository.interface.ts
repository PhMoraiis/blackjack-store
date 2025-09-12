import { Todo } from '../entities/todo.entity';

/**
 * Interface para o repositório de tarefas
 * Define os métodos que devem ser implementados pelos repositórios concretos
 */
export interface ITodoRepository {
  findAll(): Promise<Todo[]>;
  findById(id: number): Promise<Todo | null>;
  create(todo: Todo): Promise<Todo>;
  update(todo: Todo): Promise<Todo>;
  delete(id: number): Promise<void>;
}