<template>
    <div class="mx-auto md:w-1/2">
        <div class="dimmer-wrapper">
            <Dimmer v-model="loading" />
            <div class="dimmer-content">
                <h3 class="mt-3 text-lg font-semibold text-center">Provide ECLIs</h3>
                <h3 class="my-3 text-sm font-semibold">
                    ECLIs provided: {{ eclis.length }}
                </h3>
                <Chips v-model="eclis" separator="," addOnBlur :pt="{
                    input: {
                        'data-test': 'eclis'
                    },
                }" />
                <div class="my-4 text-center">
                    <Button type="button" @click="fetchDocuments" :label="addDocumentsToProject ? 'Confirm' : 'Download'" :icon="addDocumentsToProject ? 'pi pi-check' : 'pi pi-download'" iconPos="right"
                        :disabled="!eclis.length || loading" data-test="download-button" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { downloadAs } from "~/utils/download_file";
import type { DocFormat, Doc } from "~/types/archive";
import JSZip, { file } from "jszip";

const { $toast, $trpc } = useNuxtApp();

const props = withDefaults(
    defineProps<{
        addDocumentsToProject: boolean
    }>(),
    { addDocumentsToProject: false });

const emit = defineEmits(["onDocumentsFetched"]);

const eclis = ref<string[]>([]);
const format = ref<DocFormat>("text/plain");
const loading = ref<boolean>(false);

// ECLI:NL:RBLIM:2023:7197,ECLI:NL:OGEAC:2021:280,ECLI:NL:RVS:2011:BU7101

// Recursively gets the text from the xml
const getText = (node: any): string => {
    if (node.nodeType === 3) {
        return node.nodeValue;
    }

    let acc = "";

    for (let child of node.childNodes)
        acc += getText(child);

    return acc;
}

const fetchDocuments = async () => {
    loading.value = true;

    let docs: Doc[] = [];

    try {
        const xmls = await $trpc.archive.getXMLFromRechtspraak.query({ eclis: eclis.value });

        docs = xmls.map((xml: string, index: number) => {
            console.log(xml);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            const text = getText(xmlDoc);
            return {
                name: `${eclis.value[index]}.${format.value == "text/plain" ? "txt" : ""}`,
                content: text ?? "",
                format: format.value
            }
        });

    } catch (error) {
        loading.value = false;
        $toast.error(error as string);
    }

    if(props.addDocumentsToProject) {
        emit("onDocumentsFetched", docs);
    } else {
        download(docs);
    }

    return docs;
};

const download = async (docs: Doc[]) => {
    const zip = JSZip();
    try {
        docs.map((doc: Doc) => {
            zip.file(doc.name, new Blob([doc.content]));
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