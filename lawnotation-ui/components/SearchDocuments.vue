<template>
    <LegalDocsForm title="Search Legal Documents"
        type="free"
        :on-submit="handleSubmit" :on-search-laws="handleSearchLaws"
        @success="onSuccess" @error="onError" />
</template>

<script setup lang="ts">
import { LegalDocsForm } from "vue-legal-query-builder";
import type { LegalDocsQuery } from "vue-legal-query-builder";
import type {
    BWBItem,
    RechtspraakFullTextDocument,
    EchrFullTextDocument,
} from "legal-docs-types";
import "vue-legal-query-builder/style.css";
import JSZip from "jszip";
import { ref } from "vue";
import { downloadAs } from "~/utils/download_file";

const { $toast } = useNuxtApp();

const { addDocumentsToProject = false } = defineProps<{
    addDocumentsToProject?: boolean;
}>();

const emit = defineEmits<{
    (
        event: "onDocumentsFetched",
        docs: Array<{ content: string; name: string; format: string }>
    ): void;
}>();

type FullTextDocument = RechtspraakFullTextDocument | EchrFullTextDocument;

const loading = ref(false);

// Searches go through our own server routes (server/api/legal-docs), which
// hold the Case Law Explorer API key - it must never reach the browser.
const handleSubmit = async (query: LegalDocsQuery): Promise<FullTextDocument[]> => {
    loading.value = true;

    try {
        return await $fetch<FullTextDocument[]>("/api/legal-docs/search", {
            method: "POST",
            body: query,
        });
    } catch (error: any) {
        // $fetch's own message is `[POST] "/api/...": 502 ...`; show the reason.
        throw new Error(error?.data?.statusMessage ?? error?.message ?? "Search failed");
    } finally {
        loading.value = false;
    }
};

// Failures are handled by the law selector itself, which shows no results.
const handleSearchLaws = (text: string) =>
    $fetch<BWBItem[]>("/api/legal-docs/laws", { query: { q: text } });

const onSuccess = (data: FullTextDocument[]) => {
    if (addDocumentsToProject) {
        emit(
            "onDocumentsFetched",
            data.map((doc) => ({
                content: doc.fullText ?? "",
                name: `${doc.ecli}.txt`,
                format: "text/plain",
            }))
        );
        return;
    }

    download(data);
};

const onError = (error: Error) => {
    loading.value = false;
    $toast.error(error.message);
};

const download = async (docs: FullTextDocument[]) => {
    const zip = new JSZip();

    try {
        docs.forEach((doc) => {
            zip.file(`${doc.ecli}.txt`, new Blob([doc.fullText ?? ""], { type: "text/plain" }));
        });

        const blobZip = await zip.generateAsync({ type: "blob" });
        downloadAs(blobZip, "documents.zip", "blob");
        $toast.success(`One .zip file containing ${docs.length} documents has been downloaded!`);
    } catch (error) {
        $toast.error(error as string);
    }
};
</script>