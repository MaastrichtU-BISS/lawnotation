<template>
  <div class="relative overflow-x-auto sm:rounded-lg">
    <table class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <slot name="head"></slot>
      </thead>
      <tbody>
        <slot name="body"></slot>
      </tbody>
    </table>

    <nav v-if="pagination" class="pagination-holder flex items-center justify-between pt-4" aria-label="Table navigation">
      <span class="text-sm font-normal text-gray-500">
        Showing <span class="font-semibold text-gray-900">{{ visible_start_i }} - {{ visible_end_i }}</span>
        of <span class="font-semibold text-gray-900">{{ tabledata.total }}</span>
      </span>
      <ul class="inline-flex items-center -space-x-px">
        <li>
          <button @click="props.tabledata.page != 1 && setPage(1)" :disabled="props.tabledata.page == 1" class="pagination-item-default ml-0 rounded-l-lg">
            <span class="sr-only">First</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
        </li>
        <li>
          <button @click="props.tabledata.page > 1 && setPage(props.tabledata.page-1)" :disabled="props.tabledata.page == 1" class="pagination-item-default ml-0">
            <span class="sr-only">Previous</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </li>

        <li v-for="page_start in range(Math.max(1, props.tabledata.page-2), props.tabledata.page-1)">
          <button @click="setPage(page_start)" class="pagination-item-default">
            {{ page_start }}
          </button>
        </li>
        
        <li>
          <button href="#" aria-current="page" class="pagination-item-active">
            {{ props.tabledata.page }}
          </button>
        </li>

        <li v-if="props.tabledata.page !== total_pages" v-for="page_end in range(Math.min(total_pages, props.tabledata.page+1), Math.min(props.tabledata.page+2, total_pages))">
          <button @click="setPage(page_end)" class="pagination-item-default">
            {{ page_end }}
          </button>
        </li>

        <li>
          <button @click="props.tabledata.page < total_pages && setPage(props.tabledata.page+1)" :disabled="props.tabledata.page == total_pages" class="pagination-item-default">
            <span class="sr-only">Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>

          </button>
        </li>
        <li>
          <button @click="props.tabledata.page != total_pages && setPage(total_pages)" :disabled="props.tabledata.page == total_pages" class="pagination-item-default ml-0 rounded-r-lg">
            <span class="sr-only">Last</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </li>
      </ul>
    </nav>

    
  </div>

</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  pagination: boolean,
  // items_per_page: 
  // search: boolean,
  tabledata: TableData<any>
}>(), {
  pagination: true,
  // search: false,
});

export type TableData<T> = {
  total: number,
  rows: T[],
  page: number,
  items_per_page: number,
  loading: boolean,
  load: () => void
}

const setPage = (page: number) => {
  props.tabledata.page = Math.max(1, page);
  props.tabledata.load()
}

const visible_start_i = computed(() => {
  return ((props.tabledata.page-1) * props.tabledata.items_per_page)+1
})
const visible_end_i = computed(() => {
  return visible_start_i.value + props.tabledata.rows.length - 1
})

const total_pages = computed(() => {
  return Math.max(1, Math.ceil(props.tabledata.total / props.tabledata.items_per_page));
})

const range = (from: number, to: number): number[] => {
  const arr = [];
  for (let i = from; i <= to; i++) {
    arr.push(i);
  }
  return arr;
}

onMounted(() => {
  props.tabledata.load();
})

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