<template>
    <span class="px-3 py-1 rounded label"
        :style="{ backgroundColor: `${label.color}26`, borderLeft: `4px solid ${label.color}` }" data-test="label">{{
            label.name }}</span>
</template>
<script setup lang="ts">
import { type Label } from "~/types"
const props = defineProps<{
    label: Label
}>();
</script>