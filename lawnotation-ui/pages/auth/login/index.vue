<template>
  <div class="my-2 mx-auto max-w-lg text-center" v-if="false">
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

  <!-- Basic Sign In with Slate from: https://tailwindui.com/components/application-ui/forms/sign-in-forms -->
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8" v-if="false">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation">
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">Sign in with email</h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <form class="space-y-6" action="#" method="POST">
        <div>
          <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
          <div class="mt-2">
            <input id="email" name="email" type="email" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:text-sm sm:leading-6">
          </div>
        </div>

        <div>
          <button type="submit" class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">Send link</button>
        </div>
      </form>

      <p class="mt-10 text-center text-sm text-gray-500">
        You will receive a link in your mailbox which you can use to sign-in. Note that if you do not have an account yet, this will automatically create one for you.
      </p>
    </div>
  </div>

  <!-- Sign In with card -->
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50" v-if="true">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <NuxtLink to="/">
        <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation">
      </NuxtLink>
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">Sign in with email</h2>
    </div>

    <div class="mt-10 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
      <div class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
          <div class="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              v-model="email"
              @keydown.enter="signIn()" 
              autocomplete="email"
              required
              class="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:text-sm sm:leading-6">
          </div>
        </div>

        <div>
          <button @click="signIn()" type="button" class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">Send link</button>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-gray-500">
        You will receive a link in your mailbox which you can use to sign-in. Note that if you do not have an account yet, this will automatically create one for you.
      </p>
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
        $toast.error(`Error signing in: ${error.message}`);
        loading.value = false;
      });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error signing in: ${error.message}`);
    loading.value = false;
  }
};

definePageMeta({
  layout: "blank",
});
</script>
