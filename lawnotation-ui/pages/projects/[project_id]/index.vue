<template>
  <Breadcrumb v-if="project" :crumbs="[
    {
      name: 'Projects',
      link: '/projects',
    },
    {
      name: `Project ${project.name}`,
      link: `/projects/${project.id}`,
    },
  ]" />

  <div v-if="project">
    <p class="mt-1 mb-3 text-gray-700 text-sm">{{ project.desc }}</p>

    <div class="tabs-holder">
      <ul class="flex flex-wrap -mb-px">
        <li :class="tab_active == 'tasks' ? 'tab-active' : 'tab'">
          <button @click="tab_active = 'tasks'">Tasks</button>
        </li>
        <li :class="tab_active == 'documents' ? 'tab-active' : 'tab'">
          <button @click="tab_active = 'documents'">Documents</button>
        </li>
      </ul>
    </div>

    <div v-show="tab_active == 'documents'">
      <Table ref="documentTable" endpoint="documents" :filter="{ project_id: project?.id }" :sort="true" :search="true"
        :selectable="true" @remove-rows="removeDocuments" @remove-all-rows="removeAllDocuments">
        <template #row="{ item }: { item: Document }">
          <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
            {{ item.id }}
          </td>
          <td class="px-6 py-2">
            {{ item.name }}
          </td>
          <td class="px-6 py-2">
            <NuxtLink class="base" :to="`/projects/${route.params.project_id}/documents/${item.id}`">
              View
            </NuxtLink>
          </td>
        </template>
      </Table>

      <div class="my-3 dimmer-wrapper">
        <Dimmer v-model="loading_docs" />
        <div class="dimmer-content">
          <span class="mr-3">Add documents</span>
          <input class="base" type="file" name="data-set" id="doc_input" accept=".txt" webkitdirectory directory multiple
            @change="change_file($event)" />
        </div>
      </div>
    </div>

    <div class="dimmer-wrapper pt-2">
      <DimmerProgress v-if="import_progress.loading" v-model="import_progress" />
      <div class="dimmer-content">
        <div v-show="tab_active == 'tasks'">
          <Table ref="taskTable" endpoint="tasks" :filter="{ project_id: project?.id }" :sort="true" :search="true"
            :selectable="true" @remove-rows="removeTasks" @remove-all-rows="removeAllTasks">
            <template #row="{ item }: { item: Task }">
              <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                {{ item.id }}
              </td>
              <td class="px-6 py-2">
                {{ item.name }}
              </td>
              <td class="px-6 py-2">
                {{ item.desc }}
              </td>
              <td class="px-6 py-2">
                <NuxtLink class="base mr-2" :to="`/projects/${route.params.project_id}/tasks/${item.id}`">
                  <button class="base btn-primary">View</button>
                </NuxtLink>
                <NuxtLink class="base" :to="`/projects/${route.params.project_id}/tasks/${item.id}/edit`">
                  Edit
                </NuxtLink>
              </td>
            </template>
          </Table>

          <div class="flex my-3 text-center">
            <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3 mx-3">
              <h3 class="text-lg mt-8">Create new task</h3>
              <input class="base" type="text" placeholder="Task name" v-model="new_task.name" />
              <textarea class="base" placeholder="Task description" v-model="new_task.desc"></textarea>
              <textarea class="base" placeholder="Annotation Guidelines" v-model="new_task.ann_guidelines"></textarea>

              <label for="label_id">Labelset</label>
              <div class="flex items-start w-full space-x-2">
                <select v-model="new_task.labelset_id"
                  class="w-full flex-grow bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-2.5 py-1.5">
                  <option v-if="labelsets.pending.value" disabled selected value="">
                    Loading labelsets...
                  </option>
                  <template v-else-if="labelsets.data.value && labelsets.data.value.length">
                    <option :value="undefined" disabled selected hidden>
                      Select from list
                    </option>
                    <option v-for="labelset of labelsets.data.value" :value="labelset.id">
                      {{ labelset.name }}
                    </option>
                  </template>
                  <option v-else disabled selected value="">No labelsets found</option>
                </select>
                <button class="base btn-secondary" style="flex: 0 0 content" @click="() => navigateTo('/labelset/new')">
                  Create new labelset
                </button>
              </div>

              <button class="base btn-primary" @click="createTask">Create Tasks</button>
            </div>
            <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3 mx-3">
              <h3 class="text-lg mt-8 semibold">Import task</h3>
              <div class="flex items-center justify-center w-full">
                <label for="dropzone-file"
                  class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                      fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                    </svg>
                    <p class="mb-2 text-sm text-gray-500">
                      <span class="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p class="text-xs text-gray-500">.json</p>
                  </div>
                  <input id="dropzone-file" type="file" class="hidden" @change="loadExportTaskFile" accept=".json" />
                </label>
              </div>
            </div>
            <ImportTaskModal v-model="annotators_amount" @done="new_emails_selected" @close="import_modal?.hide()">
            </ImportTaskModal>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Project, Document, Task, Labelset, Assignment, Annotation, User, AnnotationRelation } from "~/types";
import Table from "~/components/Table.vue";
import DimmerProgress from "~/components/DimmerProgress.vue";
import { authorizeClient } from "~/utils/authorize.client";
import ImportTaskModal from "~/components/ImportTaskModal.vue";
// import { initFlowbite } from "flowbite";
import { Modal } from "flowbite";
import type { ModalOptions } from "flowbite";

const { $toast, $trpc } = useNuxtApp();

const { project } = usePage<{ project: Project }>().value;

const user = useSupabaseUser();

const route = useRoute();

const config = useRuntimeConfig();

const loading_docs = ref(false);

const tab_active = ref<"tasks" | "documents">("tasks");

const labelsets = await $trpc.labelset.find.useQuery({});

const annotators_amount = ref<number>(0);

let import_modal: Modal | null = null;
const import_json = ref<any>(null);
const import_progress = ref<{ loading: boolean; current: number, total: number, message: string }>({
  loading: false,
  message: "Creating Task",
  current: 0,
  total: 0
});

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const documentTable = ref<InstanceType<typeof Table>>();
const taskTable = ref<InstanceType<typeof Table>>();

const new_task = reactive<Optional<Task, "id" | "labelset_id" | "project_id">>({
  name: "",
  desc: "",
  ann_guidelines: "",
  labelset_id: undefined,
  project_id: undefined,
});

const change_file = async (event: Event) => {
  var text_promises: Promise<string>[] = [];
  var new_docs: Omit<Document, "id">[] = [];
  loading_docs.value = true;

  Array.from((event.target as HTMLInputElement).files ?? []).forEach((file: File) => {
    text_promises.push(file.text());
    new_docs.push({
      name: file.name,
      source: "local_upload",
      full_text: "",
      project_id: +route.params.project_id,
    });
  });

  const texts = await Promise.all(text_promises);

  texts.forEach((t, index) => {
    new_docs[index].full_text = t;
  });

  // TODO: progress bar instead of instantly adding to list, and after all are added reload documents table (keep loading = true while adding?)
  // documents.push(...(await documentApi.createDocuments(new_docs)));
  await $trpc.document.createMany.mutate(new_docs);
  documentTable.value?.refresh();

  (event.target as HTMLInputElement).value = "";
  $toast.success(`${new_docs.length} documents uploaded!`);
  loading_docs.value = false;
};

const createTask = () => {
  try {
    if (!new_task.project_id === undefined) {
      throw new Error("Task must be part of project");
    }
    if (!new_task.labelset_id === undefined) {
      throw new Error("Task must have a labelset");
    }
    if (new_task.name == "") {
      throw new Error("Task name is required");
    }
    if (new_task.desc == "") {
      throw new Error("Task description is required");
    }

    // For some reason casting as Omit<Task, "id"> is necessary here.
    $trpc.task.create.mutate(new_task as Omit<Task, "id">).then(() => {
      // tasks.push(task);
      taskTable.value?.refresh();
      $toast.success("Task created");
    });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error creating task: ${error.message}`);
  }
};

const loadExportTaskFile = async (event: Event) => {
  const file: File = (event.target as HTMLInputElement).files?.item(0)!;
  (event.target as any).value = null;
  import_json.value = JSON.parse(await file.text());

  if (import_json.value.counts?.annotators) {

    annotators_amount.value = import_json.value.counts?.annotators ?? 0;

    const modalOptions: ModalOptions = {
      placement: "center",
      backdrop: "dynamic",
      backdropClasses: "bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40",
      closable: true,
    };

    import_modal = new Modal(document.getElementById("importFormModal"), modalOptions);

    import_modal?.show();
  } else {
    importTask();
  }
};

const new_emails_selected = async (new_emails: string[]) => {
  import_modal?.hide();
  importTask(new_emails);
};

const importTask = async (new_emails: string[] | null = null) => {

  import_progress.value.loading = true;

  try {
    // creating labelset
    import_progress.value.message = "Creating Labelset";
    let new_labelset_id = labelsets.data.value![0].id;
    if (import_json.value.labelset) {
      new_labelset_id = (
        await $trpc.labelset.create.mutate({ editor_id: user.value?.id, ...import_json.value.labelset })
      ).id;
    }

    // creating task
    import_progress.value.message = "Creating Task";
    let _new_task: Omit<Task, "id"> = {
      project_id: project.id,
      name: import_json.value.name ?? "Blank",
      desc: import_json.value.desc ?? "Blank",
      ann_guidelines: import_json.value.ann_guidelines ?? "Blank",
      labelset_id: new_labelset_id,
    };

    const task = await $trpc.task.create.mutate(_new_task);
    taskTable.value?.refresh();

    // creating documents
    import_progress.value.message = "Creating Documents";
    if (import_json.value.documents) {
      const documents = await $trpc.document.createMany.mutate(
        import_json.value.documents.map((d: any) => {
          return {
            name: d.name,
            full_text: d.full_text,
            source: "imported",
            project_id: project.id,
          };
        })
      );
      documentTable.value?.refresh();

      if (import_json.value.counts?.annotators && new_emails) {
        // creating annotators
        import_progress.value.message = "Creating Annotators";
        const usersPromises: Promise<User>[] = [];
        new_emails.map(email => {
          if (/annotator\d+@email.com/.test(email)) {
            usersPromises.push(
              $trpc.user.findByEmail.query(email)
            )
          } else {
            usersPromises.push(
              $trpc.user.otpLogin.query({ email: email, redirectTo: `${config.public.baseURL}/annotate/${task.id}?seq=1` })
            );
          }
        });

        const annotators_id = (await Promise.all(usersPromises)).map((u) => u.id);

        // creating assignments
        import_progress.value.message = "Creating Assignments";
        let new_assignments: Omit<Assignment, "id">[] = [];

        import_json.value.documents.map((d: any, i: number) => {
          d.assignments.map((ass: any) => {
            new_assignments.push({
              task_id: task.id,
              annotator_id: annotators_id[ass.annotator - 1],
              document_id: documents[i].id,
              seq_pos: ass.order,
              difficulty_rating: 0,
              status: "pending"
            })
          })
        });

        const assignments = await $trpc.assignment.createMany.mutate(new_assignments);

        if (import_json.value.counts?.annotations) {
          // Creating annotations
          import_progress.value.message = "Creating Annotations";
          let new_annotations: Omit<Annotation, "id">[] = [];
          let ass_index: number = 0;

          import_json.value.documents.map((d: any) => {
            d.assignments.map((ass: any) => {
              ass.annotations.map((ann: any) => {
                new_annotations.push({
                  start_index: ann.start,
                  end_index: ann.end,
                  label: ann.label,
                  text: ann.text,
                  assignment_id: assignments[ass_index].id,
                  origin: "imported",
                  ls_id: ann.ls_id
                })
              });
              ass_index++;
            })
          });

          const annotations = await $trpc.annotation.createMany.mutate(new_annotations);

          // create relations
          import_progress.value.message = "Creating Relations";
          if (import_json.value.counts?.relations) {
            let new_relations: Omit<AnnotationRelation, "id">[] = [];
            let ann_index: number = 0;

            import_json.value.documents.map((d: any) => {
              d.assignments.map((ass: any) => {
                let current_ann: number = 0;
                ass.annotations.map((ann: any) => {
                  ann.relations.map((rel: any) => {
                    new_relations.push({
                      from_id: annotations[ann_index + current_ann].id,
                      to_id: annotations[ann_index + rel.to].id,
                      labels: rel.labels,
                      direction: rel.direction,
                      ls_from: annotations[ann_index + current_ann].ls_id,
                      ls_to: annotations[ann_index + rel.to].ls_id,
                    });
                  })
                  current_ann++;
                });
                ann_index += current_ann;
              })
            });

            const relations = await $trpc.relation.createMany.mutate(new_relations);
          }
        }
      }
    }

    import_progress.value.loading = false;
    $toast.success("Task successfully imported!");
  } catch (error) {
    import_progress.value.loading = false;
    $toast.error(`Error importing the Task!`);
  }
}

const removeDocuments = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.document.delete.mutate(+id)));
  await Promise.all(promises);
  await documentTable.value?.refresh();
  $toast.success("Documents successfully deleted!");
};
const removeAllDocuments = async () => {
  if (!project) throw new Error("Invalid Project!");
  await $trpc.document.deleteAllFromProject.mutate(+project.id);
  await documentTable.value?.refresh();
  $toast.success("Documents successfully deleted!");
};
const removeTasks = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.task.delete.mutate(+id)));
  await Promise.all(promises);
  await documentTable.value?.refresh();
  $toast.success("Tasks successfully deleted!");
};
const removeAllTasks = async () => {
  if (!project) throw new Error("Invalid Project!");
  await $trpc.task.deleteAllFromProject.mutate(project.id);
  await documentTable.value?.refresh();
  $toast.success("Tasks successfully deleted!");
};

onMounted(() => {
  // project.value = projectQuery.data.value!;
  // initFlowbite();
  new_task.project_id = project.id;

  $trpc.labelset.find.query({}).then((_labelsets) => {
    labelsets.push(..._labelsets);
  });
});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["project", +to.params.project_id]]),
  ],
});
</script>

<style lang="scss">
div.tabs-holder {
  @apply text-sm font-medium text-center text-gray-500 border-b border-gray-200;

  li.tab button {
    @apply inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300;
  }

  li.tab-active button {
    @apply inline-block p-4 text-primary border-b-2 border-primary rounded-t-lg;
  }
}
</style>
