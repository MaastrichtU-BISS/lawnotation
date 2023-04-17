
import { Assignment, useAssignmentApi } from "../data/assignment"

export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();
    const assignemntApi = useAssignmentApi();

    const assignment: Assignment = await assignemntApi.findAssignment(to.params.assignment_id);
    
    // Is the anotater of the assignment or the owner of the project
    if(user.value?.id != assignment.user_id?.toString()) {
        return abortNavigation();
    }
    
})