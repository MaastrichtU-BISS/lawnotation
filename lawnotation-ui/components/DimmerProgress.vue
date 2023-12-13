<template>
  <div v-if="modelValue.loading" class="dimmer">
    <div v-if="modelValue.loading" class="text-center"
      style="position: absolute; left: calc(50% - 60px); top: calc(50% - 60px)">
      <div v-if="modelValue.message && modelValue.message.length" class="text-lg font-semibold mb-4">
        {{ modelValue.message }}
      </div>
      <div v-if="modelValue.current && modelValue.total" class="text-lg font-semibold mb-4">
        {{ Math.trunc((modelValue.current / modelValue.total) * 100) }} %
      </div>
      <HollowDotsSpinner :animation-duration="1000" :size="60" color="#0D5984" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { HollowDotsSpinner } from "epic-spinners";
const props = defineProps<{
  modelValue: { current: number; total: number; loading: boolean; message: string };
}>();
</script>
