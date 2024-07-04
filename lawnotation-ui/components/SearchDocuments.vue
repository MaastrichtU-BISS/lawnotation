<template>
    <h3 class="mt-3 text-lg font-semibold text-center">Provide ECLIs</h3>
    <div class="mx-auto md:w-1/2">
        <h3 class="my-3 text-sm font-semibold">
            ECLIs provided: {{ eclis.length }}
        </h3>
        <Chips v-model="eclis" separator="," addOnBlur :pt="{
            input: {
                'data-test': 'eclis'
            }
        }" />
        <div class="my-4 text-center">
            <Button type="button" @click="download" label="Download" icon="pi pi-download" iconPos="right"
                :disabled="!eclis.length" data-test="download-button" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const { $toast, $trpc } = useNuxtApp();

const eclis = ref<string[]>([]);

// ECLI:NL:RBLIM:2023:7197

const download = async () => {
    const response = await $trpc.archive.getXMLFromRechtspraak.query(eclis.value);
    console.log(response);
}
</script>