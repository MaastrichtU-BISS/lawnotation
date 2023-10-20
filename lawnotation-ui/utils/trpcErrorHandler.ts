import { TRPCClientError } from "@trpc/client";

export const handleErrorFor = (error: Error, what: string) => {
    const { $toast } = useNuxtApp();
    if (error instanceof TRPCClientError) {
        if (error instanceof TRPCClientError) {
            for (const [field, message] of Object.entries(error.data.zodErrors.fieldErrors)) {
            $toast.error(`Field "${field}": ${message}`);
            }
            for (const message of error.data.zodErrors.formErrors) {
            $toast.error(`Form error: ${message}`);
            }
        }
    } else if (error instanceof Error)
        $toast.error(`Error creating new project: ${error.message}`);
}

export default handleErrorFor