<script setup lang="ts">
import { ref } from 'vue';
import { useConfirm } from 'primevue/useconfirm'; 
import ConfirmPopup from 'primevue/confirmpopup';
import Button from 'primevue/button';

const confirm = useConfirm(); 
const isVisible = ref(false);

const openPopup = (event) => {
    confirm.require({
        target: event.currentTarget,
        onShow: () => {
            isVisible.value = true;
        },
        onHide: () => {
            isVisible.value = false;
        }
    });
};
</script>

<template>
    <ConfirmPopup>
        <template #container="{ message }">
            <div class="rounded-lg drop-shadow-2xl shadow-inner p-6">
                <div class="text-center">
                    <p>Please add an issue to 
                        <a href="https://github.com/MaastrichtU-BISS/lawnotation/issues" target="_blank" class="text-blue-600 underline hover:text-blue-800">our GitHub</a>
                    </p>
                    <p>or</p>
                    <p>Send us an email at 
                        <a href="mailto:biss-devs@maastrichtuniversity.nl" class="text-blue-600 underline hover:text-blue-800">biss-devs@maastrichtuniversity.nl</a>
                    </p>
                </div>
            </div>
        </template>
    </ConfirmPopup>

    <Button @click="openPopup($event)" label="Report problem" outlined class="fixed z-50 w-24 h-10 text-xs font-light text-primary-500 border border-primary-500 hover:bg-primary-300/20 transition duration-200 ease-in-out">
        <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
                <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439l-1.475.31V2.75Z" />
            </svg>
        </template>
    </Button>
</template>

<style>
.fixed{
    position: fixed;
    right: 10px;
    bottom: 10px;
}
</style>
