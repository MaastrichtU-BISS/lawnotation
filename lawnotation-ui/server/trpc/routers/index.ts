import { z } from 'zod'
import { publicProcedure, router } from '~/server/trpc'

import { relationRouter } from './relation.router';
import { annotationRouter } from './annotation.router';

export const appRouter = router({
  relation: relationRouter,
  annotation: annotationRouter
})

// export type definition of API
export type AppRouter = typeof appRouter 