<template>
    <Breadcrumb v-if="publication" :crumbs="[
        {
            name: 'Published',
            link: '/published',
        },
        {
            name: `${publication.task_name}`,
            link: `/published/${publication.id}`,
        },
    ]" />

    <div v-if="publication" class="dimmer-wrapper">
        <Dimmer v-model="loading" />
        <div class="dimmer-content">
            <div class="flex justify-between">
                <h3 class="mb-2 text-lg font-semibold text-center">Edit Published Data</h3>
                <a :href="`/published/${publication.id}`">
                    <button
                        class="py-1.5 px-5 text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100">
                        Details
                    </button>
                </a>
            </div>
            <div class="max-w-screen-lg mx-auto my-4">
                <div class="flex items-center justify-center">
                    <label class="relative inline-flex items-center cursor-pointer mb-5">
                        <input type="checkbox" value="" class="sr-only peer" v-model="status">
                        <div
                            class="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                        </div>
                        <span :class="`text-${status ? 'green-600' : 'red-500'}`" class="ms-3 text-sm font-medium st">{{
                            status ? 'Published' : 'Unpublished' }}</span>
                    </label>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.file_url" type="url" name="file_url" id="file_url"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="file_url"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                File url</label>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.guidelines_url" type="url" name="guidelines_url"
                                id="guidelines_url"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="guidelines_url"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Guidelines url</label>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.task_name" type="text" name="task_name" id="task_name"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="task_name"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Task name</label>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <label for="task_description"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Task description</label>
                        <div class="relative z-0 w-full mb-5 group">
                            <textarea id="task_description" rows="4"
                                class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                v-model="new_publication.task_description"></textarea>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.labels_name" type="text" name="labels_name" id="labels_name"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="labels_name"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Labels name</label>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <label for="labels_description"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Labels description</label>
                        <div class="relative z-0 w-full mb-5 group">
                            <textarea id="labels_description" rows="4"
                                class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                v-model="new_publication.labels_description"></textarea>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.author" type="text" name="author" id="author"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="author"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Author</label>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-center">
                    <div class="pb-3 w-1/2">
                        <div class="relative z-0 w-full mb-5 group">
                            <input v-model="new_publication.contact" type="text" name="contact" id="contact"
                                class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" " />
                            <label for="contact"
                                class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Contact</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-center mb-5">
                <button class="base btn-primary ml-5" @click="editPublication" data-test="save-changes-button">Save
                    Changes
                </button>
            </div>
            <div class="text-end mb-5">
                <button type="button" @click="remove"
                    class="text-xs text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-xs px-2 py-1 text-center"
                    data-test="remove" style="outline: none;">
                    Remove
                </button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { Publication, PublicationStatus } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import Dimmer from "~/components/Dimmer.vue";
import { confirmBox } from "~/utils/confirmBox";

const { $trpc, $toast } = useNuxtApp();

const route = useRoute();
const publication = await $trpc.publication.findById.query(+route.params.published_id);
const new_publication = ref<Partial<Publication>>({
    status: publication.status,
    file_url: publication.file_url,
    guidelines_url: publication.guidelines_url,
    task_name: publication.task_name,
    task_description: publication.task_description,
    labels_name: publication.labels_name,
    labels_description: publication.labels_description,
    contact: publication.contact,
    author: publication.author
});

const loading = ref<boolean>(false);
const status = ref<boolean>(publication.status == PublicationStatus.PUBLISHED);

watch(status, (new_val) => {
    new_publication.value!.status = new_val ? PublicationStatus.PUBLISHED : PublicationStatus.UNPUBLISHED;
})

const editPublication = async () => {
    loading.value = true;
    try {
        const result = await $trpc.publication.update.mutate({ id: publication.id, updates: new_publication.value });
        $toast.success("Update successfully");
        navigateTo('/published');
    } catch (error) {
        $toast.error(`Update failed: ${error}`);
    } finally {
        loading.value = false;
    }
};

const remove = async () => {
    confirmBox(
        `Are you sure you want to delete this published data?`,
        "The metadata will be deleted from the Lawnotation platform, but the externally hosted data and guidelines will remain intact",
        "warning"
    ).then((result) => {
        if (result.isConfirmed) {
            loading.value = true;
            $trpc.publication.delete.mutate(publication.id)
                .then(data => {
                    $toast.success(`Published data was deleted successfully`);
                    navigateTo('/published');
                })
                .catch(error => {
                    $toast.error(`Publoished data could not be deleted: ${error}`);
                })
                .finally(() => {
                    loading.value = false;
                });
        }
    });
};

definePageMeta({
    middleware: [
        "auth",
        async (to) => authorizeClient([["publication", +to.params.published_id, 'findByIdEdit']]),
    ],
});
</script>
  