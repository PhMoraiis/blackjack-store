import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from '../../../lib/context';

/**
 * Adaptador para o tRPC
 * Conecta a camada de aplicação com a interface web
 */
export class TRPCAdapter {
  private static instance: TRPCAdapter;
  private trpc: ReturnType<typeof initTRPC.context<Context>['create']>;

  private constructor() {
    this.trpc = initTRPC.context<Context>().create();
  }

  /**
   * Obtém a instância única do adaptador
   */
  public static getInstance(): TRPCAdapter {
    if (!TRPCAdapter.instance) {
      TRPCAdapter.instance = new TRPCAdapter();
    }
    return TRPCAdapter.instance;
  }

  /**
   * Obtém o router do tRPC
   */
  public getRouter() {
    return this.trpc.router;
  }

  /**
   * Obtém o procedimento público do tRPC
   */
  public getPublicProcedure() {
    return this.trpc.procedure;
  }

  /**
   * Obtém o procedimento protegido do tRPC
   */
  public getProtectedProcedure() {
    return this.trpc.procedure.use(({ ctx, next }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          cause: 'No session',
        });
      }
      return next({
        ctx: {
          ...ctx,
          session: ctx.session,
        },
      });
    });
  }
}