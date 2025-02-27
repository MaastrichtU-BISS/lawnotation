<template>
  <div class="spinner-wrapper">
    <template v-if="pending !== false">
      <div class="spinner-overlay"></div>
      <div class="spinner">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
            opacity=".25"
          />
          <path
            d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
            class="spinner_svg"
          />
        </svg>
      </div>
    </template>
    <div class="relative overflow-x-auto sm:rounded-lg">
      <div class="flex items-center justify-end m-2">
        <slot name="heading"></slot>
        <span class="flex-grow" v-if="props.selectable">
          
          <Button 
            v-show="total > 0" 
            type="button" 
            icon="pi pi-ellipsis-v" 
            link 
            @click="(event) => removeAllMenu.toggle(event)" 
            aria-haspopup="true" 
            aria-controls="remove-all-menu" 
            data-test="remove-all-menu-button" 
          />
          <Menu ref="removeAllMenu" id="remove-all-menu" :popup="true" :model="[{
              label: `Delete all (${ total })`,
              command: deleteAll
            }]"
            :pt="{
              label: 'text-[#f05252]',
              content: {
                'data-test': 'remove-all'
              }
            }"
            :ptOptions="{ mergeProps: true }"
          />
          <Button 
            v-show="checkedIds.length"
            type="button"
            :label="`Delete selected row${checkedIds.length > 1 ? 's' : ''} (${ checkedIds.length })`"
            severity="danger"
            outlined
            @click="deleteSelected(checkedIds)"
            :pt="{ label: 'text-xs' }"
            :ptOptions="{ mergeProps: true }"
            data-test="remove-selected-rows" 
          />
          <ConfirmBox v-if="!skipConfirmDialog" />
        </span>
        <span
          class="flex"
        >
          <select
            v-if="props.search && Object.keys(searchableColumns).length > 0"
            v-model="args.search.column"
            class="w-40 p-2 text-sm text-gray-900 border-0 rounded-md shadow-sm ring-1 ring-inset ring-secondary bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-primary"
          >
            <option
              v-for="[colname, colfield] of Object.entries(searchableColumns)"
              :value="colfield"
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
                class="rounded-md border-0 bg-gray-50 p-2 pl-10 text-sm w-80 text-gray-900 shadow-sm ring-1 ring-inset ring-secondary focus:ring-2 focus:ring-primary placeholder:text-gray-400"
                placeholder="Search"
              />
            </div>
          </div>
        </span>
      </div>

      <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <!-- <slot name="head"></slot> -->
            <th class="px-6 py-2" v-if="props.selectable">
              <input
                type="checkbox"
                v-model="allCheckbox"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                data-test="Checkbox-all"
              />
            </th>
            <th
              scope="col"
              class="px-6 py-3"
              v-for="[colname, col] of Object.entries(columns)"
            >
              <span class="flex">
                {{ colname }}
                <span
                  class="w-4 h-4 ml-2 cursor-pointer"
                  v-if="args.sort && col && col.sortable"
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
          <tr
            class="bg-white border-b hover:bg-gray-50"
            :class="{ '!bg-gray-100': checkedIds.includes(item.id) }"
            v-for="item in rows"
          >
            <td class="px-6 py-2" v-if="props.selectable">
              <input
                type="checkbox"
                :value="item.id"
                v-model="checkedIds"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                data-test="checkbox"
              />
            </td>
            <slot name="row" :item="item" :key="item.id"></slot>
          </tr>
        </tbody>
      </table>

      <nav
        v-if="pagination"
        class="flex items-center justify-between pt-4 pagination-holder"
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
              class="ml-0 rounded-l-lg pagination-item-default"
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
              class="ml-0 pagination-item-default"
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

          <li v-for="page_start in range(Math.max(1, args.page - 2), args.page - 1)">
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
              class="ml-0 rounded-r-lg pagination-item-default"
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

<script setup lang="ts">
import { useConfirm } from "primevue/useconfirm";
import ConfirmBox from "~/components/ConfirmBox.vue";
import type { AppRouter } from "~/server/trpc/routers";
import { tableColumns } from "~/constants/tableColumns";

const { $trpc, $toast } = useNuxtApp();

// const emit = defineEmits(["removeRows", "removeAllRows"]);
const emit = defineEmits<{
  (e: "removeRows", ids: string[], callback: (promises: (Promise<Boolean>[])) => void): void;
  (e: "removeAllRows", callback: (promise: (Promise<Boolean>)) => void): void;
}>();
const checkedIds = ref<string[]>([]);

const props = withDefaults(
  defineProps<{
    pagination?: boolean;
    selectable?: boolean;
    sort?: boolean;
    search?: boolean;
    filter?: Record<string, any>;
    skipConfirmDialog?: boolean;
    // name?: string,

    endpoint: keyof AppRouter["table"]["_def"]["procedures"];
  }>(),
  {
    pagination: true,
    sort: false,
    search: false,
    selectable: false,
    skipConfirmDialog: false,
    name: "1",
  }
);

const removeAllMenu = ref();

const columns = tableColumns[props.endpoint];

const searchableColumns = (() => {
  return Object.fromEntries(
    Object.entries(columns)
      .filter(
        (col): col is [string, { field: string; searchable: true }] =>
          col[1] != null && col[1].searchable != undefined && col[1].searchable === true
      )
      .map((col) => [col[0], col[1].field])
  );
})();

const sortableColumns = (() => {
  return Object.fromEntries(
    Object.entries(columns)
      .filter(
        (col): col is [string, { field: string; sortable: true }] =>
          col[1] != null && col[1].sortable != undefined && col[1].sortable === true
      )
      .map((col) => [col[0], col[1].field])
  );
})();

const args = reactive<{
  sort: {
    column: string | null;
    dir: "ASC" | "DESC";
  };
  search: {
    column: string | null;
    query: string;
  };
  filter: typeof props.filter;
  page: number;
  items_per_page: number;
}>({
  sort: {
    column: Object.values(sortableColumns)[0],
    dir: "DESC",
  },
  search: {
    column: Object.values(searchableColumns)[0],
    query: "",
  },
  filter: props.filter,
  page: 1,
  items_per_page: 10,
});

watch(() => props.filter, () => {
  args.filter = props.filter
})

const { data, refresh: query_refresh, status, pending, error } = $trpc.table[props.endpoint].useQuery(
  args
);

const refresh = async () => {
  await query_refresh();
  
  checkedIds.value = checkedIds.value.filter(
    (checked_id) =>
      rows.value.find(
        (row_x: {id: string}) =>
          checked_id == row_x.id
      )
  )
}

watch(error, (error) => {
  if (error) $toast.error(`Error loading table: ${error}`);
});

const rows = computed(() => {
  if (!data.value) return [];
  return data.value.rows;
});
const total = computed(() => {
  if (!data.value) return 0;
  return data.value.total;
});

defineExpose({
  refresh,
  total,
  pending,
});

const sortClick = async (colname: string) => {
  const dir =
    args.sort && args.sort.column === colname && args.sort.dir === "ASC" ? "DESC" : "ASC";
  args.sort.column = colname;
  args.sort.dir = dir;

  refresh();
};

watch(
  () => [args.search.query, args.search.column],
  async () => {
    args.page = 1;
    refresh();
  }
);

const setPage = async (new_page: number) => {
  args.page = Math.max(1, new_page);
  refresh();
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

const allCheckbox = computed({
  get() {
    return rows.value.length > 0 && checkedIds.value.length === rows.value.length;
  },
  set(checked: boolean) {
    checkedIds.value = [];
    if (checked) {
      for (const row of rows.value) checkedIds.value.push(row.id);
    }
  },
});

const confirm = useConfirm();
const deleteSelected = (selectedIds: string[]) => {
  const numberOfRows = selectedIds.length;
  confirm.require({
      group: 'headless',
      header: "Are you sure?",
      message: `You are about to delete ${numberOfRows} row${numberOfRows > 1 ? 's' : ''}`,
      accept: () => {
        emit("removeRows", selectedIds, async (promises) => {
          await Promise.all(promises);
          await refresh();
          $toast.success(`Item${promises.length > 0 ? 's' : ''} succesfully removed`)
        }); 
      },
      reject: () => { }
  });
};

const deleteAll = () => {
  confirm.require({
        group: 'headless',
        header: "Are you sure?",
        message: "You are about to delete all rows, you won't be able to revert this",
        accept: () => {
          emit("removeAllRows", async (promise) => {
            await promise;
            await refresh();
            $toast.success("All items succesfully removed")
          });
        },
        reject: () => { }
    });
};
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
    @apply z-10 px-3 py-2 leading-tight text-primary border border-secondary-low bg-secondary hover:bg-secondary-high;
  }
}

.spinner_svg {
  transform-origin: center;
  animation: spinner_AtaB 0.75s infinite linear;
}
@keyframes spinner_AtaB {
  100% {
    transform: rotate(360deg);
  }
}
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
