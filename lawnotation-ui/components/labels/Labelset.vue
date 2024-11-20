<template>
  <div class="flex flex-row justify-end">
    <Button
      type="button"
      :label="labelset.id ? 'Save' : 'Create'"
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
      >You can no longer add, remove and/or edit labels, since this labelset has
      already been assigned to {{ numberOfTasksWithThisLabelset }} task{{ numberOfTasksWithThisLabelset > 1 ? 's' : '' }}</Message
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
    <div class="col">
      <div
        class="flex items-center gap-3 mb-2 label-holder"
        v-for="(label, i) of labelset.labels"
      >
        <button
          v-if="!numberOfTasksWithThisLabelset"
          class="base btn-secondary"
          @click="labelset.labels.splice(i, 1)"
          data-test="delete-label"
        >
          <svg
            style="width: 1rem"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
        <LabelCmpt
          :label="label"
          :numberOfTasks="numberOfTasksWithThisLabelset"
          @validate-label="validateLabel(label, i)"
        ></LabelCmpt>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Labelset, Label } from "~/types";
import LabelCmpt from "~/components/labels/Label.vue";
import type { Optional } from "utility-types";

const { $toast, $trpc } = useNuxtApp();
const user = useSupabaseUser();
const newLabel = reactive(getDefaultLabel());

const emit = defineEmits(["labelsetCreated", "labelsetPersisted"]);

const labelset = defineModel<Optional<Labelset, "id" | "editor_id">>({
  required: true,
});
const numberOfTasksWithThisLabelset = ref(0);

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
    throw new Error("Special character are not allowed");
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
        ...labelset.value,
        editor_id: user.value.id,
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
