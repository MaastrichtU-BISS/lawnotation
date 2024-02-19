<template>
    <Breadcrumb v-if="publication" :crumbs="[
        {
            name: 'Published Data',
            link: '/published',
        },
        {
            name: `${publication.task_name}`,
            link: `/published/${publication.id}`,
        },
    ]" />

    <div v-if="publication">
        <div class="max-w-screen-lg mx-auto my-4">
            <div class="flex justify-between">
                <h3 class="mb-2 text-lg font-semibold">Published Data</h3>
                <template v-if="publication.editor_id == user?.id">
                    <a :href="`/published/${publication.id}/edit`">
                        <button
                            class="py-1.5 px-5 text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100">Edit</button>
                    </a>
                </template>
            </div>
            <div class="flex items-center justify-center">
                <div class="border-b pb-3">
                    <div class="text-lg font-bold text-center mb-3">Metadata</div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Task Name:
                        </div>
                        <div class="max-w-md">
                            {{ publication.task_name }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Task Description:
                        </div>
                        <div class="max-w-md">
                            {{ publication.task_description }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Labels Name:
                        </div>
                        <div class="max-w-md">
                            {{ publication.labels_name }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Labels Description:
                        </div>
                        <div class="max-w-md">
                            {{ publication.labels_description }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Author:
                        </div>
                        <div class="max-w-md">
                            {{ publication.author }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Contact:
                        </div>
                        <div class="max-w-md">
                            <a class="base" :href="`mailto:${publication.contact}`">{{ publication.contact }}</a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-center pt-3">
                <div class="pb-3">
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Documents #:
                        </div>
                        <div class="max-w-md">
                            {{ publication.documents }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Annotators #:
                        </div>
                        <div class="max-w-md">
                            {{ publication.annotators }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Assignments #:
                        </div>
                        <div class="max-w-md">
                            {{ publication.assignments }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Annotations #:
                        </div>
                        <div class="max-w-md">
                            {{ publication.annotations }}
                        </div>
                    </div>
                    <div class="flex mb-2">
                        <div class="font-semibold mr-2">
                            Relations #:
                        </div>
                        <div class="max-w-md">
                            {{ publication.relations }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-center pt-3">
                <div class="pb-3 mr-6">
                    <a :href="publication.guidelines_url" target="_blank">
                        <button class="base btn-primary">See Guidelines</button>
                    </a>
                </div>
                <div class="pb-3 ml-6">
                    <a :href="publication.file_url" target="_blank">
                        <button class="base btn-secondary">Go to Data</button>
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import type { Publication } from "~/types";

const { $trpc } = useNuxtApp();
const user = useSupabaseUser();
const route = useRoute();
const publication = ref<Publication>();

onMounted(async () => {
    $trpc.publication.findById.query(+route.params.published_id).then((p) => {
        publication.value = p;
    });
});

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["publication", +to.params.published_id]]),
    ],
});
</script>
  