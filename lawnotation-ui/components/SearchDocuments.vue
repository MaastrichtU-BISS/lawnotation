<template>
    <LegalDocsForm title="Search Legal Documents"
        type="free"
        :on-submit="handleSubmit" :on-search-laws="handleSearchLaws"
        @success="onSuccess" @error="onError" />
</template>

<script setup lang="ts">
import { LegalDocsForm } from "vue-legal-query-builder";
import type { LegalDocsQuery } from "vue-legal-query-builder";
import type { BWBItem } from "legal-docs-types";
import "vue-legal-query-builder/style.css";
import JSZip from "jszip";
import { ref } from "vue";
import { downloadAs } from "~/utils/download_file";
import { fetchFullTexts, TEXT_BATCH_SIZE, type FullTextDocument } from "~/utils/legal_docs";

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

const loading = ref(false);

// Searches go through our own server routes (server/api/legal-docs), which
// hold the Case Law Explorer API key - it must never reach the browser. The
// search returns the matching ECLIs; their full texts then come in batches
// (the API serves at most 200 per request), with progress shown for large
// results.
const handleSubmit = async (query: LegalDocsQuery): Promise<FullTextDocument[]> => {
    loading.value = true;
    let progressToast: ReturnType<typeof $toast.info> | undefined;

    try {
        const { dataset, eclis, truncated } = await $fetch<{
            dataset: "RS" | "ECHR";
            eclis: string[];
            truncated: boolean;
        }>("/api/legal-docs/search", { method: "POST", body: query });
        if (!eclis.length) return [];
        if (truncated) {
            $toast.warning(
                `This search matches more documents than the archive returns at once; only the first ${eclis.length.toLocaleString()} are included. Narrow the search (dates, courts, keywords) to get the rest.`,
                { timeout: 15000 }
            );
        }

        const message = (done: number) =>
            `Fetching the full texts: ${done.toLocaleString()} of ${eclis.length.toLocaleString()} documents`;
        if (eclis.length > TEXT_BATCH_SIZE) {
            progressToast = $toast.info(message(0), { timeout: false, closeButton: false });
        }
        return await fetchFullTexts(dataset, eclis, (done) => {
            if (progressToast !== undefined) $toast.update(progressToast, { content: message(done) });
        });
    } catch (error: any) {
        // $fetch's own message is `[POST] "/api/...": 502 ...`; show the reason.
        throw new Error(error?.data?.statusMessage ?? error?.message ?? "Search failed");
    } finally {
        if (progressToast !== undefined) $toast.dismiss(progressToast);
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