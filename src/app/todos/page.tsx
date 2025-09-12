"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TodoListContainer } from "@/interfaces/web/containers/todo/todo-list.container";
import { TodoFormContainer } from "@/interfaces/web/containers/todo/todo-form.container";
import { useState } from "react";

export default function TodosPage() {
	const [refreshList, setRefreshList] = useState<boolean>(false);

	const handleTodoCreated = () => {
		setRefreshList(prev => !prev);
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>Manage your tasks efficiently</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mb-6">
						<TodoFormContainer onTodoCreated={handleTodoCreated} />
					</div>
					<TodoListContainer refreshTrigger={refreshList} />
				</CardContent>
			</Card>
		</div>
	);
}
