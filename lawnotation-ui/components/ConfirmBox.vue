
<template>
    <ConfirmDialog group="headless">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-col items-center p-5 bg-surface-0 dark:bg-surface-700 rounded-md">
                <div class="rounded-full bg-primary-500 dark:bg-primary-400 text-surface-0 dark:text-surface-900 inline-flex justify-center items-center h-[6rem] w-[6rem] -mt-[3rem]">
                    <i class="pi pi-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-0">{{ message.message }}</p>
                <div class="flex items-center gap-2 mt-4">
                    <Button label="Cancel" class="mr-6" size="small" icon="pi pi-times" iconPos="right" outlined @click="rejectCallback" />
                    <Button label="Save" icon="pi pi-check" size="small" iconPos="right" @click="acceptCallback" />
                </div>
            </div>
        </template>
    </ConfirmDialog>
    <Button 
        @click="requireConfirmation()" 
        :label="props.btn_label"
        :size="props.btn_size"
        :severity="props.btn_severity"
        :outlined="props.btn_outlined"
    />
</template>

<script setup lang="ts">
import { useConfirm } from "primevue/useconfirm";

const props = defineProps({
    header: {
        type: String,
        required: false,
        default: 'Are you sure?'
    },
    message: {
        type: String,
        required: false,
        default: 'Please confirm to proceed.'
    },
    btn_label: {
        type: String,
        required: false,
        default: 'Remove'
    },
    btn_size: {
        type: String,
        required: false,
        default: 'small'
    },
    btn_severity: {
        type: String,
        required: false,
        default: 'danger'
    },
    btn_outlined: {
        type: Boolean,
        required: false,
        default: true
    },
});

const confirm = useConfirm();
const emit = defineEmits(["onConfirm", "onCancel"]);

const requireConfirmation = () => {
    confirm.require({
        group: 'headless',
        header: props.header,
        message: props.message,
        accept: () => {
            emit("onConfirm");
        },
        reject: () => {
            emit("onCancel");
        }
    });
};
</script>
