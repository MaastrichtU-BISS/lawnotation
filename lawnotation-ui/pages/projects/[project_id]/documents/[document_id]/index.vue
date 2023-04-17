<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Document:</h3>
    {{ document }}
  </div>
</template>
<script setup lang="ts">
import { Document, useDocumentApi } from "~/data/document";
const documentApi = useDocumentApi();

const route = useRoute();
const document = ref<Document>();

onMounted(() => {
  documentApi.findDocument(route.params.document_id.toString()).then((d) => {
    document.value = d;
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
