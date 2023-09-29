<template>
  <div>
    <EditorDashboard v-if="user && role == 'editor'" />
    <AnnotatorDashboard v-else-if="user && role == 'annotator'" />
    <div v-else></div>
  </div>
</template>
<script setup lang="ts">
const user = useSupabaseUser();
const role = ref<string>();

const { $trpc } = useNuxtApp();

onMounted(async () => {
  role.value = (await $trpc.user.findByEmail.query(user.value!.email!)).role!;
});

definePageMeta({
  middleware: ['auth']
})
</script>

