<template>
    <LegalDocsForm
        title="Search Legal Documents"
        :on-submit="handleSubmit"
        @success="onSuccess"
        @error="onError"
    />
</template>

<script setup lang="ts">
import { LegalDocsForm, createLegalDocsClient } from "vue-legal-query-builder";
import type {
    FullTextDocument,
    LegalDocument,
    QueryParameters,
} from "vue-legal-query-builder";
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

const client = createLegalDocsClient({});
const loading = ref(false);

const handleSubmit = async (queryParams: QueryParameters) => {
    loading.value = true;

    try {
        const docs: LegalDocument[] = await client.fetchDocuments(queryParams);
        const fullTexts: FullTextDocument[] = await client.getFullText(
            docs.map((doc) => doc.id)
        );
        return fullTexts;
    } finally {
        loading.value = false;
    }
};

const onSuccess = (data: FullTextDocument[]) => {
    if (addDocumentsToProject) {
        emit(
            "onDocumentsFetched",
            data.map((doc) => ({
                content: doc.fullText,
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
            zip.file(`${doc.ecli}.txt`, new Blob([doc.fullText], { type: "text/plain" }));
        });

        const blobZip = await zip.generateAsync({ type: "blob" });
        downloadAs(blobZip, "documents.zip", "blob");
        $toast.success(`One .zip file containing ${docs.length} documents has been downloaded!`);
    } catch (error) {
        $toast.error(error as string);
    }
};
</script>