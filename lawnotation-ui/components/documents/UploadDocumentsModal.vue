<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" modal
        :header="currentPdf ? `Select pages — ${currentPdf.name}` : 'Add documents'"
        :pt="{
            root: '!w-[80vw] xl:!w-[60vw]',
            header: { style: 'padding-bottom: 0px' },
            content: { style: 'padding-bottom: 0px' },
        }" :ptOptions="{ mergeProps: true }">

        <!-- PDF page selector replaces the tab content while a PDF is being processed -->
        <div v-if="currentPdf" class="pt-4">
            <PdfPageSelector
                :file="currentPdf"
                @confirm="handlePdfConfirm"
                @cancel="cancelPdfProcessing"
            />
        </div>

        <template v-else>
            <Tabs v-model:value="activeTabDocumentsModal" class="min-h-[565px]">
                <TabList>
                    <Tab :value="0" :pt="{ root: { 'data-test': 'upload-documents-tab' } }">Upload</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel :value="0">
                        <div class="pt-6">
                            <FileUpload customUpload @uploader="handleUploader($event)" :multiple="true"
                                :maxFileSize="documentSizeLimitTxt" accept=".txt,.html,.pdf,.doc,.docx" :pt="{
                                    input: { 'data-test': 'choose-documents' },
                                    fileThumbnail: { class: 'hidden' },
                                }">
                                <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
                                    <div class="flex gap-2">
                                        <Button label="Select" icon="pi pi-plus"
                                            :severity="files?.length ? 'secondary' : 'primary'" :class="files?.length
                                                ? '!bg-slate-100 !text-slate-600 hover:!bg-sky-900 hover:!text-white'
                                                : '!bg-sky-800 !text-white hover:!bg-sky-900'"
                                            data-test="choose-documents" @click="chooseCallback()" />
                                        <Button label="Upload" icon="pi pi-upload"
                                            :severity="files?.length ? 'primary' : 'secondary'"
                                            :disabled="!files?.length" data-test="upload-documents"
                                            @click="uploadCallback()" />
                                        <Button label="Cancel" icon="pi pi-times" severity="secondary"
                                            :disabled="!files?.length" @click="clearCallback()" />
                                    </div>
                                </template>
                                <template #empty>
                                    <div class="flex items-center justify-center flex-col">
                                        <i class="pi pi-cloud-upload border-2 rounded-full p-5 text-8xl text-surface-400 dark:text-surface-600 border-surface-400 dark:border-surface-600" />
                                        <p class="mt-4 mb-0">Drag and drop files to here to upload.</p>
                                        <p class="text-gray-400 text-xs mb-0">.txt .html file(s) (up to 6MB each)</p>
                                        <p class="text-gray-400 text-xs">.pdf — page selector opens before upload</p>
                                        <p class="text-gray-400 text-xs">.doc .docx file(s) (up to 4MB each)</p>
                                    </div>
                                </template>
                            </FileUpload>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import type { Doc } from "~/types/archive";
import PdfPageSelector from "~/components/documents/PdfPageSelector.vue";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import fileSaver from "file-saver";

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
const pendingPdfs = ref<File[]>([]);
const currentPdf = ref<File | null>(null);

const handleUploader = (event: { files: File | File[] | FileList }) => {
    const files = Array.isArray(event.files)
        ? event.files
        : event.files instanceof FileList
            ? Array.from(event.files)
            : [event.files];

    const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const others = files.filter((f) => !f.name.toLowerCase().endsWith(".pdf"));

    if (others.length) {
        emit("upload-documents", { files: others });
    }

    if (pdfs.length) {
        pendingPdfs.value = pdfs;
        currentPdf.value = pdfs[0];
    }
};

const handlePdfConfirm = async ({
    docxFile,
    docxBlob,
}: {
    pages: number[];
    docxFile: File;
    docxBlob: Blob;
}) => {
    fileSaver.saveAs(docxBlob, docxFile.name);
    emit("upload-documents", { files: [docxFile] });

    pendingPdfs.value.shift();
    currentPdf.value = pendingPdfs.value[0] ?? null;
};

const cancelPdfProcessing = () => {
    pendingPdfs.value = [];
    currentPdf.value = null;
};
</script>