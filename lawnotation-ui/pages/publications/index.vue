<template>
    <div class="max-w-screen-lg mx-auto my-4">
        <h3 class="mb-2 text-lg font-semibold">Publications</h3>
        <Table endpoint="publications" :filter="{ status: 'published' }" ref="publicationTable" :sort="true" :search="true">
            <template #row="{ item }: { item: Publication }">
                <td scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {{ item.id }}
                </td>
                <td class="px-6 py-2">
                    {{ item.task_name }}
                </td>
                <td class="px-6 py-2">
                    {{ item.labels_name }}
                </td>
                <td class="px-6 py-2">
                    {{ item.author }}
                </td>
                <td class="px-6 py-2">
                    {{ item.contact }}
                </td>
                <td class="px-6 py-2">
                    <a class="base" target="_blank" :href="`${item.file_url}`"> Here </a>
                </td>
            </template>
        </Table>
    </div>
</template>
<script setup lang="ts">
import type { Publication } from "~/types";
import Table from "@/components/Table.vue";
import { TRPCClientError } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import type { ZodError, typeToFlattenedError } from "zod";

const publicationTable = ref<InstanceType<typeof Table> | null>();

const user = useSupabaseUser();
const { $toast, $trpc } = useNuxtApp();

definePageMeta({
    middleware: ["auth"],
});

</script>
  