<template>
  <div class="mx-auto max-w-screen-xl py-8">
    <h2 class="text-2xl">New labelset</h2>
    <hr class="pb-4 mt-2" />

    <!-- <button @click="load_default()" class="btn btn-primary" style="margin-bottom: 1rem">Load default</button> -->
    <div class="row">
      <div class="flex flex-col space-y-2">
        <input type="text" v-model="new_labelset.name" />
        <textarea
          :value="new_labelset.desc"
          @input="new_labelset.desc = ($event.target as HTMLTextAreaElement)?.value"></textarea>
      </div>
      <hr class="pb-4 mt-2" />
      <div class="flex space-x-4" >
        <input v-model="new_label.color" type="color" class="" style="height: 100%" />
        <input v-model="new_label.name" type="text" style="flex-grow: 1" @keydown.enter="add_label()" />
        <button @click="add_label()" class="btn btn-primary">Add</button>
        <button @click="export_label_collection()" class="btn btn-secondary">Export</button>
        <button @click="click_import_label_collection()" class="btn btn-secondary">Import</button>
        <input type="file" style="display: none;" @change="import_labels_file_changed" id="import_file_holder" />
      </div>
      <div style="border-bottom: 1px solid #999; width: 100%; margin: 1rem"></div>
      <div class="col">
        <div class="label-holder" v-for="(label, i) of new_labelset.labels" :key="label.name">
          <button class="btn btn-danger btn-sm" @click="new_labelset.labels.splice(i, 1)">
            <svg style="width: 1rem" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <span class="label" :style="{backgroundColor: `${label.color}`}">{{ label.name }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
<script setup lang="ts">
import { Labelset, useLabelsetApi } from "~/data/labelset";
const route = useRoute();

const user = useSupabaseUser();
const labelsetApi = useLabelsetApi();

// const labelset = ref<Labelset>();

function get_label_default() {
  const r = Math.floor(Math.random() * 180 + 50)
  const b = Math.floor(Math.random() * 180 + 50)
  const g = Math.floor(Math.random() * 180 + 50)
  return {
    name: "",
    color: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`,
    meta: {
      editing: false
    }
  };
}
const new_label = reactive(get_label_default());

const new_labelset = ref<Omit<Labelset, "id">>({
  name: "",
  desc: "",
  labels: [
    // {
    //   name: "Example",
    //   color: "#c00"
    // }
  ]
});

onMounted(() => {

});

definePageMeta({
  middleware: ["auth"],
});
</script>
