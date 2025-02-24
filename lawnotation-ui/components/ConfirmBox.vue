<template>
    <ConfirmDialog group="headless">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-col items-center p-5 bg-surface-0 rounded-md">
                <div
                    class="rounded-full bg-primary-500 text-surface-0 inline-flex justify-center items-center h-[6rem] w-[6rem] -mt-[3rem]">
                    <i class="pi pi-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-0">{{ message.message }}</p>
                <div class="flex items-center gap-2 mt-4">
                    <Button :label="message.rejectLabel ?? 'No, cancel'" class="mr-6" size="small" icon="pi pi-times" iconPos="right" outlined
                        @click="rejectCallback" />
                    <Button :label="message.acceptLabel ?? 'Yes, delete'" severity="danger" icon="pi pi-check" size="small" iconPos="right" @click="acceptCallback" />
                </div>
            </div>
        </template>
    </ConfirmDialog>
</template>
