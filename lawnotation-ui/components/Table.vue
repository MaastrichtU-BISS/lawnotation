<template>
  <div class="relative overflow-x-auto sm:rounded-lg">

    <div class="flex justify-end m-2" v-if="search">
      <select v-model="tabledata.search.column" class="block w-32 p-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500">
        <option v-for="[colname, col] of Object.entries(tabledata.columns).filter(x => x[1].search)" :value="col.field">{{ colname }}</option>
      </select>
      <div class="ml-2 block bg-white">
        <label for="table-search" class="sr-only">Search</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-5 h-5 text-gray-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path></svg>
          </div>
          <input v-model="tabledata.search.query" type="text" id="table-search" class="block text-gray-900 bg-gray-50 p-2 pl-10 text-sm w-80" placeholder="Search for items">
        </div>
      </div>
    </div>

    <table class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <!-- <slot name="head"></slot> -->
        <th
          scope="col"
          class="px-6 py-3"
          v-for="[colname, col] of Object.entries(tabledata.columns)"
        >
          <span class="flex">
            {{ colname }}
            <span class="ml-2 w-4 h-4 cursor-pointer" v-if="sort && col.field" @click="sortClick(col.field)">
              <svg v-if="!tabledata.sort || tabledata.sort.column !== col.field" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              <template v-else-if="tabledata.sort && tabledata.sort.column == col.field">
                <svg v-if="tabledata.sort.dir === 'ASC'" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <svg v-else-if="tabledata.sort.dir === 'DESC'" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.5 15.75l7.5-7.5 7.5 7.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </template>
            </span>
          </span>
        </th>
      </thead>
      <tbody>
        <slot name="row" v-for="item in tabledata.rows" :item="item" :key="item.id"></slot>
      </tbody>
    </table>

    <nav
      v-if="pagination"
      class="pagination-holder flex items-center justify-between pt-4"
      aria-label="Table navigation"
    >
      <span class="text-sm font-normal text-gray-500">
        Showing
        <span class="font-semibold text-gray-900"
          >{{ visible_start_i }} - {{ visible_end_i }}</span
        >
        of <span class="font-semibold text-gray-900">{{ tabledata.total }}</span>
      </span>
      <ul class="inline-flex items-center -space-x-px">
        <li>
          <button
            @click="props.tabledata.page != 1 && setPage(1)"
            :disabled="props.tabledata.page == 1"
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
            @click="props.tabledata.page > 1 && setPage(props.tabledata.page - 1)"
            :disabled="props.tabledata.page == 1"
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
            Math.max(1, props.tabledata.page - 2),
            props.tabledata.page - 1
          )"
        >
          <button @click="setPage(page_start)" class="pagination-item-default">
            {{ page_start }}
          </button>
        </li>

        <li>
          <button href="#" aria-current="page" class="pagination-item-active">
            {{ props.tabledata.page }}
          </button>
        </li>

        <li
          v-if="props.tabledata.page !== total_pages"
          v-for="page_end in range(
            Math.min(total_pages, props.tabledata.page + 1),
            Math.min(props.tabledata.page + 2, total_pages)
          )"
        >
          <button @click="setPage(page_end)" class="pagination-item-default">
            {{ page_end }}
          </button>
        </li>

        <li>
          <button
            @click="
              props.tabledata.page < total_pages && setPage(props.tabledata.page + 1)
            "
            :disabled="props.tabledata.page == total_pages"
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
            @click="props.tabledata.page != total_pages && setPage(total_pages)"
            :disabled="props.tabledata.page == total_pages"
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
</template>

<script setup lang="ts">
import { TableData } from '~/utils/table';

const supabase = useSupabaseClient();

const props = withDefaults(
  defineProps<{
    pagination?: boolean;
    sort?: boolean;
    search: boolean,
    // items_per_page:

    tabledata: TableData<any>;
  }>(),
  {
    pagination: true,
    sort: false,
    search: false,
  }
);

const sortClick = (colname: string) => {
  const dir = (props.tabledata.sort && props.tabledata.sort.column === colname) && props.tabledata.sort.dir === 'ASC' ? 'DESC' : 'ASC';
  props.tabledata.sort = {column: colname, dir}

  props.tabledata.load();
}

// const computedSearch = computed({
//   get() {
//     return props.tabledata.search === null ? "" : props.tabledata.search;
//   },
//   set(val) {
//     props.tabledata.search = (val === "" ? null : val);
//     props.tabledata.load()
//   }
// })

watch(() => props.tabledata.search.query, () => props.tabledata.load())

const setPage = (page: number) => {
  props.tabledata.page = Math.max(1, page);
  props.tabledata.load();
};

const visible_start_i = computed(() => {
  return (props.tabledata.page - 1) * props.tabledata.items_per_page + 1;
});
const visible_end_i = computed(() => {
  return visible_start_i.value + props.tabledata.rows.length - 1;
});

const total_pages = computed(() => {
  return Math.max(1, Math.ceil(props.tabledata.total / props.tabledata.items_per_page));
});

const range = (from: number, to: number): number[] => {
  const arr = [];
  for (let i = from; i <= to; i++) {
    arr.push(i);
  }
  return arr;
};

onMounted(() => {
  props.tabledata.load();
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
</style>
