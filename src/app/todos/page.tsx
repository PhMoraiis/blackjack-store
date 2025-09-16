"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function TodosPage() {
	const [_refreshList, setRefreshList] = useState<boolean>(false);

	const _handleTodoCreated = () => {
		setRefreshList((prev) => !prev);
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>Manage your tasks efficiently</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mb-6" />
				</CardContent>
			</Card>
		</div>
	);
}
