<template>
    <span v-if="!hiddenByUser" class="absolute flex h-3 w-3 top-[-6px] right-[-6px]">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>
</template>
<script setup lang="ts">
const user = useSupabaseUser();

const hiddenByUser = computed(() => {
    return user.value?.user_metadata?.hiddenGuidance == true;
});

</script>