import { z } from 'zod'
import { router } from '~/server/trpc'

import { relationRouter } from './relation.router';
import { annotationRouter } from './annotation.router';
import { assignmentRouter } from './assignment.router';
import { documentRouter } from './document.router';
import { labelsetRouter } from './labelset.router';
import { projectRouter } from './project.router';
import { taskRouter } from './task.router';
import { userRouter } from './user.router';

export const appRouter = router({
  relation: relationRouter,
  annotation: annotationRouter,
  assignment: assignmentRouter,
  document: documentRouter,
  labelset: labelsetRouter,
  project: projectRouter,
  task: taskRouter,
  user: userRouter
})

// export type definition of API
export type AppRouter = typeof appRouter 