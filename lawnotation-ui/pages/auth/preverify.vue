<template>
    <div class="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
        <div class="mt-10 mx-auto sm:w-full sm:max-w-md bg-white px-6 py-6 shadow rounded-md">
            <p class="text-center text-lg text-slate-700 my-4">Click on the following button to go to the verification page</p>
            <button @click="goToVerification" class="text-blue-900 underline hover:no-underline text-xl block text-center">Click here</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const route = useRoute();

const verificationUrl = ref();

const goToVerification = () => {
    if (verificationUrl.value)
       location.replace(verificationUrl.value)
}

onMounted(() => {
    const url = route.query.url;
    if (!url || Array.isArray(url))
        throw Error("Invalid verification URL")

    verificationUrl.value = decodeURIComponent(url);
})

definePageMeta({
    layout: 'blank'
})
</script>