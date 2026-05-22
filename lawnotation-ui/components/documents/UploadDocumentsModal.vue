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
                <div class="pt-6">
                    <FileUpload customUpload @uploader="emit('upload-documents', $event)" :multiple="true"
                        :maxFileSize="documentSizeLimitTxt" accept=".txt,.html,.pdf,.doc,.docx" :pt="{
                            input: {
                                'data-test': 'choose-documents',
                            },
                            fileThumbnail: {
                                class: 'hidden',
                            },
                        }">
                        <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
                            <div class="flex gap-2">
                                <Button label="Select" icon="pi pi-plus"
                                    :severity="files?.length ? 'secondary' : 'primary'" :class="files?.length
                                        ? '!bg-slate-100 !text-slate-600 hover:!bg-sky-900 hover:!text-white'
                                        : '!bg-sky-800 !text-white hover:!bg-sky-900'" data-test="choose-documents" @click="chooseCallback()" />
                                <Button label="Upload" icon="pi pi-upload"
                                    :severity="files?.length ? 'primary' : 'secondary'" :disabled="!files?.length"
                                    data-test="upload-documents" @click="uploadCallback()" />
                                <Button label="Cancel" icon="pi pi-times" severity="secondary"
                                    :disabled="!files?.length" @click="clearCallback()" />
                            </div>
                        </template>

                        <template #empty>
                            <div class="flex items-center justify-center flex-col">
                                <i
                                    class="pi pi-cloud-upload border-2 rounded-full p-5 text-8xl text-surface-400 dark:text-surface-600 border-surface-400 dark:border-surface-600" />
                                <p class="mt-4 mb-0">
                                    Drag and drop files to here to upload.
                                </p>
                                <p class="text-gray-400 text-xs mb-0">
                                    .txt .html file(s) (up to 6MB each)
                                </p>
                                <p class="text-gray-400 text-xs">
                                    .pdf .doc .docx file(s) (up to 4MB each)
                                </p>
                            </div>
                        </template>
                    </FileUpload>
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
import type { Doc } from "~/types/archive";
import SearchDocuments from "~/components/SearchDocuments.vue";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";

defineProps<{
    visible: boolean;
    documentSizeLimitTxt: number;
}>();

const emit = defineEmits<{
    "update:visible": [value: boolean];
    "upload-documents": [event: { files: File | File[] | FileList }];
    "documents-fetched": [docs: Doc[]];
}>();

const activeTabDocumentsModal = ref(0);
</script>