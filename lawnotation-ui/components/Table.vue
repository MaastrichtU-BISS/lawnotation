<template>
  <div class="spinner-wrapper">
    <!-- <span>{{ JSON.stringify({status, 'a': error.stack}) }}</span> -->
    <template v-if="pending !== false">
      <div class="spinner-overlay"></div>
      <div class="spinner">
        <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_ajPY"/></svg>
      </div>
    </template>
    <div class="relative overflow-x-auto sm:rounded-lg">
      <div class="flex items-center justify-end m-2">
        <span class="flex-grow" v-if="remove">
          <button
            v-show="total > 0"
            @click="removeAll"
            type="button"
            style="outline: none"
            class="mr-2 text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-xs px-5 py-2.5 text-center"
          >
            Remove all ({{ total }})
          </button>
          <button
            v-show="selectedRows.length"
            @click="removeSelected(selectedRows)"
            type="button"
            style="outline: none"
            class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-xs px-5 py-2.5 text-center"
          >
            Remove selected rows ({{ selectedRows.length }})
          </button>
        </span>
        <span class="flex" v-if="args.search">
          <select
            v-model="args.search.column"
            class="w-40 p-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 shadow-sm rounded-md bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          >
            <option
              v-for="[colname, col] of Object.entries(columndata).filter(
                  (x): x is [string, TableColumnDefinition] => 
                    x[1] != null &&
                    x[1].searchable != null &&
                    x[1].searchable
                )"
              :value="col.field"
            >
              {{ colname }}
            </option>
          </select>
          <div class="ml-2 bg-white">
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
              >
                <svg
                  class="w-5 h-5 text-gray-500"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </div>
              <input
                v-model="args.search.query"
                type="text"
                class="rounded-md border-0 bg-gray-50 p-2 pl-10 text-sm w-80 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400"
                :placeholder="`Search for ${args.search.column}`"
              />
            </div>
          </div>
        </span>
      </div>

      <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <!-- <slot name="head"></slot> -->
            <th class="px-6 py-2" v-if="remove">
              <input
                type="checkbox"
                @click="toggleAllCheckboxes"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                :id="`${name}_header_checkbox`"
              />
            </th>
            <th
              scope="col"
              class="px-6 py-3"
              v-for="[colname, col] of Object.entries(columndata)"
            >
              <span class="flex">
                {{ colname }}
                <span
                  class="ml-2 w-4 h-4 cursor-pointer"
                  v-if="args.sort && col && col.sortable && col.field"
                  @click="sortClick(col.field)"
                >
                  <svg
                    v-if="!args.sort || args.sort.column !== col.field"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                  <template v-else-if="args.sort && args.sort.column == col.field">
                    <svg
                      v-if="args.sort.dir === 'ASC'"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>
                    </svg>
                    <svg
                      v-else-if="args.sort.dir === 'DESC'"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>
                    </svg>
                  </template>
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <slot
            name="row"
            v-for="item in rows"
            :item="item"
            :key="item.id"
          ></slot>
        </tbody>
      </table>

      <nav
        v-if="pagination"
        class="pagination-holder flex items-center justify-between pt-4"
        aria-label="Table navigation"
      >
        <span class="text-sm font-normal text-gray-500">
          Showing
          <span class="font-semibold text-gray-900">
            <template v-if="total > 0">
              {{ visible_start_i }} - {{ visible_end_i }}
            </template>
            <template v-else>0</template>
          </span>
          of <span class="font-semibold text-gray-900">{{ total }}</span>
        </span>
        <ul class="inline-flex items-center -space-x-px">
          <li>
            <button
              @click="args.page != 1 && setPage(1)"
              :disabled="args.page == 1"
              class="pagination-item-default ml-0 rounded-l-lg"
            >
              <span class="sr-only">First</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                />
              </svg>
            </button>
          </li>
          <li>
            <button
              @click="args.page > 1 && setPage(args.page - 1)"
              :disabled="args.page == 1"
              class="pagination-item-default ml-0"
            >
              <span class="sr-only">Previous</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
          </li>

          <li
            v-for="page_start in range(
              Math.max(1, args.page - 2),
              args.page - 1
            )"
          >
            <button @click="setPage(page_start)" class="pagination-item-default">
              {{ page_start }}
            </button>
          </li>

          <li>
            <button href="#" aria-current="page" class="pagination-item-active">
              {{ args.page }}
            </button>
          </li>

          <li
            v-if="args.page !== total_pages"
            v-for="page_end in range(
              Math.min(total_pages, args.page + 1),
              Math.min(args.page + 2, total_pages)
            )"
          >
            <button @click="setPage(page_end)" class="pagination-item-default">
              {{ page_end }}
            </button>
          </li>
          <li>
            <button
              @click="args.page < total_pages && setPage(args.page + 1)"
              :disabled="args.page == total_pages"
              class="pagination-item-default"
            >
              <span class="sr-only">Next</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </li>
          <li>
            <button
              @click="args.page != total_pages && setPage(total_pages)"
              :disabled="args.page == total_pages"
              class="pagination-item-default ml-0 rounded-r-lg"
            >
              <span class="sr-only">Last</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { confirmBox } from "~/utils/confirmBox";
import { AppRouter } from "~/server/trpc/routers";

const { $trpc } = useNuxtApp();

const emit = defineEmits(["removeRows", "removeAllRows"]);
const selectedRows = reactive<string[]>([]);
const allChecked = ref(false);

type TableColumnDefinition = {
  field: string;
  sortable?: true;
  searchable?: true;
  remove?: false
};

const props = withDefaults(
  defineProps<{
    pagination?: boolean;
    remove?: boolean;
    name?: string;

    // tabledata: TableData<any>;
    columns: Record<string, string>;

    endpoint: keyof AppRouter['table']['_def']['procedures']
  }>(),
  {
    pagination: true,
    sort: false,
    search: false,
    name: '1'
  }
);

// const rows = ref<T[]>([]);
const columndata = ref<
  Record<
    string,
    TableColumnDefinition
  >
>(Object.keys(props.columns).reduce((attrs, key) => ({...attrs, [key]: null}), {})); // default values are 'null'

const default_search_column = computed(() => {
  Object.values(columndata)
    .filter((col): col is {field: string, searchable: true} => 
      col != null && 
      col.searchable != null &&
      col.searchable)
    .map((col) => col.field)[0] ?? null;
})

const default_sort_column =
  Object.values(columndata)
    .filter((col): col is {field: string, searchable: true} =>
      col != null &&
      col.sortable != null &&
      col.sortable)
    .map((col) => col.field)[0] ?? null;

// const sort = reactive<>(;

// const search = reactive<>();

// const page = ref<number>(1);
// const items_per_page = ref<number>(10);

// const total = ref<number>(0);
// const rows = ref<T[]>([]);

// const pending = ref<boolean>(true);

const args = reactive<{
  sort: {
    column: typeof props['columns'][keyof typeof props['columns']] | null,
    dir: "ASC" | "DESC"
  },
  search: {
    column: typeof props['columns'][keyof typeof props['columns']] | null,
    query: string
  },
  page: number,
  items_per_page: number
}>({
  sort: {
    column: null,
    dir: "ASC"
  },
  search: {
    column: null,
    query: ""
  },
  page: 1,
  items_per_page: 10
})

const { data, refresh, status, pending, execute, error } = $trpc.table[props.endpoint].useQuery(args);

const rows = computed(() => {
  if (!data.value) return [];
  return data.value.rows;
})
const total = computed(() => {
  if (!data.value) return 0;
  return data.value.total;
})

const sortClick = async (colname: string) => {
  const dir =
    args.sort &&
    args.sort.column === colname &&
    args.sort.dir === "ASC"
      ? "DESC"
      : "ASC";
  args.sort.column = colname;
  args.sort.dir = dir;

  refresh();
  prepareCheckboxes();
};

watch(
  () => [
    args.search.query,
    args.search.column,
    // total,
  ],
  async () => {
    args.page = 1;
    refresh();
    prepareCheckboxes();
  }
);

const setPage = async (new_page: number) => {
  args.page = Math.max(1, new_page);
  refresh()
  prepareCheckboxes();
};

const visible_start_i = computed(() => {
  return (args.page - 1) * args.items_per_page + 1;
});
const visible_end_i = computed(() => {
  return visible_start_i.value + rows.value.length - 1;
});

const total_pages = computed(() => {
  return Math.max(1, Math.ceil(total.value / args.items_per_page));
});

const range = (from: number, to: number): number[] => {
  const arr = [];
  for (let i = from; i <= to; i++) {
    arr.push(i);
  }
  return arr;
};

const toggleAllCheckboxes = () => {
  const checkboxes = document.getElementsByName(`${props.name}_table_checkbox`);
  checkboxes.forEach((cb) => {
    if (!allChecked.value && !(cb as HTMLInputElement).checked) cb.click();
    if (allChecked.value && (cb as HTMLInputElement).checked) cb.click();
  });
  allChecked.value = !allChecked.value;
};

const prepareCheckboxes = () => {
  selectedRows.splice(0, selectedRows.length);
  const checkboxes = document.getElementsByName(`${props.name}_table_checkbox`);
  if (!checkboxes.length) return;
  checkboxes.forEach((cb) => {
    if ((cb as HTMLInputElement).checked) cb?.click();
    cb.onclick = () => {
      handleClickOnCheckbox(cb as HTMLInputElement);
    };
  });
  const cbh = document.getElementById(`${props.name}_header_checkbox`);
  if ((cbh as HTMLInputElement).checked) cbh?.click();
};

const handleClickOnCheckbox = (cb: HTMLInputElement) => {
  const row = cb.closest("tr");
  if (cb.checked) {
    selectedRows.push(cb.dataset.id!);
    row?.classList.remove("bg-white");
    row?.classList.add("bg-gray-100");
  } else {
    const index = selectedRows.indexOf(cb.dataset.id!);
    if (index >= 0) {
      selectedRows.splice(index, 1);
    }
    row?.classList.remove("bg-gray-100");
    row?.classList.add("bg-white");
  }
};

const removeSelected = async (ids: string[]) => {
  confirmBox(
    `Are you sure you want to delete ${ids.length} row${ids.length > 1 ? "s" : ""}?`,
    "You won't be able to revert this!",
    "warning"
  ).then((result) => {
    if (result.isConfirmed) {
      emit("removeRows", ids);
    }
  });
};

const removeAll = () => {
  confirmBox(
    "Are you sure you want to delete all the rows?",
    "You won't be able to revert this!",
    "warning"
  ).then((result) => {
    if (result.isConfirmed) {
      emit("removeAllRows");
    }
  });
};

onMounted(() => {
  // setTimeout(execute, 1);
  // execute();
  prepareCheckboxes();
});
</script>

<style lang="scss">
.pagination-holder {
  font-size: 16px;

  .pagination-item-default {
    @apply px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300;
    &:not([disabled]) {
      @apply hover:bg-gray-100 hover:text-gray-700;
    }
    &:disabled {
      @apply bg-gray-50;
    }
  }

  .pagination-item-many {
    @apply px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300;
  }

  .pagination-item-active {
    @apply z-10 px-3 py-2 leading-tight text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700;
  }
}

.spinner_ajPY{transform-origin:center;animation:spinner_AtaB .75s infinite linear}@keyframes spinner_AtaB{100%{transform:rotate(360deg)}}
.spinner-wrapper {
  position: relative;
  .spinner-overlay {
    background-color: white;
    opacity: 0.5;
    z-index: 999;
    position: absolute;
    width: 100%;
    height: 100%;
  }
  .spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1000;
    transform: translate(-50%, -50%);
  }
}
</style>
