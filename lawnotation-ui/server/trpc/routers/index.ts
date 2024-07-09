import { z } from 'zod'
import { publicProcedure, router } from '~/server/trpc'

import { relationRouter } from './relation.router';
import { annotationRouter } from './annotation.router';
import { assignmentRouter } from './assignment.router';
import { documentRouter } from './document.router';
import { labelsetRouter } from './labelset.router';
import { projectRouter } from './project.router';
import { taskRouter } from './task.router';
import { publicationRouter } from './publication.router';
import { mlModelRouter } from './ml_model.router';
import { userRouter } from './user.router';
import { metricsRouter } from './metrics.router';
import { tableRouter } from './table.router';
import { hookRouter } from './hook.router';
import { archiveRouter } from './archive.router';

export const appRouter = router({
  relation: relationRouter,
  annotation: annotationRouter,
  assignment: assignmentRouter,
  document: documentRouter,
  labelset: labelsetRouter,
  project: projectRouter,
  task: taskRouter,
  publication: publicationRouter,
  mlModel: mlModelRouter,
  hook: hookRouter,
  user: userRouter,
  table: tableRouter,
  archive: archiveRouter
  // metrics: metricsRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter 