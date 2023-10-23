<template>
  <div v-if="modelValue" class="dimmer">
    <HollowDotsSpinner
      v-if="modelValue"
      :animation-duration="1000"
      :size="60"
      color="#0D5984"
      style="position: absolute; left: calc(50% - 30px); top: calc(50% - 30px)"
    />
  </div>
</template>
<script setup lang="ts">
import { HollowDotsSpinner } from "epic-spinners";
const props = defineProps<{
  modelValue: boolean;
}>();
</script>
