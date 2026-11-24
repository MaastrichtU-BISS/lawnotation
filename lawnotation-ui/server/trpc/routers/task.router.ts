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
import * as _ from "lodash";
import { buildTaskExportData, toExportJson } from "~/server/utils/task_export";
import { copyDocumentRelations } from "~/server/utils/annotation_kit";

const ZTaskFields = z.object({
  name: z.string(),
  desc: z.string(),
  project_id: z.number().int(),
  labelset_id: z.number().int(),
  // Hybrid tasks: the labelset for whole-document tags next to the span
  // labelset. Chosen when the task is created; span levels only.
  document_labelset_id: z.number().int().nullable().optional(),
  ann_guidelines: z.string(),
  ml_model_id: z.number().int().nullable().optional(),
  annotation_level: z.nativeEnum(AnnotationLevels),
  origin_task_1_id: z.number().int().nullable().optional(),
  origin_task_2_id: z.number().int().nullable().optional(),
});

// Most rows one insert statement takes; postgres.js allows at most 65534
// parameters in a query.
const INSERT_CHUNK_SIZE = 1000;

/**
 * Inserts rows (any number) and returns the inserted rows in the order given,
 * the way the copies of a task's assignments, annotations and relations are
 * mapped from old to new ids.
 */
async function insertRows(
  sql: Context["sql"],
  table: string,
  rows: object[]
): Promise<any[]> {
  if (!rows.length) return [];
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const inserted: any[] = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    inserted.push(
      ...(await sql`
        insert into ${sql(table)} ${sql(chunk as Record<string, any>[], columns)} returning *
      `)
    );
  }
  return inserted;
}

/**
 * A task's annotators, one row per annotator number: { id, email, role,
 * annotator_number }, with a null user for an annotator not (yet) linked to
 * one. What the database function get_all_annotators_from_task returns; that
 * function selects `u.*` and no longer matches its declared columns since
 * users got more of them.
 */
function annotatorsOfTask(sql: Context["sql"], task_id: number) {
  return sql<{ id: string | null; email: string | null; role: string | null; annotator_number: number }[]>`
    select u.id, u.email, u.role, a.annotator_number::int as annotator_number
    from assignments as a
    left join users as u on (a.annotator_id = u.id)
    where a.task_id = ${task_id}
    group by u.id, a.annotator_number
    order by annotator_number
  `;
}

const ZExportTaskOptions = z.object({
  name: z.boolean(),
  desc: z.boolean(),
  ann_guidelines: z.boolean(),
  labelset: z.boolean(),
  documents: z.boolean(),
  annotations: z.boolean(),
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
      const sql = ctx.sql;
      const conds = Object.entries(input.filter ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => sql`${sql(key)} = ${value}`);
      const where = conds.length
        ? sql`where ${conds.reduce((acc, x) => sql`${acc} and ${x}`)}`
        : sql``;
      const range = input.range
        ? sql`limit ${input.range[1] - input.range[0] + 1} offset ${input.range[0]}`
        : sql``;

      try {
        return (await sql`select * from tasks ${where} ${range}`) as unknown as Task[];
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.find: ${error.message}`,
        });
      }
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
        if (input.new_emails[i] != annotators[i]!.email) {
          const assignments =
            await caller.assignment.findAssignmentsByTaskAndUser({
              annotator_number: annotators[i]!.annotator_number,
              task_id: input.task_id,
            });

          let new_user = null;
          if (input.new_emails[i] && input.new_emails.length) {
            new_user = await caller.assignment.assignUserToTask({
              email: input.new_emails[i]!,
              task_id: input.task_id,
            });
          }

          for (let j = 0; j < assignments.length; j++) {
            const ass = assignments[j]!;
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

          annotators[i]!.email = input.new_emails[i]!;
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
      let rows;
      try {
        rows = await ctx.sql<Task[]>`select * from tasks where id = ${id}`;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.findById: ${error.message}`,
        });
      }
      if (rows.length !== 1)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.findById: task ${id} not found`,
        });
      return rows[0] as Task;
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
      type SimilarTaskRow = {
        id: number;
        name: string | null;
        annotation_level: string;
        labelsets: { labels: unknown } | null;
        document_labelsets: { labels: unknown } | null;
      };

      // The task with its labels and its document labels (null when the task
      // has no such labelset).
      const taskWithLabels = () => ctx.sql`
        select t.id, t.name, t.annotation_level,
               case when l.id is null then null else json_build_object('labels', l.labels) end as labelsets,
               case when dl.id is null then null else json_build_object('labels', dl.labels) end as document_labelsets
        from tasks as t
        left join labelsets as l on (l.id = t.labelset_id)
        left join labelsets as dl on (dl.id = t.document_labelset_id)
      `;

      let originTask: SimilarTaskRow;
      try {
        const rows = await ctx.sql<SimilarTaskRow[]>`
          ${taskWithLabels()} where t.id = ${task_id}
        `;
        if (rows.length !== 1) throw new Error(`task ${task_id} not found`);
        originTask = rows[0]!;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSimilarTasks: ${error.message}`,
        });
      }

      const docsOfTask = (t_id: number) =>
        ctx.sql<{ id: number; hash: string }[]>`
          select * from get_all_docs_from_task_mini(t_id => ${t_id}::int)
        `;

      const originTaskDocuments = await docsOfTask(task_id);

      // consider only projects from this user, exclude the origin task and
      // filter out different annotation levels
      const candidateTasks = await ctx.sql<SimilarTaskRow[]>`
        ${taskWithLabels()}
        inner join projects as p on (p.id = t.project_id)
        where p.editor_id = ${ctx.user.id}
          and t.id <> ${task_id}
          and t.annotation_level = ${originTask.annotation_level}
        order by p.id, t.id
      `;

      const tasks: { id: number; name: string }[] = [];

      for (let j = 0; j < candidateTasks.length; j++) {
        const currentTask = candidateTasks[j]!;

        // filters out different labelset
        // at the moment they have to be exactly the same (same order and same colors too)
        if (!_.isEqual(originTask.labelsets, currentTask.labelsets)) continue;
        // and the same document labelset (none, for a task that is not hybrid)
        if (
          !_.isEqual(originTask.document_labelsets, currentTask.document_labelsets)
        )
          continue;

        // filters out different annotators
        const currentTaskAnnotators = (
          await annotatorsOfTask(ctx.sql, currentTask.id)
        ).map((ann) => ann.email) as string[];

        if (_.xor(annotators, currentTaskAnnotators).length !== 0) continue;

        // // filters out different documents without at least one document in common (according to hash)
        const currentTaskDocuments = await docsOfTask(currentTask.id);

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
      try {
        const [task] = await ctx.sql<Task[]>`
          insert into tasks ${ctx.sql(input)} returning *
        `;
        return task as Task;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.create: ${error.message}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        // The document labelset is chosen at creation and does not change.
        updates: ZTaskFields.omit({ project_id: true, document_labelset_id: true }).partial(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const columns = Object.keys(input.updates).filter(
        (k) => (input.updates as Record<string, unknown>)[k] !== undefined
      );
      let rows;
      try {
        rows = columns.length
          ? await ctx.sql<Task[]>`
              update tasks set ${ctx.sql(input.updates, columns as any)}
              where id = ${input.id}
              returning *
            `
          : await ctx.sql<Task[]>`select * from tasks where id = ${input.id}`;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.update: ${error.message}`,
        });
      }
      if (rows.length !== 1)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.update: task ${input.id} not found`,
        });
      return rows[0] as Task;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`delete from tasks where id = ${input}`;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.delete: ${error.message}`,
        });
      }
      return true;
    }),

  // Extra procedures

  getCountByUser: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [{ v }] = await ctx.sql<[{ v: number }]>`
        select get_count_tasks(e_id => ${ctx.user.id}::uuid)::int as v
      `;
      return v as number;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error in tasks.getCountByUser: ${error.message}`,
      });
    }
  }),

  getCountByLabelset: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: labelset_id }) => {
      try {
        const [{ count }] = await ctx.sql<[{ count: number }]>`
          select count(*)::int as count from tasks
          where labelset_id = ${labelset_id} or document_labelset_id = ${labelset_id}
        `;
        return count as number;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.findById: ${error.message}`,
        });
      }
    }),

  getAllAnnotatorTasks: disabledProcedure
    .input(z.string())
    .query(async ({ ctx, input: annotator_id }) => {
      try {
        return (await ctx.sql`
          select * from get_all_annotator_tasks(a_id => ${annotator_id}::uuid)
        `) as unknown as Task[];
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getAllAnnotatorTasks: ${error.message}`,
        });
      }
    }),

  getAllAnnotatorsFromTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await annotatorsOfTask(ctx.sql, task_id)) as unknown as Annotator[];
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.getAllAnnotatorsFromTask: ${error.message}`,
        });
      }
    }),

  deleteAllFromProject: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input: project_id }) => {
      try {
        await ctx.sql`delete from tasks where project_id = ${project_id}`;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in tasks.delete: ${error.message}`,
        });
      }
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

        const new_assignments = (await insertRows(
          ctx.sql,
          "assignments",
          assignmentsWithoutId
        )) as Assignment[];

        // leveraging the fact that the new assigmnets are created and returned in the same order as the paramaters provided
        let dicAssignments: any = {};

        new_assignments?.forEach((na, index) => {
          dicAssignments[assignments[index]!.id] = na.id;
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

        const new_annotations = await insertRows(
          ctx.sql,
          "annotations",
          annotationsWithoutId
        );

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
        const new_relations = (await insertRows(
          ctx.sql,
          "annotation_relations",
          newRelationsWithoutId
        )) as AnnotationRelation[];

        await copyDocumentRelations(ctx.sql, dicAssignments);

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

        // A task's assignments, each with `documents: { hash }` (null when
        // the assignment has no document).
        const assignmentsWithHash = (task_id: number) =>
          ctx.sql<(Assignment & { documents: { hash: string } | null })[]>`
            select a.*,
                   case when d.id is null then null else json_build_object('hash', d.hash) end as documents
            from assignments as a
            left join documents as d on (d.id = a.document_id)
            where a.task_id = ${task_id}
          `;

        try {
          // get assignments from merged and similar tasks
          const mergedAssignments = await assignmentsWithHash(originalTaskId);

          if (!mergedAssignments) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Error in mergedAssignments`,
            });
          }

          const similarAssignments = await assignmentsWithHash(similarTaskId);

          if (!similarAssignments) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Error in similarAssignments`,
            });
          }

          // join assignments based on document hash
          // assumes that there will not be 2 documents with the same content and different doc_id within the same task
          // also continue the seq_pos for each annotator starting from the biggest value from merged task
          const annotator2lastSeqPos: any = {};
          const hash2Id: any = {};
          mergedAssignments?.forEach((a) => {
            if (!(annotator2lastSeqPos[a.annotator_number])) {
              annotator2lastSeqPos[a.annotator_number] = 0;
            }
            annotator2lastSeqPos[a.annotator_number] = Math.max(annotator2lastSeqPos[a.annotator_number], a.seq_pos!);
            if (!(a.documents?.hash! in hash2Id)) {
              hash2Id[a.documents?.hash!] = a.document_id;
            }
          });

          // modify similar assignments with new data from original task
          const assignmentsWithoutId = similarAssignments?.map((a) => {
            const newDocumentId = hash2Id[a.documents?.hash!];
            const { id, documents, ...assignmentWithoutId } = a;
            const new_seq_pos = ++annotator2lastSeqPos[a.annotator_number];
            return {
              ...assignmentWithoutId,
              task_id: originalTaskId,
              document_id: newDocumentId,
              original_task_id: similarTaskId,
              seq_pos: new_seq_pos
            };
          });

          // add similar assignemnts to merged task
          const mergedSimilarAssignments = await insertRows(
            ctx.sql,
            "assignments",
            assignmentsWithoutId
          );

          // leveraging the fact that the new assigmnets are created and returned in the same order as the paramaters provided
          let dicAssignments: any = {};
          mergedSimilarAssignments?.forEach((na, index) => {
            dicAssignments[similarAssignments[index]!.id] = na.id;
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
          const mergedSimilarAnnotations = await insertRows(
            ctx.sql,
            "annotations",
            annotationsWithoutId
          );

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

          const new_relations = await insertRows(
            ctx.sql,
            "annotation_relations",
            relationsWithoutId
          );

          await copyDocumentRelations(ctx.sql, dicAssignments);

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

  exportData: protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        options: ZExportTaskOptions,
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const data = await buildTaskExportData(ctx.sql, input.task_id);
      return toExportJson(data, input.options);
    }),
});

export type TaskRouter = typeof taskRouter;
