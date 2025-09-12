import { PrismaClient } from '../../../prisma/generated/client';
import { Todo } from '../../domain/entities/todo.entity';
import { ITodoRepository } from '../../domain/repositories/todo-repository.interface';

/**
 * Implementação do repositório de tarefas usando Prisma
 */
export class PrismaTodoRepository implements ITodoRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Todo[]> {
    const todos = await this.prisma.todo.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    return todos.map(
      (todo) => new Todo(todo.text, todo.completed, todo.id)
    );
  }

  async findById(id: number): Promise<Todo | null> {
    const todo = await this.prisma.todo.findUnique({
      where: { id },
    });

    if (!todo) {
      return null;
    }

    return new Todo(todo.text, todo.completed, todo.id);
  }

  async create(todo: Todo): Promise<Todo> {
    const createdTodo = await this.prisma.todo.create({
      data: {
        text: todo.text,
        completed: todo.completed,
      },
    });

    return new Todo(createdTodo.text, createdTodo.completed, createdTodo.id);
  }

  async update(todo: Todo): Promise<Todo> {
    if (!todo.id) {
      throw new Error('Cannot update todo without id');
    }

    const updatedTodo = await this.prisma.todo.update({
      where: { id: todo.id },
      data: {
        text: todo.text,
        completed: todo.completed,
      },
    });

    return new Todo(updatedTodo.text, updatedTodo.completed, updatedTodo.id);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.todo.delete({
      where: { id },
    });
  }
}