import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, disabledProcedure, router } from "~/server/trpc";
import type { Task, Annotator } from "~/types";
import { AnnotationLevels } from "~/utils/enums";
import type { Context } from "../context";
import { appRouter } from ".";
import { zValidEmail } from "~/utils/validators";
import { projectEditorAuthorizer, taskEditorAuthorizer, taskEditorOrAnnotatorAuthorizer } from "../authorizers";

const ZTaskFields = z.object({
  name: z.string(),
  desc: z.string(),
  project_id: z.number().int(),
  labelset_id: z.number().int(),
  ann_guidelines: z.string(),
  ml_model_id: z.number().int().nullable().optional(),
  annotation_level: z.nativeEnum(AnnotationLevels)
});

export const taskRouter = router({
  /* General Crud Definitions */
  find: disabledProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZTaskFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("tasks").select();
      if (input.range) query = query.range(input.range[0], input.range[1]);
      if (input.filter) query = query.match(input.filter);

      const { data, error } = await query;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.find: ${error.message}`,
        });
      return data as Task[];
    }),

  updateAssignees: protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        new_emails: z.array(z.union([zValidEmail, z.literal("")])),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const caller = appRouter.createCaller(ctx);

      const stats = {
        success: 0,
        failed: 0,
      };

      const annotators = await caller.task.getAllAnnotatorsFromTask(
        input.task_id
      );

      for (let i = 0; i < input.new_emails.length; i++) {
        if (input.new_emails[i] != annotators[i].email) {
          const assignments =
            await caller.assignment.findAssignmentsByTaskAndUser({
              annotator_number: annotators[i].annotator_number,
              task_id: input.task_id,
            });

          let new_user = null;
          if (input.new_emails[i] && input.new_emails.length) {
            new_user = await caller.assignment.assignUserToTask({
              email: input.new_emails[i],
              task_id: input.task_id,
            });
          }

          for (let j = 0; j < assignments.length; j++) {
            const ass = assignments[j];
            try {
              await caller.assignment.update({
                id: ass.id,
                updates: { annotator_id: new_user },
              });
              stats.success++;
            } catch {
              stats.failed++;
            }
          }

          annotators[i].email = input.new_emails[i];
        }
      }

      const flat_annotators: Annotator[] = JSON.parse(
        JSON.stringify(annotators)
      );

      if (stats.success && !stats.failed) {
        return {
          message: "All the assignments have been reassigned",
          annotators: flat_annotators,
        };
      } else if (!stats.success && !stats.failed) {
        return {
          message: "No changes have been made",
          annotators: flat_annotators,
        };
      } else if (stats.success && stats.failed) {
        throw new TRPCError({
          message: "Some assignment updates failed",
          code: "INTERNAL_SERVER_ERROR",
        });
      } else if (!stats.success && stats.failed) {
        throw new TRPCError({
          message: "All assignment updates failed",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      throw new TRPCError({
        message: "Undefined case",
        code: "INTERNAL_SERVER_ERROR",
      });
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
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
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input.project_id, opts.ctx.user.id, opts.ctx))
    )
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
        updates: ZTaskFields.omit({'project_id': true}).partial(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx))
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
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
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
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_tasks", { e_id: ctx.user.id })
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getCountByUser: ${error.message}`,
        });
      return data as number;
    }),

  getCountByLabelset: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: labelset_id }) => {
      const { error, count } = await ctx.supabase
        .from("tasks")
        .select("*", {
          count: "exact"
        })
        .eq("labelset_id", labelset_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.findById: ${error.message}`,
        });
      return count as number;
    }),

  getAllAnnotatorTasks: disabledProcedure
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
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
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
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
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

  replicateTask: protectedProcedure
    .input(z.number().int())
    .use((opts) => 
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .mutation(async ({ ctx, input: task_id }): Promise<Task> => {
      const caller = appRouter.createCaller(ctx);

      const task = await caller.task.findById(task_id);


      const new_task = await caller.task.create(task);

      const assignments = await caller.assignment.findAssignmentsByTask(
        task_id
      );

      const new_assignments = await caller.assignment.createMany({
        task_id: new_task.id,
        assignments: assignments.map((a) => {
          return {
            annotator_id: a.annotator_id,
            annotator_number: a.annotator_number,
            document_id: a.document_id,
            seq_pos: a.seq_pos,
            status: a.status,
            difficulty_rating: a.difficulty_rating,
            origin: a.origin,
          };
        }),
      });

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
            origin: a.origin,
            confidence_rating: a.confidence_rating
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

      return new_task;
    }),
});

export type TaskRouter = typeof taskRouter;
