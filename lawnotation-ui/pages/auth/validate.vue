<template>
    <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
        <div class="mt-10 mx-auto sm:w-full sm:max-w-md bg-white px-6 py-6 shadow rounded-md">
            <template v-if="state == 'PENDING'">
                <div class="mt-2 mb-4">
                    <svg class="mx-auto fill-slate-600" width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_ajPY"/></svg>
                </div>
                <p class="text-center text-lg text-slate-700 my-2">Authenticating...</p>
            </template>
            <template v-else-if="state == 'DONE' && user">
                <p class="text-center text-lg text-slate-700 my-4">Authentication successfull!</p>
                <p class="text-center text-sm text-slate-600 mb-4">If you are not redirected automatically, click <NuxtLink class="text-slate-800 hover:underline hover:text-slate-900" to="/">here</NuxtLink></p>
            </template>
            <template v-else-if="state == 'DONE' && !user">
                <p class="text-center text-lg text-slate-700 my-4">Authentication failed</p>
                <p class="text-center text-sm text-slate-600 mb-4">Go to back the <NuxtLink class="text-slate-800 hover:underline hover:text-slate-900" to="/auth/login">login</NuxtLink> page</p>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { User } from '@supabase/supabase-js';

const supabase = useSupabaseClient();

const state = ref<'PENDING' | 'DONE'>('PENDING')
const user = ref<User | null>(null);

onMounted(() => {
    supabase.auth.initialize().then(async ({error}) => {
        user.value = (await supabase.auth.getUser()).data.user
        state.value = 'DONE'

        if (user.value) {
            // Instead of navigateTo, it seems necessary to do a 'hard' redirect using location.href
            // If not, the tRPC plugin is probably already loaded with the empty token and fails to authenticate.
            location.href='/';
        }
    })
})

definePageMeta({
    layout: 'blank'
})
</script>