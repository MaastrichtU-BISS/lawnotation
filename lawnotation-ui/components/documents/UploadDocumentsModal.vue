<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" modal header="Add documents" :pt="{
        root: '!w-[80vw] xl:!w-[50vw]',
        header: {
            style: 'padding-bottom: 0px',
        },
        content: {
            style: 'padding-bottom: 0px',
        },
    }" :ptOptions="{ mergeProps: true }">
        <Tabs v-model:value="activeTabDocumentsModal" class="min-h-[565px]">
            <TabList>
                <Tab :value="0" :pt="{ root: { 'data-test': 'upload-documents-tab' } }">Upload</Tab>
                <!-- <Tab :value="1">Find (Rechtspraak)</Tab> -->
            </TabList>
            <TabPanels>
            <TabPanel :value="0">
                <div class="pt-6" data-test="upload-documents-panel">
                    <LegalDocsImport :readers="readers" :on-import="onImport" import-label="Upload documents" />
                    <p class="text-gray-400 text-xs mt-3 mb-0">
                        .txt file(s) up to 6MB each; .html, .pdf, .doc, .docx file(s) up to 4MB each
                    </p>
                </div>
            </TabPanel>

            <!-- <TabPanel :value="1">
                <SearchDocuments :add-documents-to-project="true"
                    @on-documents-fetched="emit('documents-fetched', $event)" />
            </TabPanel> -->
            </TabPanels>
        </Tabs>
    </Dialog>
</template>

<script setup lang="ts">
import { LegalDocsImport, textReader } from "vue-legal-docs-import";
import type { FormatReader, ImportedDocument } from "vue-legal-docs-import";
import "vue-legal-docs-import/style.css";
import type { Doc } from "~/types/archive";
import SearchDocuments from "~/components/SearchDocuments.vue";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";

const props = defineProps<{
    visible: boolean;
    documentSizeLimitTxt: number;
    documentSizeLimitPdf: number;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    "upload-documents": [documents: ImportedDocument[]];
    "documents-fetched": [docs: Doc[]];
}>();

const { $trpc, $toast } = useNuxtApp();

const activeTabDocumentsModal = ref(0);

const megabytes = (bytes: number) => `${Math.round(bytes / 1_000_000)}MB`;

// Plain text is read here, in the browser. Everything else is parsed on the
// server by node-legal-docs-import, so offsets into the stored text are the
// same whichever way a document arrived.
const baseReaders: FormatReader[] = [
    {
        ...textReader,
        extensions: [".txt"],
        async read(file) {
            if (file.size > props.documentSizeLimitTxt)
                throw new Error(`larger than the ${megabytes(props.documentSizeLimitTxt)} limit for .txt files`);
            return textReader.read(file);
        },
    },
    {
        extensions: [".html", ".htm", ".pdf", ".doc", ".docx"],
        label: "HTML, PDF, Word",
        async read(file) {
            if (file.size > props.documentSizeLimitPdf)
                throw new Error(`larger than the ${megabytes(props.documentSizeLimitPdf)} limit for this kind of file`);
            const { full_text } = await $trpc.document.extractText.mutate({
                name: file.name,
                data: await toBase64(file),
            });
            return full_text;
        },
    },
];

async function toBase64(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

// The modal closes as soon as the readable files are handed on, taking the
// list of skipped ones with it — so each one is also said in a toast.
const readers: FormatReader[] = baseReaders.map((reader) => ({
    ...reader,
    async read(file) {
        try {
            return await reader.read(file);
        } catch (e) {
            $toast.error(`${file.name} was not uploaded: ${(e as Error)?.message ?? "it could not be read"}`);
            throw e;
        }
    },
}));

// Everything read is handed straight on: the project page closes this modal
// and shows the upload's progress itself.
const onImport = (documents: ImportedDocument[]) => {
    emit("upload-documents", documents);
};
</script>