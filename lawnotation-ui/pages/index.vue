<template>
  <div>
    <Dashboard v-if="role == 'editor'" />
  </div>
</template>
<script setup lang="ts">
import { User, useUserApi } from "~/data/user";
onMounted(() => {});
const user = useSupabaseUser();
const userApi = useUserApi();
const role = ref<string>("annotator");
// definePageMeta({
//   middleware: ["auth"],
// });
onMounted(async () => {
  if (!user.value || user.value == undefined) return;
  role.value = (await userApi.findByEmail(user.value?.email!, "role")).role;
});
</script>
