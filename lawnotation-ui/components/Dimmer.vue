<template>
  <div v-if="modelValue" class="dimmer">
    <half-circle-spinner
      v-if="modelValue"
      :animation-duration="1000"
      :size="60"
      color="rgb(79 70 229)"
      style="position: absolute; left: calc(50% - 30px); top: calc(50% - 30px)"
    />
  </div>
</template>
<script setup lang="ts">
import { HalfCircleSpinner } from "epic-spinners";
const props = defineProps<{
  modelValue: boolean;
}>();
</script>
