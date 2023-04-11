<template>
  <div class="my-2 mx-auto max-w-lg text-center">
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
      <div class="my-1">
        <label for="password" class="pr-2">password</label>
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          class="border"
        />
      </div>
      <div class="my-2">
        <button class="btn-primary rounded-full" @click="signIn()">Log In</button>
        <div>or</div>
        <NuxtLink to="/auth/signup">Sign Up</NuxtLink>
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
</script>
