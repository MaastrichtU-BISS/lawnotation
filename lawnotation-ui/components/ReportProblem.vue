<template>
    <ConfirmPopup>
        <template #container="{ message }">
            <div class="rounded-lg drop-shadow-2xl shadow-inner p-6">
                <button @click="closePopup()"
                    class="absolute top-2 right-2 text-gray-800 hover:text-gray-600 focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div>
                    <p class="mb-2">Please add an issue to
                        <a href="https://github.com/MaastrichtU-BISS/lawnotation/issues" target="_blank"
                            class="text-blue-600 underline hover:text-blue-800">our GitHub</a> or
                    </p>
                    <p class="mb-0">send us an email at
                        <a href="mailto:biss-devs@maastrichtuniversity.nl"
                            class="text-blue-600 underline hover:text-blue-800">biss-devs@maastrichtuniversity.nl</a>
                    </p>
                </div>
            </div>
        </template>
    </ConfirmPopup>

    <Button @click="openPopup($event)" label="Report problem" outlined
        class="bg-white !fixed bottom-2 right-2 z-50 w-24 h-10 text-xs font-light text-primary-500 border border-primary-500 hover:scale-110 hover:bg-white">
        <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
                <path
                    d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439l-1.475.31V2.75Z" />
            </svg>
        </template>
    </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmPopup from 'primevue/confirmpopup';
import Button from 'primevue/button';

const confirm = useConfirm();
const isVisible = ref(false);
const openPopup = (event: Event) => {
    if (isVisible.value === false) {
        confirm.require({
            target: event.currentTarget as HTMLElement,
        });
        isVisible.value = true;
    } else {
        closePopup();
    }
}

const closePopup = () => {
    confirm.close();
    isVisible.value = false;
};
</script>