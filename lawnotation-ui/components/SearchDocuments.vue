<template>
    <LegalDocsForm title="Search Legal Documents"
        :on-submit="handleSubmit" @success="onSuccess" @error="onError" />
</template>

<script setup lang="ts">
import { LegalDocsForm, createLegalDocsClient } from 'vue-legal-query-builder'
import type { LegalDocument } from 'vue-legal-query-builder'
import JSZip, { file } from "jszip";
import { ref } from "vue";
import { downloadAs } from "~/utils/download_file";
import 'vue-legal-query-builder/style.css'

// TODO: update vue-legal-query-builder to export types and use them here instead of any

const { $toast, $trpc } = useNuxtApp();

const { addDocumentsToProject = false } =
    defineProps<{
        addDocumentsToProject?: boolean
    }>();

const client = createLegalDocsClient({})

const handleSubmit = async (queryParams: any) => {
    const docs: LegalDocument[] = await client.fetchDocuments(queryParams)
    const fullTexts = await client.getFullText(docs.map((doc) => doc.id))
    return fullTexts
}

const onSuccess = (data: any) => {
    if (addDocumentsToProject) {
        emit("onDocumentsFetched", data.map((doc: any) => ({ content: doc.full_text, name: `${doc.ecli}.txt`, format: "plain/text" })));
    } else {
        download(data);
    }
}

const onError = (error: Error) => {
    $toast.error(error.message)
}

const emit = defineEmits(["onDocumentsFetched"]);
const loading = ref<boolean>(false);

const download = async (docs: any[]) => {
    const zip = JSZip();
    try {
        docs.map((doc: any) => {
            zip.file(`${doc.ecli}.txt`, new Blob([doc.full_text]));
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