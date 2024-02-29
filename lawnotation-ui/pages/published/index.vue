<template>
    <div class="max-w-screen-lg mx-auto my-4">
        <h3 class="mb-2 text-lg font-semibold">Published Data</h3>
        <Table endpoint="publications" :filter="filter" ref="publicationTable" :sort="true" :search="true">
            <template #heading>
                <div class="flex-1">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" :value="myPublications" v-model="myPublications" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                        </div>
                        <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300"> {{ myPublications ? 'My data' :
                            'All public data' }}</span>
                    </label>
                </div>
            </template>
            <template #row="{ item }: { item: Publication }">
                <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {{ item.id }}
                </td>
                <td class="px-6 py-2">
                    <template v-if="myPublications">
                        <span v-if="item.status == PublicationStatus.PUBLISHED" title="Published" class="inline-flex outline text-blue-600 bg-blue-600 w-3 h-3 me-2 rounded-full"></span>
                        <span v-else title="Unpublished" class="inline-flex outline text-blue-600 w-3 h-3 me-2 rounded-full" ></span>
                    </template>
                    {{ item.task_name }}
                </td>
                <td class="px-6 py-2">
                    {{ item.author }}
                </td>
                <td class="px-6 py-2">
                    <a v-if="item.guidelines_url" class="base" target="_blank" :href="`${item.guidelines_url}`"> 
                        source </a>
                </td>
                <td class="px-6 py-2">
                    <a v-if="item.guidelines_url" class="base" target="_blank" :href="`${item.file_url}`"> source </a>
                </td>
                <td class="px-6 py-2 flex">
                    <NuxtLink class="base mr-2" :to="`/published/${item.id}`">
                        <Button label="View" size="small" />
                    </NuxtLink>
                    <NuxtLink v-if="item.editor_id == user?.id" class="mr-2" :to="`/published/${item.id}/edit`">
                        <Button label="Edit" size="small" link />
                    </NuxtLink>
                </td>
            </template>
        </Table>
    </div>
</template>
<script setup lang="ts">
import { type Publication, PublicationStatus } from "~/types";
import Table from "@/components/Table.vue";

const user = useSupabaseUser();

const publicationTable = ref<InstanceType<typeof Table> | null>();

const myPublications = ref<boolean>();

const filter = computed(() => {
    return myPublications.value ? { editor_id: user.value?.id } : { status: 'published' };
})

watch(myPublications, (new_val) => {
    publicationTable.value?.refresh();
})

definePageMeta({
    middleware: ["auth"],
});

</script>
  