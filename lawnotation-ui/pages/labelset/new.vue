<template>
  <Breadcrumb
    :crumbs="[
      {
        name: 'Labelsets',
        link: '/labelset',
      },
      {
        name: 'New labelset',
        link: '/labelset/new',
      },
    ]"
  />

  <div class="">
    <div class="flex flex-row justify-between">
      <h2 class="text-2xl">
        {{ new_labelset.name ? `New labelset: ${new_labelset.name}` : "New labelset" }}
      </h2>
      <button class="base btn-primary" @click="create_new_labelset">Create</button>
    </div>
    <hr class="pb-4 mt-2" />
    <div class="row">
      <div class="flex flex-col space-y-2">
        <input
          class="base"
          type="text"
          v-model="new_labelset.name"
          placeholder="Labelset name"
        />
        <textarea
          class="base"
          :value="new_labelset.desc"
          @input="new_labelset.desc = ($event.target as HTMLTextAreaElement)?.value"
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
          v-for="(label, i) of new_labelset.labels"
          :key="label.name"
        >
          <button class="base btn-secondary" @click="new_labelset.labels.splice(i, 1)">
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
import type { Labelset } from "~/types";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const new_label = reactive(get_label_default());

const new_labelset = ref<Omit<Labelset, "id" | "editor_id">>({
  name: "",
  desc: "",
  labels: [],
});

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
  if (!/^\#[a-zA-Z0-9]{6}$/.test(new_label.color)) throw new Error("Invalid label color");
  if (!/^[a-zA-Z0-9 ]+$/.test(new_label.name)) throw new Error("Invalid label name");
  if (
    new_labelset.value.labels.some(
      (x) => x.name.toLocaleLowerCase() === new_label.name.toLocaleLowerCase()
    )
  )
    throw new Error("A label with this name already exists");
};

const add_label = () => {
  try {
    validate_new_label();
    new_labelset.value.labels.push({
      name: new_label.name,
      color: new_label.color,
    });
    Object.assign(new_label, get_label_default());
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error adding label: ${error.message}`);
  }
};

const create_new_labelset = async () => {
  try {
    if (!user.value) throw new Error("Invalid user");
    if (new_labelset.value.name.trim().length === 0)
      throw new Error("Name of labelset can not be empty");
    if (new_labelset.value.desc.trim().length === 0)
      throw new Error("Description of labelset can not be empty");
    if (new_labelset.value.labels.length === 0)
      throw new Error("Labelset should contain atleast one label");

    const create = await $trpc.labelset.create.mutate({
      ...new_labelset.value,
      editor_id: user.value.id,
    });
    $toast.success(`Labelset "${new_labelset.value.name}" created`);
    navigateTo(`/labelset`);
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error creating new labelset: ${error.message}`);
  }
};

definePageMeta({
  middleware: ["auth"],
});
</script>
