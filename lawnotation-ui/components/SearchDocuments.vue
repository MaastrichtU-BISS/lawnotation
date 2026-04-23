<template>
    <LegalDocsForm title="Search Legal Documents"
        type="free"
        :on-submit="handleSubmit" @success="onSuccess" @error="onError" />
</template>

<script setup lang="ts">
import { LegalDocsForm, createLegalDocsClient } from 'vue-legal-query-builder'
import type { QueryParameters, LegalDocument, FullTextDocument } from 'vue-legal-query-builder'
import JSZip from "jszip";
import { ref } from "vue";
import { downloadAs } from "~/utils/download_file";
import 'vue-legal-query-builder/style.css'

const { $toast } = useNuxtApp();

const { addDocumentsToProject = false } =
    defineProps<{
        addDocumentsToProject?: boolean
    }>();

const client = createLegalDocsClient({
    apiKey: import.meta.env.VITE_CITATIONS_API_KEY,
})

const handleSubmit = async (queryParams: QueryParameters) => {
    const docs: LegalDocument[] = await client.fetchDocuments(queryParams)
    const fullTexts: FullTextDocument[] = await client.getFullText(docs.map((doc) => doc.id))
    return fullTexts
}

const onSuccess = (data: FullTextDocument[]) => {
    if (addDocumentsToProject) {
        emit("onDocumentsFetched", data.map((doc: FullTextDocument) => ({ content: doc.fullText, name: `${doc.ecli}.txt`, format: "plain/text" })));
    } else {
        download(data);
    }
}

const onError = (error: Error) => {
    $toast.error(error.message)
}

const emit = defineEmits(["onDocumentsFetched"]);
const loading = ref<boolean>(false);

const download = async (docs: FullTextDocument[]) => {
    const zip = JSZip();
    try {
        docs.map((doc: FullTextDocument) => {
            zip.file(`${doc.ecli}.txt`, new Blob([doc.fullText,], { type: "plain/text" }));
        });

        const blob_zip = await zip.generateAsync({ type: "blob" });

        downloadAs(blob_zip, "documents.zip", "blob");

        $toast.success(`One .zip file containing ${docs.length} documents has been downloaded!`);
    } catch (error) {
        $toast.error(error as string);
    }

    loading.value = false;
}
</script>