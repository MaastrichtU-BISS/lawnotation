<template>
  <div class="flex flex-row justify-end">
    <Button
      type="button"
      :label="labelset.id ? 'Update' : 'Create'"
      :loading="saving"
      @click.prevent="persistLabelset"
      data-test="save-labelset"
    />
  </div>
  <hr class="pb-4 mt-2" />
  <LabelsetEditor
    ref="editor"
    v-model="labelset"
    :locked="tasksUsingLabelset > 0"
    :locked-message="lockedMessage"
    @issues="issues = $event"
  />
</template>

<script setup lang="ts">
import { LabelsetEditor, type Issue } from "vue-labelset-editor";
import "vue-labelset-editor/style.css";
import type { Labelset } from "~/types";
import type { Optional } from "utility-types";

const { $toast, $trpc } = useNuxtApp();

const emit = defineEmits(["labelsetCreated", "labelsetPersisted"]);

const labelset = defineModel<Optional<Labelset, "id" | "editor_id">>({
  required: true,
});

const editor = ref<InstanceType<typeof LabelsetEditor>>();
const issues = ref<Issue[]>([]);
const saving = ref(false);
const tasksUsingLabelset = ref(0);

const lockedMessage = computed(
  () =>
    `This labelset is used by ${tasksUsingLabelset.value} task${tasksUsingLabelset.value > 1 ? "s" : ""}, ` +
    "so its labels can be recoloured and reordered but not added, removed or renamed."
);

onMounted(async () => {
  if (labelset.value.id)
    tasksUsingLabelset.value = await $trpc.task.getCountByLabelset.query(labelset.value.id);
});

const persistLabelset = async () => {
  if (issues.value.length) {
    editor.value?.revealIssues();
    $toast.error("Fix the problems shown in the labelset first");
    return;
  }
  saving.value = true;
  const { name, desc, labels, relation_labels } = labelset.value;
  const fields = { name, desc, labels, relation_labels: relation_labels ?? null };
  try {
    if (labelset.value.id) {
      await $trpc.labelset.update.mutate({ id: labelset.value.id, updates: fields });
      $toast.success(`Labelset "${name}" saved`);
    } else {
      const created = await $trpc.labelset.create.mutate(fields);
      labelset.value.id = created.id;
      $toast.success(`Labelset "${name}" created`);
    }
    emit("labelsetPersisted");
  } catch (error) {
    $toast.error(`Labelset could not be saved: ${(error as Error)?.message}`);
  } finally {
    saving.value = false;
  }
};
</script>
