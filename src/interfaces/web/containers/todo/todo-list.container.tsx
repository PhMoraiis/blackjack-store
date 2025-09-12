import React, { useEffect, useState } from 'react';
import { TodoList } from '../../components/todo/todo-list.component';
import { Todo } from '../../../../domain/entities/todo.entity';
import { getAllTodosUseCase, toggleTodoUseCase, deleteTodoUseCase } from '../../../../shared/container/instances';

interface TodoListContainerProps {
  refreshTrigger?: boolean;
}

/**
 * Container para a lista de tarefas
 * Segue o padrão Container Component
 * Responsável por conectar o componente de apresentação com os casos de uso
 */
export const TodoListContainer: React.FC<TodoListContainerProps> = ({ refreshTrigger }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega as tarefas ao montar o componente ou quando refreshTrigger mudar
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const result = await getAllTodosUseCase.execute();
        setTodos(result);
        setError(null);
      } catch (err) {
        setError('Failed to load todos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, [refreshTrigger]);

  // Alterna o estado de uma tarefa
  const handleToggle = async (id: number, completed: boolean) => {
    try {
      await toggleTodoUseCase.execute({ id, completed });
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      );
    } catch (err) {
      setError('Failed to update todo');
      console.error(err);
    }
  };

  // Exclui uma tarefa
  const handleDelete = async (id: number) => {
    try {
      await deleteTodoUseCase.execute({ id });
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
    } catch (err) {
      setError('Failed to delete todo');
      console.error(err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Todo List</h2>
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
};