import React from 'react';
import { TodoListContainer } from '../../containers/todo/todo-list.container';
import { TodoFormContainer } from '../../containers/todo/todo-form.container';

export const TodoPage: React.FC = () => {
  const [refreshList, setRefreshList] = React.useState<boolean>(false);

  const handleTodoCreated = () => {
    setRefreshList(prev => !prev);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Todo List</h1>
      <div className="mb-8">
        <TodoFormContainer onTodoCreated={handleTodoCreated} />
      </div>
      <TodoListContainer refreshTrigger={refreshList} />
    </div>
  );
};