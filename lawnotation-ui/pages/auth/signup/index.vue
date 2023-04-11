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
      <div class="my-1">
        <label for="confirm_password" class="pr-2">confirm password</label>
        <input
          v-model="confirm_password"
          type="password"
          name="confirm_password"
          autocomplete="new-password"
          class="border"
        />
      </div>
      <div class="mx-2">
        <button class="btn-primary rounded-full my-2" @click="signUp()">Sign Up</button>
        <div>or</div>
        <NuxtLink to="/auth/login">Log In</NuxtLink>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useAuth } from "@/composables/auth";
const auth = useAuth();

const email = ref<string>("");
const password = ref<string>("");
const confirm_password = ref<string>("");

const signUp = () => {
  if (email.value?.length == 0 || password.value?.length == 0) {
    alert("params required");
    return;
  }
  if (password.value != confirm_password.value) {
    alert("passwords must match");
    return;
  }
  auth
    .signUp(email.value, password.value)
    .then((user_session) => console.log(user_session));
};
</script>
