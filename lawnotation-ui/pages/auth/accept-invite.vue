<template>
  <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <NuxtLink to="/">
        <img class="mx-auto h-16 w-auto" src="/lawnotation-logo.svg" alt="Lawnotation" />
      </NuxtLink>
      <h2
        class="mt-8 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900"
      >
        Enter invitation code
      </h2>
      <p class="text-center text-sm text-gray-700">
        <NuxtLink class="inline-block mt-2 hover:underline" to="/auth/login">Go to login page instead</NuxtLink>
      </p>
    </div>

    <template v-if="email !== null">
      <div class="mt-8 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md">
        <div class="space-y-3">
          <p class="block text-sm font-bold">Email address</p>
          <div class="flex justify-between items-center">
            <p class="block text-sm font-medium leading-6">{{ email }}</p>
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
    <template v-else>
      <div class="mt-8 mx-auto sm:w-full sm:max-w-sm bg-white px-6 py-6 shadow rounded-md text-center">
        <svg
          aria-hidden="true"
          class="inline w-16 h-16 my-1 text-gray-200 animate-spin dark:text-gray-600 fill-slate-400"
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
      </div>
    </template>

      
  </div>
</template>
<script setup lang="ts">
const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const router = useRouter();

const supabase = useSupabaseClient()

const loading = ref(false);

const email = ref<string | null>(null);
const token = ref<string>("");

onMounted(() => {
  try {
    if (!route.hash || !route.hash.length) {
      email.value = ""
      throw Error("No email found")
    }
    // email.value = atob(route.hash.substring(1)) // #user@localhost
    email.value = route.hash.substring(1) // #user@localhost
  } catch {
    $toast.error("Please request a new login code using your email")
    navigateTo('/auth/login')
  }
})

const verifyToken = () => {
  if (!email.value) return;

  loading.value = true;
  supabase.auth
    .verifyOtp({
      email: email.value,
      token: token.value,
      type: 'email',
    })
    .then((verify) => {
      if (verify.error) {
        $toast.error(`Error signing in: ${verify.error.message}`);
        loading.value = false;
      } else {
        $toast.success("Logged in successfully");
        location.href='/'
      }
    })
    .catch((error) => {
      $toast.error(`Error signing in: ${error.message}`);
      loading.value = false;
    })
}

definePageMeta({
  layout: "blank",
  middleware: async () => {
    const client = useSupabaseClient();
    const {data: {user: user}} = await client.auth.getUser();

    if (user) location.href = '/';
  }
});
</script>