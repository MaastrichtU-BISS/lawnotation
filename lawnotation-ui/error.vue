<template>
    <section class="flex items-center h-full p-16" style="height: 100vh;">
        <div class="container flex flex-col items-center justify-center px-5 mx-auto my-8">
            <div class="max-w-md text-center">
                <h2 class="mb-4 font-extrabold text-9xl text-gray-500">
                    <span class="sr-only">Error</span>{{ error?.statusCode }}
                </h2>
                <p class="text-lg font-semibold text-gray-700">{{ error?.message }}</p>
                <a type="button" rel="noopener noreferrer" @click="handleError" href="/" class="flex w-full justify-center
                    rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm
                    hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-secondary mt-5">Back to
                    homepage
                </a>
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
const props = defineProps({
    error: Object
})

onMounted(() => {
    console.log(props.error);
});

const handleError = () => clearError({ redirect: '/' })
</script>   
