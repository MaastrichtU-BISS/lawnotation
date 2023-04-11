<template>
  <div class="flex justify-center my-2">
    <div>
      <h2 class="flex justify-center my-1">Log In</h2>
      <div class="my-2">
        <label for="email" class="pr-2">email</label>
        <input type="email" name="email" autocomplete="off" class="border" />
      </div>
      <div>
        <label for="password" class="pr-2">password</label>
        <input
          type="password"
          name="password"
          autocomplete="new-password"
          class="border"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { createClient } from "@supabase/supabase-js";
const config = useRuntimeConfig();
const supabase = createClient(config.apiUrl, config.apiAnonKey);

const logIn = async (id: string) => {
  const { data, error } = await supabase.from("tasks").select().eq("project_id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("LOGIN: ", data);
  }
};
onMounted(() => {
  logIn(route.params.project_id as string);
});
</script>
