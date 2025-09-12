import React from 'react';
import { Todo } from '../../../../domain/entities/todo.entity';

/**
 * Props para o componente TodoList
 */
interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

/**
 * Componente de apresentação para a lista de tarefas
 * Segue o padrão Presentational Component
 */
export const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete }) => {
  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
        >
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggle(todo.id!, !todo.completed)}
              className="mr-3 h-5 w-5"
            />
            <span
              className={`${todo.completed ? 'line-through text-gray-500' : ''}`}
            >
              {todo.text}
            </span>
          </div>
          <button
            onClick={() => onDelete(todo.id!)}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};