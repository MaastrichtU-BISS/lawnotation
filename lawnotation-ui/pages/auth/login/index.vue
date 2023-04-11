<template>
  <div class="flex justify-center my-2">
    <div>
      <div class="my-2">
        <label for="email" class="pr-2">email</label>
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="off"
          class="border"
        />
      </div>
      <div>
        <label for="password" class="pr-2">password</label>
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          class="border"
        />
      </div>
      <div flex justify-center>
        <button class="rounded-full my-2" @click="signIn()">Log In</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUserApi } from "~/data/user";
const userApi = useUserApi();
const email = ref<string>("");
const password = ref<string>("");

const signIn = () => {
  if (email.value?.length == 0 || password.value?.length == 0) {
    alert("params required");
    return;
  }
  userApi
    .signIn(email.value, password.value)
    .then((user_session) => console.log(user_session));
};

onMounted(() => {});
</script>
