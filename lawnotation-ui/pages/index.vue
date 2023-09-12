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
  if (user.value) {
    role.value = (await $trpc.user.findByEmail.query(user.value.email!)).role!;
  } else {
    watch(user, async () => {
      if (user.value) {
        role.value = (await $trpc.user.findByEmail.query(user.value.email!)).role!;
      }
    });
  }
});
</script>
