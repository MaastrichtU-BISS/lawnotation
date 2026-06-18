<template>
  <div>
    <div class="flex justify-between items-center mb-3">
      <span class="text-sm text-gray-500">
        {{ selectedPages.length }} of {{ totalPages }} pages selected
      </span>
      <div class="flex gap-2">
        <Button size="small" severity="secondary" label="Select All" @click="selectAll" :disabled="converting" />
        <Button size="small" severity="secondary" label="Clear" @click="clearSelection" :disabled="converting" />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-48 text-gray-400">
      <div class="text-center">
        <i class="pi pi-spin pi-spinner text-3xl block mb-2" />
        <span class="text-sm">Loading pages…</span>
      </div>
    </div>

    <div v-else class="grid grid-cols-4 gap-3 overflow-y-auto max-h-[45vh] pr-1">
      <div
        v-for="page in pages"
        :key="page.num"
        class="relative cursor-pointer rounded border-2 transition-colors select-none"
        :class="
          selectedPages.includes(page.num)
            ? 'border-sky-600 bg-sky-50'
            : 'border-gray-200 hover:border-sky-300'
        "
        @click="togglePage(page.num)"
      >
        <img :src="page.dataUrl" class="w-full rounded-sm block" />
        <div class="absolute top-1 right-1 pointer-events-none">
          <div
            class="w-4 h-4 rounded border-2 flex items-center justify-center text-white text-xs font-bold"
            :class="
              selectedPages.includes(page.num)
                ? 'bg-sky-600 border-sky-600'
                : 'bg-white border-gray-400'
            "
          >
            <i v-if="selectedPages.includes(page.num)" class="pi pi-check" style="font-size: 0.55rem" />
          </div>
        </div>
        <div class="text-center text-xs text-gray-500 py-1">{{ page.num }}</div>
      </div>
    </div>

    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
      <Button severity="secondary" label="Cancel" @click="emit('cancel')" :disabled="converting" />
      <Button
        label="Convert & Upload"
        icon="pi pi-upload"
        icon-pos="right"
        :disabled="!selectedPages.length || loading || converting"
        :loading="converting"
        @click="handleConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ file: File }>();
const emit = defineEmits<{
  confirm: [{ pages: number[]; docxFile: File; docxBlob: Blob }];
  cancel: [];
}>();

const { loadPdf, renderPageThumbnail, convert } = usePdfToDocx();

const loading = ref(true);
const converting = ref(false);
const totalPages = ref(0);
const pages = ref<{ num: number; dataUrl: string }[]>([]);
const selectedPages = ref<number[]>([]);

onMounted(async () => {
  const pdf = await loadPdf(props.file);
  totalPages.value = pdf.numPages;

  for (let i = 1; i <= pdf.numPages; i++) {
    const dataUrl = await renderPageThumbnail(pdf, i);
    pages.value.push({ num: i, dataUrl });
  }

  selectedPages.value = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  loading.value = false;
});

const togglePage = (num: number) => {
  if (converting.value) return;
  const idx = selectedPages.value.indexOf(num);
  if (idx === -1) selectedPages.value.push(num);
  else selectedPages.value.splice(idx, 1);
};

const selectAll = () => {
  selectedPages.value = pages.value.map((p) => p.num);
};

const clearSelection = () => {
  selectedPages.value = [];
};

const handleConfirm = async () => {
  converting.value = true;
  try {
    const { docxBlob, docxFile } = await convert(props.file, selectedPages.value);
    emit("confirm", { pages: selectedPages.value, docxFile, docxBlob });
  } finally {
    converting.value = false;
  }
};
</script>
