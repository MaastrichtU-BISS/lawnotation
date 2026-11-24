<template>
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <NuxtLink to="/">
        <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation" />
      </NuxtLink>
      <h2 class="mt-8 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Sign in with email
      </h2>
    </div>

    <div class="mt-8 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
      <p v-if="errorMessage" class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-test="login-error">
        {{ errorMessage }}
      </p>
      <button
        type="button"
        :disabled="loading"
        :class="{ 'cursor-wait': loading }"
        @click="start()"
        class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        data-test="login-button"
      >
        Continue with email
      </button>

      <p class="mt-8 text-center text-sm text-gray-500">
        By continuing, you consent to our <NuxtLink to="/terms-of-service" class="underline">Terms of Service</NuxtLink> and
        <NuxtLink to="/privacy-policy" class="underline">Privacy Policy</NuxtLink>. You will
        receive a 6-digit code in your mailbox which you use to sign in. If you do not
        have an account yet, this creates one for you.
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const loading = ref(false);

const errors: Record<string, string> = {
  expired: "The sign-in attempt expired. Please try again.",
  email: "Your account has no verified email address.",
  access_denied: "Sign-in was cancelled.",
};
const errorMessage = computed(() => {
  const code = route.query.error;
  if (typeof code !== "string" || !code) return null;
  return errors[code] ?? `Sign-in failed (${code}). Please try again.`;
});

const start = () => {
  loading.value = true;
  const returnTo = typeof route.query.returnTo === "string" ? route.query.returnTo : "/";
  signIn(returnTo);
};

definePageMeta({
  layout: "blank",
  middleware: () => {
    if (useAuthUser().value) return navigateTo("/");
  },
});
</script>
