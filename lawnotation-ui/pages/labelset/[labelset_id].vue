<template>
  <Breadcrumb v-if="labelset" :crumbs="[
    {
      name: 'Labelsets',
      link: '/labelset',
    },
    {
      name: `Labelset ${labelset.name}`,
      link: `/labelset/${labelset.id}`
    }
  ]" />

  <div v-if="labelset === undefined">Loading labelset...</div>
  <div v-else>
    <div class="flex flex-row justify-between">
      <h2 class="text-2xl">Editing labelset: {{ labelset.name }}</h2>
      <button class="base btn-primary" @click="save_labelset">Save changes</button>
    </div>
    <hr class="pb-4 mt-2" />
    <div class="row">
      <div class="flex flex-col space-y-2">
        <input class="base" type="text" v-model="labelset.name" placeholder="Labelset name" />
        <textarea
          class="base"
          :value="labelset.desc"
          @input="labelset.desc = ($event.target as HTMLTextAreaElement)?.value"
          placeholder="Labelset description"
        ></textarea>
      </div>
      <hr class="my-3" />
      <div class="flex space-x-4">
        <input v-model="new_label.color" type="color" class="base self-center" />
        <input
          class="base grow"
          v-model="new_label.name"
          placeholder="Label name"
          type="text"
          @keydown.enter="add_label()"
        />
        <button @click="add_label()" class="base btn-primary">Add</button>
        <input
          class="hidden"
          type="file"
          @change="import_labels_file_changed"
          id="import_file_holder"
        />
      </div>
      <hr class="my-3" />
      <div class="col">
        <div
          class="label-holder flex items-center gap-3 mb-2"
          v-for="(label, i) of labelset.labels"
          :key="label.name"
        >
          <button class="base btn-secondary" @click="labelset.labels.splice(i, 1)">
            <svg
              style="width: 1rem"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
          <span
            class="label px-3 py-1 rounded"
            :style="{ backgroundColor: `${label.color}` }"
            >{{ label.name }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Labelset, useLabelsetApi } from "~/data/labelset";
const route = useRoute();
const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const labelsetApi = useLabelsetApi();

const new_label = reactive(get_label_default());

const labelset = ref<Labelset>();

function get_label_default() {
  const r = Math.floor(Math.random() * 180 + 50);
  const b = Math.floor(Math.random() * 180 + 50);
  const g = Math.floor(Math.random() * 180 + 50);
  return {
    name: "",
    color: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`,
    meta: {
      editing: false,
    },
  };
}

const validate_new_label = () => {
  if (!labelset.value) throw new Error("No labelset to add label to");

  if (!/^\#[a-zA-Z0-9]{6}$/.test(new_label.color)) throw new Error("Invalid label color");
  if (!/^[a-zA-Z0-9 ]+$/.test(new_label.name)) throw new Error("Invalid label name");
  if (
    labelset.value.labels.some(
      (x) => x.name.toLocaleLowerCase() === new_label.name.toLocaleLowerCase()
    )
  )
    throw new Error("A label with this name already exists");
};

const add_label = () => {
  try {
    validate_new_label();
    labelset.value!.labels.push({
      name: new_label.name,
      color: new_label.color,
    });
    Object.assign(new_label, get_label_default());
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error adding label: ${error.message}`);
  }
};

const save_labelset = async () => {
  try {
    if (!user.value) throw new Error("Invalid user");
    if (!labelset.value) throw new Error("No labelset to save");

    const create = await labelsetApi.updateLabelset(labelset.value.id, {
      ...labelset.value,
      editor_id: user.value.id,
    });
    $toast.success("Saved labelset");
    // alert("Saved labelset");
    // navigateTo(`/labelset`)
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error saving labelset: ${error.message}`);
  }
};

onMounted(async () => {
  const loaded_labelset = await labelsetApi.findLabelset(
    route.params.labelset_id.toString()
  );
  labelset.value = loaded_labelset;
  // Object.assign(labelset, loaded_labelset);
});

definePageMeta({
  middleware: ["auth"],
});
</script>
