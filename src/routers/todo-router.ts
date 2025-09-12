import { TRPCError } from "@trpc/server";
import z from "zod";
import { publicProcedure, router } from "@/lib/trpc";
import { container } from "@/shared/container";
import { GetAllTodosUseCase } from "@/application/use-cases/todo/get-all-todos.use-case";
import { CreateTodoUseCase } from "@/application/use-cases/todo/create-todo.use-case";
import { ToggleTodoUseCase } from "@/application/use-cases/todo/toggle-todo.use-case";
import { DeleteTodoUseCase } from "@/application/use-cases/todo/delete-todo.use-case";

export const todoRouter = router({
  getAll: publicProcedure.query(async () => {
    const getAllTodosUseCase = container.get<GetAllTodosUseCase>('GetAllTodosUseCase');
    return await getAllTodosUseCase.execute();
  }),

  create: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const createTodoUseCase = container.get<CreateTodoUseCase>('CreateTodoUseCase');
      return await createTodoUseCase.execute({ text: input.text });
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .mutation(async ({ input }) => {
      try {
        const toggleTodoUseCase = container.get<ToggleTodoUseCase>('ToggleTodoUseCase');
        return await toggleTodoUseCase.execute({ id: input.id, completed: input.completed });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Todo not found",
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const deleteTodoUseCase = container.get<DeleteTodoUseCase>('DeleteTodoUseCase');
        return await deleteTodoUseCase.execute({ id: input.id });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Todo not found",
        });
      }
    }),
});