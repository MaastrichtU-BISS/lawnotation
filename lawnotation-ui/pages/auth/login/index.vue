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
import { useToast } from "vue-toastification";

const toast = useToast();

const userApi = useUserApi();
const config = useRuntimeConfig();

const email = ref<string>("");

const signIn = () => {
  try {
    if (email.value.length == 0) {
      toast.error("Enter your email")
      return;
    }
  
    userApi.otpLogin(email.value, `${config.public.baseURL}/projects`);
  } catch (error) {
    if (error instanceof Error)
      toast.error(`Error logging in with OTP: ${error.message}`);
  }
};
</script>
