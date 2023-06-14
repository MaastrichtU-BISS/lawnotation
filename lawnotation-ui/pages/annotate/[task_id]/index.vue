<template>
  <template v-if="assignment">
    <div class="my-4 px-8 flex justify-between">
      <span>&nbsp;</span>
      <div
        class="max-w-screen-md w-full"
        v-if="loadedData && seq_pos && assignmentCounts"
      >
        <div class="flex justify-between mb-1">
          <span class="text-base font-medium text-gray-500 text-muted dark:text-white">Assignment</span>
          <span class="text-sm font-medium text-blue-700 dark:text-white">{{ seq_pos }} / {{ assignmentCounts.total }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" :style="{'width': `${(seq_pos / assignmentCounts.total)*100}%`}"></div>
        </div>
      </div>

      <span>status: <span :class="assignmentStatusClass(assignment.status)">{{ assignment.status }}</span></span>
    </div>
    <div class="dimmer-wrapper" style="min-height: 200px">
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        <LabelStudio
          v-if="loadedData"
          :assignment="assignment"
          :user="user"
          :isEditor="isEditor"
          :text="doc?.full_text"
          :annotations="ls_annotations"
          :relations="ls_relations"
          :labels="labels"
          :guidelines="task?.ann_guidelines"
          :key="key"
          @nextAssignment="loadNext"
          @previousAssignment="loadPrevious"
        ></LabelStudio>
      </div>
    </div>
  </template>
</template>
<script setup lang="ts">
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";
import { Labelset, LsLabels, useLabelsetApi } from "~/data/labelset.js";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";
import {
  AnnotationRelation,
  useAnnotationRelationApi,
  LSSerializedRelation,
} from "~/data/annotation_relations";
const relationApi = useAnnotationRelationApi();

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const assignmentApi = useAssignmentApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();
const labelsetApi = useLabelsetApi();
const annotationApi = useAnnotationApi();

const { $toast } = useNuxtApp();

type Id = number;

const route = useRoute();
const router = useRouter();
const assignment = ref<Assignment>();
const task = ref<Task>();
const doc = ref<Document>();
const loadedData = ref(false);

// const annotations = reactive<Annotation[]>([]);
// const relations = reactive<AnnotationRelation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotation>([]);
const ls_relations = reactive<LSSerializedRelation[]>([]);
const labels = reactive<LsLabels>([]);
const isEditor = ref<boolean>();
const assignmentCounts = ref<{ next: number ; total: number }>();

const assignmentStatusClass = (status: Assignment['status']) => {
  return status === 'done' ? 'text-green-600' : 'text-red-500';
}

const loading = ref(false);
const key = ref("ls-default");

// const seq_pos = ref(assignment.value?.seq_pos ?? 1);
const seq_pos = ref<number>(assignment.value?.seq_pos ?? 0);
watch(seq_pos, (val) => {
  if (!Array.isArray(route.query.seq) && route.query.seq == val.toString())
    return;
  
  router.replace({
    path: route.path,
    query: { seq: val },
  });
})

const loadPrevious = async () => {
  if (!assignment.value)
    throw Error("Assignment not found");
  
  if (assignment.value.seq_pos <= 1)
    throw Error("Already at first item");

  seq_pos.value -= 1;

  await loadData();
}

const loadNext = async () => {
  if (!assignment.value)
    throw Error("Assignment not found");

  seq_pos.value += 1;

  if (assignmentCounts.value && assignmentCounts.value.total == seq_pos.value) {
    // TODO: go to page /done
    alert("All tasks were done: you will be signed out");
    // supabase.auth.signOut();
  } else {
    await loadData();
  }
};

const loadData = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");

    loading.value = true;
    key.value = `ls-${seq_pos.value}`;
    
    if (seq_pos.value) {
      assignment.value = await assignmentApi.findAssignmentsByUserTaskSeq(
        user.value.id,
        route.params.task_id.toString(),
        seq_pos.value
      );
    } else {
      assignment.value = await assignmentApi.findNextAssignmentsByUserAndTask(
        user.value.id,
        route.params.task_id.toString()
      );
      
      seq_pos.value = assignment.value.seq_pos;
    }

    if (!assignment.value) throw Error("Assignment not found");

    doc.value = await documentApi.findDocument(assignment.value.document_id.toString());
    if (!doc.value) throw Error("Document not found");

    if (!assignment.value.task_id) throw Error("Document not found");
    task.value = await taskApi.findTask(assignment.value.task_id?.toString());

    const _labelset: Labelset = await labelsetApi.findLabelset(task.value.labelset_id.toString());

    labels.splice(0)
    labels.push(..._labelset.labels.map((l) => l));

    const _annotations = await annotationApi.findAnnotations(assignment.value.id.toString());

    ls_annotations.splice(0)
    if (_annotations.length) {
      const db2ls_anns = annotationApi.convert_db2ls(_annotations, assignment.value.id);
      ls_annotations.push(...db2ls_anns);
    }

    const _relations = await relationApi.findRelations(_annotations);
    // relations.splice(0) &&
    //   relations.push(..._relations);

    ls_relations.splice(0)
    if (_relations.length) {
      const db2ls_rels = _relations.map((r) => relationApi.convert_db2ls(r));
      ls_relations.push(...db2ls_rels);
    }

    isEditor.value = user.value.id != assignment.value.annotator_id;

    loadedData.value = true;
    loading.value = false;
    key.value = "ls-" + assignment.value.id;
  } catch (error) {
    if (error instanceof Error) $toast.error(`Problem loading data: ${error.message}`);
    loading.value = false;
  }
};

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!route.params.task_id || Array.isArray(route.params.task_id)) throw new Error("Invalid task");

    const counts = await assignmentApi.countAssignmentsByUserAndTask(
      user.value.id,
      parseInt(route.params.task_id)
    );

    assignmentCounts.value = counts;

  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Problem loading counters: ${error.message}`);
  }
};

const init = async () => {
  await loadCounters();
  if (route.query.seq && !Array.isArray(route.query.seq) && parseInt(route.query.seq) > 0 && parseInt(route.query.seq) < assignmentCounts.value!.total) {
    seq_pos.value = parseInt(route.query.seq);
  }
  loadData();
}

onMounted(async () => {
  if (user.value) {
    init()
  } else {
    watch(user, async () => {
      if (user.value)
        init();
    });
  }
});

definePageMeta({
  middleware: ["auth"],
  layout: "wide",
});
</script>
