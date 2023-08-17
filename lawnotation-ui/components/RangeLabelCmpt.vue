<template>
  <div
    class="py-3 annotation-record"
    :class="
      canMergeUp ? 'border-top-thin' : isNewDoc ? 'border-top-thick' : 'border-top-medium'
    "
  >
    <h5 v-if="isNewDoc" class="text-lg font-semibold mb-3 ml-1">
      {{ annotation.doc_name.substring(0, annotation.doc_name.length - 4) }}
    </h5>
    <div class="text-xs mb-2" :style="annotated ? 'color: green' : 'color: red'">
      <b class="ml-1">{{ annotated ? "Annotated" : "Not Annotated" }}</b>
      <span class="ml-3 text-xs text-gray-500">
        <i v-if="annotated">{{ annotation.label + " | " }}</i>
        <i v-if="annotated">{{ annotation.annotator + " | " }}</i>
        <i>{{ annotation.start }} - {{ annotation.end }}</i></span
      >
    </div>
    <div class="flex" style="align-items: center">
      <div
        contenteditable
        @keydown="onkeydown($event)"
        :class="_hidden ? 'text-gray-500' : ''"
        class="contenteditable-text px-1 py-1"
      >
        {{ annotation.text }}
      </div>
      <button
        v-if="canMergeUp"
        @click="emit('mergeUp', index)"
        class="ml-2 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 text-xs"
      >
        &#8593;
      </button>
      <button
        v-if="canMergeDown"
        @click="emit('mergeDown', index)"
        class="ml-2 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 text-xs"
      >
        &#8595;
      </button>
      <button
        class="ml-2 base text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 text-xs"
        @click="toggle_hide"
      >
        {{ _hidden ? "Show" : "Hide" }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { RichAnnotation } from "~/data/annotation";

const emit = defineEmits(["separate", "mergeUp", "mergeDown", "setHidden"]);
const _hidden = ref<Boolean>();
const annotated = ref<Boolean>();

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
  annotation: RichAnnotation;
  index: number;
  canMergeUp: Boolean;
  canMergeDown: Boolean;
  isNewDoc: Boolean;
}>();

watch(props.annotation, (new_val) => {
  _hidden.value = new_val.hidden;
});

onMounted(async () => {
  _hidden.value = props.annotation.hidden;
  annotated.value = props.annotation.label != "NOT ANNOTATED";
});
</script>
<style>
.border-top-thick {
  border-top: solid 2px black;
}

.border-top-medium {
  border-top: solid 1px gray;
}

.border-top-thin {
  border-top: dotted 1px lightgray;
}

.contenteditable-text {
  white-space: pre-wrap;
}

.contenteditable-text:focus {
  outline: dotted 1px blue;
}
</style>
