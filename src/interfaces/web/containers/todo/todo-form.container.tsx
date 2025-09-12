import React from 'react';
import { TodoForm } from '../../components/todo/todo-form.component';
import { createTodoUseCase } from '../../../../shared/container/instances';

/**
 * Props para o componente TodoFormContainer
 */
interface TodoFormContainerProps {
  onTodoCreated?: () => void;
}

/**
 * Container para o formulário de criação de tarefas
 * Segue o padrão Container Component
 * Responsável por conectar o componente de apresentação com os casos de uso
 */
export const TodoFormContainer: React.FC<TodoFormContainerProps> = ({ onTodoCreated }) => {
  const handleSubmit = async (text: string) => {
    try {
      await createTodoUseCase.execute({ text });
      // Notifica o componente pai que uma nova tarefa foi criada
      if (onTodoCreated) {
        onTodoCreated();
      }
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
  };

  return <TodoForm onSubmit={handleSubmit} />;
};