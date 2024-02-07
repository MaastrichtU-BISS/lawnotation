<template>
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <NuxtLink to="/">
        <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation" />
      </NuxtLink>
      <h2
        class="mt-8 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900"
      >
        Sign in with email
      </h2>
    </div>

    <div class="mt-8 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md" v-if="stage == 'EMAIL'">
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

      <p class="mt-8 text-center text-sm text-gray-500">
        By clicking the 'Send link' button, you consent to our <NuxtLink to="/terms-of-service" class="underline">Terms of Service</NuxtLink> and
        <NuxtLink to="/privacy-policy" class="underline">Privacy Policy</NuxtLink>. You
        will receive a link in your mailbox which you can use to sign-in. Note that if you
        do not have an account yet, this will automatically create one for you.
      </p>
    </div>

    <template v-if="stage == 'TOKEN'">

      <div class="mt-8 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
        <div class="space-y-3">
          <p class="block text-sm font-bold">Email address</p>
          <div class="flex justify-between items-center">
            <p class="block text-sm font-medium leading-6">{{ email }}</p>
            <svg @click="stage = 'EMAIL'" class="w-4 h-4  cursor-pointer text-gray-600 hover:text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </div>
        </div>
      </div>

      <div class="mt-6 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
        <div class="space-y-4">
          <label for="token" class="block text-sm font-medium leading-6 text-gray-900"
            >Enter the 6-digit code</label>
          <div class="mt-2">
            <input
              id="token"
              name="token"
              type="text"
              maxlength="6"
              v-model="token"
              @keydown.enter="verifyToken()"
              required
              class="block w-full rounded-md border-0 text-xl tracking-widest text-center px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:leading-6"
              data-test="token-field-to-login"
            />
          </div>
          <button
            :disabled="loading"
            :class="{ 'cursor-wait': loading }"
            @click="verifyToken()"
            type="button"
            class="flex w-full justify-center rounded-md bg-slate-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            data-test="login-button"
          >
            <span v-if="!loading">Verify</span>
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
    </template>

  </div>
</template>
<script setup lang="ts">
const { $toast, $trpc } = useNuxtApp();

const supabase = useSupabaseClient()

const stage = ref<'EMAIL' | 'TOKEN'>('EMAIL')

const loading = ref(false);

const email = ref<string>("");
const token = ref<string>("");

const verifyToken = () => {
  loading.value = true;
  supabase.auth
    .verifyOtp({
      email: email.value,
      token: token.value,
      type: 'email',
    })
    .then((data) => {
      $toast.success("Logged in successfully");
    })
    .catch((error) => {
      $toast.error(`Error signing in: ${error.message}`);
      loading.value = false;
    })
}

const signIn = () => {
  loading.value = true;
  if (email.value.length == 0) {
    $toast.error("Enter your email");
    loading.value = false;
    return;
  }

  $trpc.user
    .otpLogin.query(email.value)
    .then((resp) => {
      $toast.success(resp.message);
      loading.value = false;
      stage.value = 'TOKEN'
    })
    .catch((error) => {
      $toast.error(`Error signing in: ${error.message}`);
      loading.value = false;
    })
};

onMounted(() => {
  // If user is found here, we need to assign location.href, since 
  // navigateTo doesn't reload the trpc plugin to fetch the token
  // from the cookie.
  const user = useSupabaseUser();
  if (user.value) return location.href = '/';
  watch(user, () => {
    if (user.value) return location.href = '/';
  })
})

definePageMeta({
  layout: "blank",
  middleware: () => {
    const user = useSupabaseUser();
    if (user.value) return navigateTo('/')
  }
});
</script>
