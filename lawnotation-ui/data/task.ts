import { useAnnotationApi } from "./annotation";
import { useAssignmentApi } from "./assignment";
import { useAnnotationRelationApi } from "./annotation_relations";

export type Task = {
  id: number;
  name: string;
  desc: string;
  project_id: number;
  labelset_id: number;
  ann_guidelines: string;
};

export const useTaskApi = () => {
  const supabase = useSupabaseClient();

  // Create
  const createTask = async (fields: Omit<Task, "id">): Promise<Task> => {
    const { data, error } = await supabase
      .from("tasks")
      .insert(fields)
      .select()
      .single();
    if (error) throw Error(`Error in createTask: ${error.message}`);
    else return data as Task;
  };

  // Read
  const findTask = async (id: string): Promise<Task> => {
    const { data, error } = await supabase
      .from("tasks")
      .select()
      .eq("id", id)
      .single();

    if (error) throw Error(`Error in findTask: ${error.message}`);
    else return data as Task;
  };

  // Read all
  const findTasks = async (project_id: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from("tasks")
      .select()
      .eq("project_id", project_id);

    if (error) throw Error(`Error in findTask: ${error.message}`);
    else return data as Task[];
  };

  // Read all
  const getCountByUser = async (editor_id: string): Promise<never> => {
    const { data, error } = await supabase
      .rpc("get_count_tasks", { e_id: editor_id })
      .single();

    if (error) throw Error(`Error in getCountByUser: ${error.message}`);
    else return data;
  };

  const getAllAnnotatorTasks = async (
    annotator_id: string
  ): Promise<Task[]> => {
    const { data, error } = await supabase.rpc("get_all_annotator_tasks", {
      a_id: annotator_id,
    });
    if (error) throw Error(`Error in getAllAnnotatorTasks: ${error.message}`);
    else return data as Task[];
  };

  // Update
  const updateTask = async (
    id: string,
    fields: Partial<Task>
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from("tasks")
      .update(fields)
      .eq("id", id);

    if (error) throw Error(`Error in updateTask: ${error.message}`);
    else return true;
  };

  // Delete
  const deleteTask = async (id: string) => {
    const { data, error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) throw Error(`Error in deleteTask: ${error.message}`);
    else return true;
  };

  const deleteAllTasks = async (project_id: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("project_id", project_id);

    if (error) throw Error(`Error in deleteAllTasks: ${error.message}`);
    else return true;
  };

  const replicateTask = async (task_id: string): Promise<Task> => {
    const annotationApi = useAnnotationApi();
    const assignmentApi = useAssignmentApi();
    const relationApi = useAnnotationRelationApi();

    const task = await findTask(task_id);
    const new_task = await createTask({
      name: task.name,
      desc: task.desc,
      project_id: task.project_id,
      ann_guidelines: task.ann_guidelines,
      labelset_id: task.labelset_id,
    });

    const assignments = await assignmentApi.findAssignmentsByTask(task_id);

    // console.log(assignments);

    const new_assignments = await assignmentApi.createAssignments(
      assignments.map((a) => {
        return {
          task_id: new_task.id,
          annotator_id: a.annotator_id,
          document_id: a.document_id,
          seq_pos: a.seq_pos,
          status: a.status,
          difficulty_rating: a.difficulty_rating,
        };
      })
    );

    let dicAssignments: any = {};
    new_assignments.map((na, index) => {
      dicAssignments[assignments[index].id] = na.id;
    });

    // console.log(new_assignments);

    const annotations = await annotationApi.findAnnotationsByTask(task_id);

    // console.log(annotations);

    const new_annotations = await annotationApi.createAnnotations(
      annotations.map((a) => {
        return {
          assignment_id: dicAssignments[a.assignment_id],
          label: a.label,
          start_index: a.start_index,
          end_index: a.end_index,
          text: a.text,
          ls_id: a.ls_id,
          origin: a.origin,
        };
      })
    );

    // console.log(new_annotations);

    const relations = await relationApi.findRelations(annotations);
    // console.log(relations);

    let dicAnnotations: any = {};
    new_annotations.map((na, index) => {
      dicAnnotations[annotations[index].id] = na.id;
    });

    const new_relations = await relationApi.createRelations(
      relations.map((a) => {
        return {
          direction: a.direction,
          from_id: dicAnnotations[a.from_id],
          to_id: dicAnnotations[a.to_id],
          labels: a.labels,
          ls_from: a.ls_from,
          ls_to: a.ls_to,
        };
      })
    );

    // console.log(new_relations);

    return new_task;
  };

  return {
    createTask,
    findTask,
    findTasks,
    replicateTask,
    getCountByUser,
    getAllAnnotatorTasks,
    updateTask,
    deleteTask,
    deleteAllTasks,
  };
};
