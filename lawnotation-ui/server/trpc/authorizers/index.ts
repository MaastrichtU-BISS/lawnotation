import type { Context } from '../context';

export type AuthorizerDefinition = (object_id: number, user_id: string, ctx: Context) => Promise<boolean>;

export * from './assignment.auth'
export * from './project.auth'
export * from './task.auth'
export * from './document.auth'
export * from './labelset.auth'
export * from './publication.auth'