<template>
  <div class="py-3 annotation-record">
    <div class="text-xs mb-2" :style="editable ? 'color: red' : 'color: green'">
      <b>{{ editable ? "Not Annotated" : "Annotated" }}</b>
    </div>
    <div class="flex" style="align-items: center">
      <div
        :contenteditable="editable ? 'true' : 'false'"
        @keydown="onkeydown($event)"
        :class="_hidden ? 'text-gray-500' : ''"
        style="white-space: pre-wrap"
      >
        {{ annotation.text }}
      </div>
      <span class="ml-3 text-xs text-gray-500">
        <i v-if="!editable">{{ annotation.label + " | " }}</i>
        <i>{{ annotation.annotator }}</i></span
      >
      <span v-if="editable">
        <button
          v-if="hasPreviousNonAnnotation"
          @click="emit('mergeUp', index)"
          class="ml-2 btn btn-secondary"
        >
          &#8593;
        </button>
        <button
          v-if="hasNextNonAnnotation"
          @click="emit('mergeDown', index)"
          class="ml-2 btn btn-secondary"
        >
          &#8595;
        </button>
        <button class="ml-2 btn btn-secondary" @click="toggle_hide">
          {{ _hidden ? "Show" : "Hide" }}
        </button>
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { BasicAnnotation } from "~/data/annotation";

const emit = defineEmits(["separate", "mergeUp", "mergeDown", "setHidden"]);
const _hidden = ref<Boolean>();

const onkeydown = (e: KeyboardEvent) => {
  if (e.key == "Enter") {
    const position = window.getSelection()!.getRangeAt(0).startOffset;
    emit("separate", props.index, position);
  } else if (
    e.key == "ArrowRight" ||
    e.key == "ArrowLeft" ||
    e.key == "ArrowUp" ||
    e.key == "ArrowDown"
  ) {
    return true;
  }
  e.preventDefault();
  return false;
};

const toggle_hide = () => {
  emit("setHidden", props.index, !props.annotation.hidden);
};

const props = defineProps<{
  annotation: BasicAnnotation;
  editable: Boolean;
  index: number;
  hasNextNonAnnotation: Boolean;
  hasPreviousNonAnnotation: Boolean;
}>();

watch(props.annotation, (new_val) => {
  _hidden.value = new_val.hidden;
});

onMounted(async () => {
  _hidden.value = props.annotation.hidden;
});
</script>
<style>
.annotation-record {
  border-top: dotted 1px lightgray;
}
</style>
