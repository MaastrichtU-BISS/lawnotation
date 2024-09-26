<template>
    <p class="px-3 py-1 mb-0 rounded label whitespace-pre-line inline-block"
        :style="{ backgroundColor: `${label.color}26`, borderLeft: `4px solid ${label.color}` }" data-test="label">{{
            label.name }}</p>
</template>
<script setup lang="ts">
import { type Label } from "~/types"
const props = defineProps<{
    label: Label
}>();
</script>