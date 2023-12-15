# Front- and backend communication
The most common form of communication is done by [tRPC](https://trpc.io/). Nevertheless, it is also possible to leverage Nuxt's built-in server and fetch methods for the same goal. To integrate tRPC better into Nuxt's handling of data, we make use of [tRPC-nuxt](https://trpc-nuxt.vercel.app/) aswell.

## Authorization
With authorization, we mean deciding whether a user has access to perform a specific action on a specific resource. Authorization should be implemented on both API routes and frontend Nuxt pages. We kill two birds with one stone by defining the authorization logic only in the tRPC calls: the authorization middleware for frontend pages only contains the spec of one or more API endpoints. If these endpoints produce a 404 error, navigation to the page is aborted. 

### Definition in router
Most commonly, authorization logic will be defined as a tRPC middleware (in the `.use(...)` method) on the respective procedure. Ideally, the middleware is placed after the chained ``.input()`` method, since here we can read already validated properties of the input and get TypeScript inference aswell:
```ts
{
  'procedure': protectedProcedure
    .input(z.number())
    .use((opts) => throw new TRPCError({code: "NOT_FOUND"}))
    .query((opts) => {...})
}
```
Generally, users that have the 'admin' role should be able to access all procedures. To reduce boilerplate code in the authorization definitions for all of these repeated clauses, a middleware factory was made. Though its usage might seem intimidating, it significantly simplifies the required code for authorizing a user. The middleware, next to tRPC's `opts` object, takes as input a function that returns a boolean: `true` if the user is authorized, and `false` if it is not.

An example of using the `authorizer` middleware factory:
```ts
{
  'procedure': protectedProcedure
    .input(z.number())
    .use(
      opts =>
        authorizer(opts, () => false)
    )
    .query((opts) => {/* ... */})
}
```

This example will only allow access to admin-users, since the resolver function always returns false (for regular users), while the authorizer function contains logic for granting access to admins.

When there are many procedures with equivalent permissions, for example because they refer to the same resource, one can create a function authorizing this specific resource. Take the project authenticator for instance:

```ts
const projectAuthorizer = async (project_id: number, user_id: string, ctx: Context) => {
  const {count} = await ctx.supabase
    .from("projects")
    .select('*', {count: 'exact', head: true})
    .eq('id', project_id)
    .eq('user_id', user_id);

  return count === 1
}
```

And use it in the router as follows:
```ts
export const projectRouter = router({
  'findById': protectedProcedure
    .input(z.number().int())
    .use(
      opts =>
        authorizer(opts, () =>
          // here we pass project_id as opts.input
          projectAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .query(async (opts) => {/* ... */}),
   
  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: z.object({})
      })
    )
    .use(
      opts =>
        authorizer(opts, () =>
          // here we pass project_id as opts.input.id
          projectAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx))
    )
    .mutate(async (opts) => {/* ... */}),
```

### Definition in page
As described above, we take into account the authorization definitions in the procedures when validating users navigating to pages. The definition of what resources are attempted to be accessed on the page, are defined in the `definePageMeta()` 's middleware section. For this middleware, we have also created a factory, called `authorizeClient()`. This function takes an array of 2-tuples. Each entry of each tuple contains the resource type and the identifier for the resource respectively. Due to technical difficulties of passing complete tRPC-paths (including router and procedure name), we only assume the resource-type to be the router-name, and try to access the `findById` procedure on that router. Make sure that in the middleware array, the factory is passed after the regular `auth`-middleware, since this initializes initial authentication-related properties which are required to adequately perform the authorization query.

An example of the page implementation for the project page: 
```ts
definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([
      ["project", +to.params.project_id],
    ]),
  ],
});
```

Another advantage of the `authorizeClient` middleware factory: since this middleware always attempts to resolve the `findById` procedure, we get the respective resource data if we are granted access. This data is often to be consumed somewhere on the page the middleware is defined on. Therefore, we store this data in a composable called `usePage`. Reusing this data on the page component is easy: 
```ts
const { project } = usePage<{ project: Project }>().value;
```
Make sure to pass the correct generic to the `usePage` composable, since this is currently not automatically inferred from the middleware definition.
