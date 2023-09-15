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
      <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation" />
      <h2
        class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900"
      >
        Sign in with email
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <form class="space-y-6" action="#" method="POST">
        <div>
          <label for="email" class="block text-sm font-medium leading-6 text-gray-900"
            >Email address</label
          >
          <div class="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
          >
            Send link
          </button>
        </div>
      </form>

      <p class="mt-10 text-center text-sm text-gray-500">
        You will receive a link in your mailbox which you can use to sign-in. Note that if
        you do not have an account yet, this will automatically create one for you.
      </p>
    </div>
  </div>

  <!-- Sign In with card -->
  <div
    class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50"
    v-if="true"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <NuxtLink to="/">
        <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation" />
      </NuxtLink>
      <h2
        class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900"
      >
        Sign in with email
      </h2>
    </div>

    <div class="mt-10 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
      <div class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium leading-6 text-gray-900"
            >Email address</label
          >
          <div class="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              v-model="email"
              @keydown.enter="signIn()"
              autocomplete="email"
              required
              class="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:text-sm sm:leading-6"
              data-test="email-field-to-login"
            />
          </div>
        </div>

        <div>
          <button
            :disabled="loading"
            :class="{ 'cursor-wait': loading }"
            @click="signIn()"
            type="button"
            class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            data-test="login-button"
          >
            <span v-if="!loading">Send link</span>
            <template v-else>
              <svg
                aria-hidden="true"
                class="inline w-6 h-6 my-1 text-gray-200 animate-spin dark:text-gray-600 fill-slate-400"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span class="sr-only">Loading...</span>
            </template>
          </button>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-gray-500">
        You will receive a link in your mailbox which you can use to sign-in. Note that if
        you do not have an account yet, this will automatically create one for you.
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
    if (error instanceof Error) $toast.error(`Error signing in: ${error.message}`);
    loading.value = false;
  }
};

definePageMeta({
  layout: "blank",
});
</script>
