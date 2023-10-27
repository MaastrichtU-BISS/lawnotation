import { TRPCClientError } from "@trpc/client";

/**
 * Handle certain type of tRPC errors
 * @param error The error instance that was thrown
 * @param what The action that was taken when the error occured. 
 *             For example: "creating a project"
 */
export const trpcErrorHandler = (error: Error, what: string = "") => {
  what = what.length > 0 ? `Error ${what}` : `Error`
  const { $toast } = useNuxtApp();
  if (error instanceof TRPCClientError) {
    if (error instanceof TRPCClientError) {
      for (const [field, message] of Object.entries(error.data.zodErrors.fieldErrors)) {
        $toast.error(`${what}: field "${field}": ${message}`);
      }
      for (const message of error.data.zodErrors.formErrors) {
        $toast.error(`${what}: ${message}`);
      }
    }
  } else if (error instanceof Error)
    $toast.error(`${what}: ${error.message}`);
}

export default trpcErrorHandler