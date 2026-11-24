import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, disabledProcedure, router } from "~/server/trpc";
import * as ML from "~/server/db/queries/ml_models";
import type { Context } from "../context";
import { AnnotationLevels } from "~/utils/enums";

const ZMlModelFields = z.object({
  name: z.string().min(3),
  type: z.string(),
  labelset_id: z.number().optional(),
  annotation_level: z.nativeEnum(AnnotationLevels)
});

const MlModelAuthorizer = async (
  ml_model_id: number,
  user_id: string,
  ctx: Context
) => {
  return ML.mlModelExists(ctx.sql, ml_model_id);
  // return true;
};

export const mlModelRouter = router({
  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        MlModelAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return await ML.mlModelById(ctx.sql, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in ml_models.findById: ${(error as Error).message}`,
        });
      }
    }),

  findAll: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await ML.mlModels(ctx.sql);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in ml_models.findAll: ${(error as Error).message}`,
        });
      }
    }),

  predict: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3),
        assignment_ids: z.array(z.number().int()).optional(),
        type: z.string(),
        text: z.string(),
        labels: z.array(z.string()).optional()
      })
    )
    .query(async ({ input }) => {
      const config = useRuntimeConfig();
      
      try {
        const response = fetch(`${config.public.mlBackendURL}/predict`, {
          method: "POST",
          body: JSON.stringify(input)
        });

        return response;
      } catch(error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in ml_models.predict: ${(error as Error).message}`,
        });
      }
    }),

  checkMLTaskStatus: disabledProcedure
    .input(
      z.array(z.number().int())
    )
    // .use(hookAuthorizer)
    .query(async ({ ctx, input }) => {
      const config = useRuntimeConfig();
      
      try {
        const promises: Promise<any>[] = [];
        input.map((task_id: number) => {
          const response = fetch(`${config.public.mlBackendURL}/task_status`, {
            method: "GET",
            body: JSON.stringify(task_id)
          });
          promises.push(response);
        });

        return await Promise.all(promises);
      } catch(error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in ml_models.checkMLTaskStatus: ${(error as Error).message}`,
        });
      }
    }),
});

export type MlModelRouter = typeof mlModelRouter;
