<template>
  <div class="my-2 mx-auto max-w-lg text-center">
    <div class="dimmer-wrapper">
      <Dimmer v-model="loading" />
      <div class="dimmer-content p-4">
        <div class="my-2">
          <label for="email" class="pr-2">email</label>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="off"
            class="base border"
            @keydown.enter="signIn()"
          />
        </div>
        <div class="my-2">
          <button class="base btn-primary rounded-full" @click="signIn()">Log In</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { User, useUserApi } from "~/data/user";

const { $toast } = useNuxtApp();

const userApi = useUserApi();
const config = useRuntimeConfig();
const loading = ref(false);

const email = ref<string>("");

const signIn = () => {
  loading.value = true;
  try {
    if (email.value.length == 0) {
      $toast.error("Enter your email");
      loading.value = false;
      return;
    }

    userApi
      .otpLogin(email.value, `${config.public.baseURL}`)
      .then((user) => {
        $toast.success(`Login link has been sent to: ${email.value}`);
        loading.value = false;
      })
      .catch((error) => {
        $toast.error(`Error logging in with OTP: ${error.message}`);
        loading.value = false;
      });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error logging in with OTP: ${error.message}`);
    loading.value = false;
  }
};
</script>
