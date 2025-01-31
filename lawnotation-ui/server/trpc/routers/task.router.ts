import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  authorizer,
  protectedProcedure,
  disabledProcedure,
  router,
} from "~/server/trpc";
import type {
  Task,
  Annotator,
  Assignment,
  Annotation,
  AnnotationRelation,
} from "~/types";
import { AnnotationLevels, Origins, AssignmentStatuses } from "~/utils/enums";
import type { Context } from "../context";
import { appRouter } from ".";
import { zValidEmail } from "~/utils/validators";
import {
  projectEditorAuthorizer,
  taskEditorAuthorizer,
  taskEditorOrAnnotatorAuthorizer,
} from "../authorizers";
import _ from "lodash";

const ZTaskFields = z.object({
  name: z.string(),
  desc: z.string(),
  project_id: z.number().int(),
  labelset_id: z.number().int(),
  ann_guidelines: z.string(),
  ml_model_id: z.number().int().nullable().optional(),
  annotation_level: z.nativeEnum(AnnotationLevels),
  origin_task_1_id: z.number().int().nullable().optional(),
  origin_task_2_id: z.number().int().nullable().optional(),
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

  findSimilarTasks: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        annotators: z.array(z.string()),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorOrAnnotatorAuthorizer(
          opts.input.task_id,
          opts.ctx.user.id,
          opts.ctx
        )
      )
    )
    .query(async ({ ctx, input: { task_id, annotators } }) => {
      const originTask = await ctx.supabase
        .from("tasks")
        .select("id, annotation_level, labelsets(labels)")
        .eq("id", task_id)
        .single();

      if (originTask.count == 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      } else if (!originTask.data || originTask.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSimilarTasks: ${originTask.error.message}`,
        });
      }

      const originTaskDocuments = (
        await ctx.supabase.rpc("get_all_docs_from_task_mini", {
          t_id: task_id,
        })
      ).data as { id: number; hash: string }[];

      const projects = await ctx.supabase
        .from("projects")
        .select("id, tasks(id, name, annotation_level, labelsets(labels))")
        .eq("editor_id", ctx.user.id) // consider only projects from this user
        .neq("tasks.id", task_id) // exclude origin task
        .eq("tasks.annotation_level", originTask.data.annotation_level); //filters out different annotation level

      const tasks: { id: number; name: string }[] = [];

      if (projects.data?.length) {
        for (let i = 0; i < projects.data.length; i++) {
          const project = projects.data[i];
          if (project.tasks?.length) {
            for (let j = 0; j < project.tasks.length; j++) {
              const currentTask = project.tasks[j];

              // filters out different labelset
              // at the moment they have to be exactly the same (same order and same colors too)
              if (!_.isEqual(originTask.data.labelsets, currentTask.labelsets))
                continue;

              // filters out different annotators
              const currentTaskAnnotators = (
                await ctx.supabase.rpc("get_all_annotators_from_task", {
                  t_id: currentTask.id,
                })
              ).data?.map((ann) => ann.email) as string[];

              if (_.xor(annotators, currentTaskAnnotators).length !== 0)
                continue;

              // // filters out different documents without at least one document in common (according to hash)
              const currentTaskDocuments = (
                await ctx.supabase.rpc("get_all_docs_from_task_mini", {
                  t_id: currentTask.id,
                })
              ).data as { id: number; hash: string }[];

              if (
                !_.intersectionWith(
                  originTaskDocuments,
                  currentTaskDocuments,
                  (o1, o2) => o1.hash == o2.hash
                )?.length
              )
                continue;

              tasks.push({
                id: currentTask.id,
                name: currentTask.name ?? `Task-${currentTask.id}`,
              });
            }
          }
        }
      }

      return tasks;
    }),

  create: protectedProcedure
    .input(ZTaskFields)
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(
          opts.input.project_id,
          opts.ctx.user.id,
          opts.ctx
        )
      )
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
        updates: ZTaskFields.omit({ project_id: true }).partial(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx)
      )
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
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
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

  getCountByUser: protectedProcedure.query(async ({ ctx }) => {
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
          count: "exact",
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
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
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
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
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
    .input(
      z.object({
        task_id: z.number().int(),
        originalTaskId2: z.number().int().nullable().optional(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(
      async ({ ctx, input: { task_id, originalTaskId2 } }): Promise<Task> => {
        const caller = appRouter.createCaller(ctx);

        const task = await caller.task.findById(task_id);

        let description = `Replica of task ${
          task.id
        } - (${new Date().toLocaleDateString()})`;
        if (originalTaskId2) {
          description = `Merge of tasks ${
            task.id
          } and ${originalTaskId2} - (${new Date().toLocaleDateString()})`;
        }

        const new_task = await caller.task.create({
          ...task,
          origin_task_1_id: task.id,
          origin_task_2_id: originalTaskId2,
          desc: description,
        });

        const assignments = await caller.assignment.findAssignmentsByTask(
          task_id
        );

        // TODO: add none as status to db
        const assignmentsWithoutId = assignments.map((a) => {
          const { id, ...assWithoutId } = a;
          return {
            ...assWithoutId,
            task_id: new_task.id,
            original_task_id: task_id,
          };
        }) as Omit<Assignment, "id">[];

        const new_assignments = (
          await ctx.supabase
            .from("assignments")
            .insert(assignmentsWithoutId)
            .select()
        ).data as Assignment[];

        // leveraging the fact that the new assigmnets are created and returned in the same order as the paramaters provided
        let dicAssignments: any = {};

        new_assignments?.forEach((na, index) => {
          dicAssignments[assignments[index].id] = na.id;
        });

        type NonNullableObject<T> = {
          [K in keyof T]: NonNullable<T[K]>;
        };

        const annotations: any[] =
          await caller.annotation.findAnnotationsByTask(task_id);

        const annotationsWithoutId = annotations.map((a) => {
          const { id, assignment, ...annWithoutId } = a;
          return {
            ...annWithoutId,
            assignment_id: dicAssignments[a.assignment_id!]!,
          };
        }) as Omit<Annotation, "id">[];

        const new_annotations = (
          await ctx.supabase
            .from("annotations")
            .insert(annotationsWithoutId)
            .select()
        ).data;

        const relations: any[] = await caller.relation.findRelationsByTask(
          task_id
        );

        let dicAnnotations: any = {};
        new_annotations?.forEach((na, index) => {
          dicAnnotations[annotations[index].id] = na.id;
        });

        const newRelationsWithoutId = relations.map((r) => {
          const { id, annotation, assignment, ...relWithoutId } = r;
          return {
            ...relWithoutId,
            from_id: dicAnnotations[r.from_id]!,
            to_id: dicAnnotations[r.to_id]!,
          };
        });
        const new_relations = (
          await ctx.supabase
            .from("annotation_relations")
            .insert(newRelationsWithoutId)
            .select()
        ).data as AnnotationRelation[];

        return new_task;
      }
    ),

  mergeTasks: protectedProcedure
    .input(
      z.object({
        originalTaskId: z.number().int(),
        similarTaskId: z.number().int(),
      })
    )
    .use((opts) =>
      authorizer(
        opts,
        () =>
          taskEditorAuthorizer(
            opts.input.originalTaskId,
            opts.ctx.user.id,
            opts.ctx
          ) //maybe it is a good idea to validate the similar task id too.
      )
    )
    .mutation(
      async ({
        ctx,
        input: { originalTaskId, similarTaskId },
      }): Promise<Task> => {
        const caller = appRouter.createCaller(ctx);

        try {
          // get assignments from merged and similar tasks
          const mergedAssignments = (
            await ctx.supabase
              .from("assignments")
              .select("*, documents(hash)")
              .eq("task_id", originalTaskId)
          ).data;

          if (!mergedAssignments) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Error in mergedAssignments`,
            });
          }

          const similarAssignments = (
            await ctx.supabase
              .from("assignments")
              .select("*, documents(hash)")
              .eq("task_id", similarTaskId)
          ).data;

          if (!similarAssignments) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Error in similarAssignments`,
            });
          }

          // join assignments based on document hash
          // assumes that there will not be 2 documents with the same content and different doc_id within the same task
          const hash2Id: any = {};
          mergedAssignments?.forEach((a) => {
            if (!(a.documents?.hash! in hash2Id)) {
              hash2Id[a.documents?.hash!] = a.document_id;
            }
          });

          // modify similar assignments with new data from original task
          const assignmentsWithoutId = similarAssignments?.map((a) => {
            const newDocumentId = hash2Id[a.documents?.hash!];
            const { id, documents, ...assignmentWithoutId } = a;
            return {
              ...assignmentWithoutId,
              task_id: originalTaskId,
              document_id: newDocumentId,
              original_task_id: similarTaskId,
            };
          });

          // add similar assignemnts to merged task
          const mergedSimilarAssignments = (
            await ctx.supabase
              .from("assignments")
              .insert(assignmentsWithoutId)
              .select()
          ).data;

          // leveraging the fact that the new assigmnets are created and returned in the same order as the paramaters provided
          let dicAssignments: any = {};
          mergedSimilarAssignments?.forEach((na, index) => {
            dicAssignments[similarAssignments[index].id] = na.id;
          });

          // get similar annotations
          const similarAnnotations: any[] =
            await caller.annotation.findAnnotationsByTask(similarTaskId);

          // modify similar annotations with new similar ids

          const annotationsWithoutId = similarAnnotations.map((ann) => {
            const { id, assignment, ...annotationsWithoutId } = ann;
            return {
              ...annotationsWithoutId,
              assignment_id: dicAssignments[ann.assignment_id],
            };
          });

          // add new similar annotations to merged task
          const mergedSimilarAnnotations = (
            await ctx.supabase
              .from("annotations")
              .insert(annotationsWithoutId)
              .select()
          ).data;

          // get relations from similar task
          const relations: any[] = await caller.relation.findRelationsByTask(
            similarTaskId
          );

          let dicAnnotations: any = {};
          mergedSimilarAnnotations?.forEach((na, index) => {
            dicAnnotations[similarAnnotations[index].id] = na.id;
          });

          // create new relations
          const relationsWithoutId = relations.map((r) => {
            const { id, annotation, assignment, ...relationWithoutId } = r;
            return {
              ...relationWithoutId,
              from_id: dicAnnotations[r.from_id]!,
              to_id: dicAnnotations[r.to_id]!,
            };
          });

          const new_relations = (
            await ctx.supabase
              .from("annotation_relations")
              .insert(relationsWithoutId)
              .select()
          ).data;

          const mergedTask = await caller.task.findById(originalTaskId);

          return mergedTask;
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error in mergeTasks: ${error}`,
          });
        }
      }
    ),
});

export type TaskRouter = typeof taskRouter;
