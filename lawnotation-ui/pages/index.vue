<template>
  <div>
    <EditorDashboard v-if="user && role == 'editor'" />
    <AnnotatorDashboard v-else-if="user && role == 'annotator'" />
    <div v-else></div>
  </div>
</template>
<script setup lang="ts">
import { User, useUserApi } from "~/data/user";
onMounted(() => {});
const user = useSupabaseUser();
const userApi = useUserApi();
const role = ref<string>();
// definePageMeta({
//   middleware: ["auth"],
// });
onMounted(async () => {
  if (user.value) {
    role.value = ((await userApi.findByEmail(user.value?.email!, "role")) as User).role;
  } else {
    watch(user, async () => {
      if (user.value) {
        role.value = ((await userApi.findByEmail(
          user.value?.email!,
          "role"
        )) as User).role;
      } else {
        role.value = "";
      }
    });
  }
});
</script>
