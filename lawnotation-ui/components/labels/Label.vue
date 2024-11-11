<template>
  <button
    v-if="!editing"
    @click="editing = true"
    :disabled="!!numberOfTasks"
    class="px-3 py-1 mb-0 rounded label whitespace-pre-line inline-block"
    :style="{
      backgroundColor: `${label.color}26`,
      borderLeft: `4px solid ${label.color}`,
    }"
    data-test="label"
  >
    {{ label.name }}
  </button>
  <form v-else @submit.prevent="saveLabel" class="flex gap-2">
    <input v-model="label.color" type="color" class="self-center base" />
    <input type="text" v-model="label.name" ref="labelInput" class="base" />
    <Button type="submit" icon="pi pi-check" outlined aria-label="Update" />
  </form>
</template>
<script setup lang="ts">
import { type Label } from "~/types";
const { $toast } = useNuxtApp();

const { label, numberOfTasks } = defineProps<{
  label: Label;
  numberOfTasks: number;
}>();

const labelInput = ref(null);

const editing = ref(false);
const emit = defineEmits(["validateLabel"]);

const saveLabel = () => {
  try {
    emit("validateLabel");
    editing.value = false;
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error adding label: ${error.message}`);
  }
};

watch(labelInput, (newValue) => {
  if (newValue) {
    labelInput.value?.focus();
  }
});
</script>
