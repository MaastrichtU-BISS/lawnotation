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
      <div class="my-2">
        <button class="btn-primary rounded-full" @click="signIn()">Log In</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { User, useUserApi } from "~/data/user";
const userApi = useUserApi();

const email = ref<string>("");

const signIn = () => {
  if (email.value?.length == 0) {
    alert("params required");
    return;
  }

  userApi.otpLogin(email.value, "/projects");
};
</script>
