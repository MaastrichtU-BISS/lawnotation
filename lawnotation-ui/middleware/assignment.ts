
import { Assignment, useAssignmentApi } from "../data/assignment"

export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();
    const assignemntApi = useAssignmentApi();

    const assignment: Assignment = await assignemntApi.findAssignment(to.params.assignment_id);
    const project_id = (await supabase.from("tasks").select('project_id').eq('id', assignment.task_id).single()).data?.project_id;
    const editor_id = (await supabase.from("projects").select('editor_id').eq('id', project_id).single()).data?.editor_id;

    if(user.value?.id == editor_id) {
        // console.log('yes')
    }
    else {
        // console.log('no')
        // abortNavigation();
        return navigateTo("/")
    }
    
})