<template>
  <div>
    <div>name:{{ document?.name }}</div>
    <div>source:{{ document?.source }}</div>
    <div>{{ document?.full_text }}</div>
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
