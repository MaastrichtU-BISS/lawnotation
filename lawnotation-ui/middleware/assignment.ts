
import { Assignment, useAssignmentApi } from "../data/assignment"

export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();
    const assignemntApi = useAssignmentApi();

    const assignment: Assignment = await assignemntApi.findAssignment(to.params.assignment_id);

    // Is the anotater of the assignment or the owner of the project
    if(user.value?.email == assignment.annotator_email || user.value?.id == assignment.editor_id) {
        // console.log()
    }
    else {
        return abortNavigation();
    }
    
})