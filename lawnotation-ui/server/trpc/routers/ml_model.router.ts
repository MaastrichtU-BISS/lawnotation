import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { MlModel } from "~/types";
import type { Context } from "../context";
import type { PostgrestError } from "@supabase/supabase-js";


const config = useRuntimeConfig();

const ZMlModelFields = z.object({
  name: z.string().min(3),
  type: z.string(),
  labelset_id: z.number().optional(),
  annotation_level: z.union([z.literal("word"), z.literal("document")])
});

const MlModelAuthorizer = async (
  ml_model_id: number,
  user_id: string,
  ctx: Context
) => {
  const { count } = await ctx.supabase
    .from("ml_models")
    .select("*", { count: "exact", head: true })
    .eq("id", ml_model_id);

  return count === 1;
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
      const { data, error, count } = await ctx.supabase
        .from("ml_models")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in ml_models.findById: ${error.message}`,
        });
      return data as MlModel;
    }),

  findAll: protectedProcedure.query(async ({ ctx }) => {

    const { data, error, count } = await ctx.supabase
      .from("ml_models")
      .select('*');

    if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
    if (error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error in ml_models.findAll: ${error.message}`,
      });
    return data as MlModel[];
  }),

  predict: protectedProcedure
  .input(
    z.object({
      model_name: z.string().min(3),
      assignments_id: z.array(z.number().int()).optional(),
      task_type: z.string(),
      text: z.string(),
      labels: z.array(z.string()).optional()
    })
  )
  .query(async ({ input }) => {
    
    try {
      const response = fetch(`${config.public.mlBackendURL}/predict`, {
        method: "POST",
        body: JSON.stringify(input)
      });

      return response;
    } catch(error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error in ml_models.predict: ${(error as PostgrestError).message}`,
      });
    }
  }),
});

export type MlModelRouter = typeof mlModelRouter;
