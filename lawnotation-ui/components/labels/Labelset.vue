<template>
  <div class="flex flex-row justify-end">
    <Button
      type="button"
      :label="labelset.id ? 'Update' : 'Create'"
      @click.prevent="persistLabelset"
      :outlined="!labelset.labels.length"
      :disabled="!labelset.labels.length || !labelset.name || !labelset.desc"
      data-test="save-labelset"
    />
  </div>
  <hr class="pb-4 mt-2" />
  <div class="row">
    <div class="flex flex-col space-y-2">
      <input
        class="base"
        type="text"
        v-model="labelset.name"
        placeholder="Labelset name"
        data-test="labelset-name"
        required
      />
      <textarea
        class="base"
        :value="labelset.desc"
        @input="labelset.desc = ($event.target as HTMLTextAreaElement)?.value"
        placeholder="Labelset description"
        data-test="labelset-description"
        required
      ></textarea>
    </div>
    <hr class="my-3" />
    <Message
      v-if="numberOfTasksWithThisLabelset"
      severity="warn"
      :closable="false"
      ><p class="m-0">
        You can no longer add, remove and/or edit labels, since this labelset
        has already been assigned to {{ numberOfTasksWithThisLabelset }} task{{
          numberOfTasksWithThisLabelset > 1 ? "s" : ""
        }}. You can still drag to re-order.
      </p></Message
    >
    <form v-else @submit.prevent="addLabel" class="flex space-x-4">
      <input v-model="newLabel.color" type="color" class="self-center base" />
      <input
        class="base grow"
        v-model="newLabel.name"
        placeholder="Label name"
        type="text"
        data-test="label-name"
      />
      <Button
        type="submit"
        label="Add"
        :outlined="!!labelset.labels.length"
        data-test="add-label"
      />
    </form>
    <hr class="my-3" />
    <div class="col relative">
      <button
        v-if="showResetButton"
        @click="labelset.labels = JSON.parse(JSON.stringify(originalLabels))"
        class="flex gap-1 absolute right-0 text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1"
          stroke="currentColor"
          class="size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Reset
      </button>
      <VueDraggable v-model="labelset.labels" handle=".handle">
        <div
          class="flex items-center gap-3 mb-2 label-holder"
          v-for="(label, index) in labelset.labels"
        >
          <button
            class="handle"
            @keyup.down="moveDown(index)"
            @keyup.up="moveUp(index)"
            ref="handles"
            title="Drag to re-order label"
            data-test="reorder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <LabelCmpt
            :label="label"
            :numberOfTasks="numberOfTasksWithThisLabelset"
            :editable="true"
            :title="numberOfTasksWithThisLabelset ? '' : 'Click to edit label'"
            @validate-label="validateLabel(label, index)"
          ></LabelCmpt>
          <button
            v-if="!numberOfTasksWithThisLabelset"
            @click="labelset.labels.splice(index, 1)"
            title="Click to delete label"
            data-test="delete-label"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </VueDraggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Labelset, Label } from "~/types";
import { VueDraggable } from "vue-draggable-plus";
import { arrayMoveImmutable } from "array-move";
import LabelCmpt from "~/components/labels/Label.vue";
import type { Optional } from "utility-types";

const { $toast, $trpc } = useNuxtApp();
const user = useSupabaseUser();
const newLabel = reactive(getDefaultLabel());

const emit = defineEmits(["labelsetCreated", "labelsetPersisted"]);

const labelset = defineModel<Optional<Labelset, "id" | "editor_id">>({
  required: true,
});
const originalLabels = JSON.parse(JSON.stringify(labelset.value.labels));
const numberOfTasksWithThisLabelset = ref(0);
const handles = ref([]);

const showResetButton = computed(
  () =>
    originalLabels.length &&
    JSON.stringify(labelset.value.labels) !== JSON.stringify(originalLabels)
);

onMounted(async () => {
  if (labelset.value.id) {
    numberOfTasksWithThisLabelset.value =
      await $trpc.task.getCountByLabelset.query(labelset.value.id);
  }
});

const addLabel = () => {
  try {
    validateLabel(newLabel);
    labelset.value.labels.push({
      name: newLabel.name,
      color: newLabel.color,
    });
    Object.assign(newLabel, getDefaultLabel());
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error adding label: ${error.message}`);
  }
};

const validateLabel = (label: Label, index?: number) => {
  if (!/^\#[a-zA-Z0-9]{6}$/.test(label.color))
    throw new Error("Invalid label color");
  if (!/^[a-zA-Z0-9 \- \_]+$/.test(label.name))
    throw new Error("Special characters are not allowed");
  if (index?.toString()) {
    if (
      labelset.value.labels
        .filter((x, i) => i !== index)
        .some(
          (x) => x.name.toLocaleLowerCase() === label.name.toLocaleLowerCase()
        )
    )
      throw new Error("A label with this name already exists");
  } else {
    if (
      labelset.value.labels.some(
        (x) => x.name.toLocaleLowerCase() === label.name.toLocaleLowerCase()
      )
    )
      throw new Error("A label with this name already exists");
  }
};

function getDefaultLabel() {
  const r = Math.floor(Math.random() * 180 + 50);
  const b = Math.floor(Math.random() * 180 + 50);
  const g = Math.floor(Math.random() * 180 + 50);
  return {
    name: "",
    color: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`,
    meta: {
      editing: false,
    },
  };
}

const moveDown = (index: number) => {
  labelset.value.labels = arrayMoveImmutable(
    labelset.value.labels,
    index,
    index + 1
  );
  handles.value[index + 1].focus();
};

const moveUp = (index: number) => {
  labelset.value.labels = arrayMoveImmutable(
    labelset.value.labels,
    index,
    index - 1
  );
  handles.value[index - 1].focus();
};

const persistLabelset = async () => {
  try {
    if (!user.value) throw new Error("Invalid user");
    if (labelset.value.name.trim().length === 0)
      throw new Error("Name of labelset can not be empty");
    if (labelset.value.desc.trim().length === 0)
      throw new Error("Description of labelset can not be empty");
    if (labelset.value.labels.length === 0)
      throw new Error("Labelset should contain at least one label");

    if (labelset.value.id) {
      const update = await $trpc.labelset.update.mutate({
        id: labelset.value.id,
        updates: {
          ...labelset.value,
        },
      });
      $toast.success(`Labelset "${labelset.value.name}" saved`);
    } else {
      const create = await $trpc.labelset.create.mutate({
        ...labelset.value
      });
      labelset.value.id = create.id;
      $toast.success(`Labelset "${labelset.value.name}" created`);
    }
    emit("labelsetPersisted");
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error creating labelset: ${error.message}`);
  }
};
</script>
