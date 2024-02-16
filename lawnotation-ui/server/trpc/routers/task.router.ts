import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { Annotation, Task, User, Annotator } from "~/types";
import type { Context } from "../context";
import { appRouter } from ".";
import type { Database } from "~/types/supabase";
import { zValidEmail } from "~/utils/validators";

const ZTaskFields = z.object({
  name: z.string(),
  desc: z.string(),
  project_id: z.number().int(),
  labelset_id: z.number().int(),
  ann_guidelines: z.string(),
});

const taskAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("tasks")
    .select("*, project:projects!inner(editor_id)", {
      count: "exact",
      head: true,
    })
    .eq("id", task_id)
    .eq("projects.editor_id", user_id);

  if (editor.count) return true;

  const annotator = await ctx.supabase
    .from("assignments")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("task_id", task_id)
    .eq("annotator_id", user_id);

  return annotator.count! > 0;
  // return true;
};

export const taskRouter = router({
  /* General Crud Definitions */
  // find: protectedProcedure
  //   .input(
  //     z.object({
  //       range: z.tuple([z.number().int(), z.number().int()]).optional(),
  //       filter: ZTaskFields.partial().optional(),
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     let query = ctx.supabase.from("tasks").select();
  //     if (input.range) query = query.range(input.range[0], input.range[1]);
  //     if (input.filter) query = query.match(input.filter);

  //     const { data, error } = await query;

  //     if (error)
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: `Error in tasks.find: ${error.message}`,
  //       });
  //     return data as Task[];
  //   }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase
        .from("tasks")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.findById: ${error.message}`,
        });
      return data as Task;
    }),

  create: protectedProcedure
    .input(ZTaskFields)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .insert(input)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.create: ${error.message}`,
        });
      return data as Task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZTaskFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .update(input.updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.update: ${error.message}`,
        });
      return data as Task;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("tasks")
        .delete()
        .eq("id", input);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.delete: ${error.message}`,
        });
      return true;
    }),

  // Extra procedures

  getCountByUser: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: editor_id }) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_tasks", { e_id: editor_id })
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getCountByUser: ${error.message}`,
        });
      return data as number;
    }),

  getAllAnnotatorTasks: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: annotator_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_all_annotator_tasks",
        {
          a_id: annotator_id,
        }
      );
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getAllAnnotatorTasks: ${error.message}`,
        });
      return data as Task[];
    }),

  getAllAnnotatorsFromTask: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_all_annotators_from_task",
        {
          t_id: task_id,
        }
      );
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getAllAnnotatorsFromTask: ${error.message}`,
        });
      return data as Annotator[];
    }),

  deleteAllFromProject: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input: project_id }) => {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .delete()
        .eq("project_id", project_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.delete: ${error.message}`,
        });
      return true;
    }),

  // Note: wont work, probably
  // Now it does ;)
  replicateTask: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input: task_id }): Promise<Task> => {
      const caller = appRouter.createCaller(ctx);

      const task = await caller.task.findById(task_id);

      const new_task = await caller.task.create({
        name: task.name,
        desc: task.desc,
        project_id: task.project_id,
        ann_guidelines: task.ann_guidelines,
        labelset_id: task.labelset_id,
      });

      const assignments = await caller.assignment.findAssignmentsByTask(
        task_id
      );
      const new_assignments = await caller.assignment.createMany(
        assignments.map((a) => {
          return {
            task_id: new_task.id,
            annotator_id: a.annotator_id,
            document_id: a.document_id,
            seq_pos: a.seq_pos,
            status: a.status,
            difficulty_rating: a.difficulty_rating,
          };
        })
      );

      let dicAssignments: any = {};
      new_assignments.map((na, index) => {
        dicAssignments[assignments[index].id] = na.id;
      });

      type NonNullableObject<T> = {
        [K in keyof T]: NonNullable<T[K]>;
      };

      const annotations = await caller.annotation.findAnnotationsByTask(
        task_id
      );

      const new_annotations = await caller.annotation.createMany(
        annotations.map((a) => {
          return {
            assignment_id: dicAssignments[a.assignment_id!]!,
            label: a.label!,
            start_index: a.start_index!,
            end_index: a.end_index!,
            text: a.text!,
            ls_id: a.ls_id!,
            origin: a.origin!,
          };
        })
      );

      const relations = await caller.relation.findRelationsByTask(task_id);

      let dicAnnotations: any = {};
      new_annotations.map((na, index) => {
        dicAnnotations[annotations[index].id] = na.id;
      });

      const new_relations = await caller.relation.createMany(
        relations.map((a) => {
          return {
            direction: a.direction!,
            from_id: dicAnnotations[a.from_id]!,
            to_id: dicAnnotations[a.to_id]!,
            labels: a.labels!,
            ls_from: a.ls_from!,
            ls_to: a.ls_to!,
          };
        })
      );

      // return 1;
      return new_task;
    }),
});

export type TaskRouter = typeof taskRouter;
