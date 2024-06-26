<template>
    <transition v-if="isVisible" name="slide-fade" mode="out-in">
        <Fieldset :key="currentStep"  class="max-w-md mx-auto mb-4" :pt="{
            legend: {
                class: ['py-2 pb-0']
            },
            content: {
                class: ['py-2 px-3 pt-0']
            }
        }">
            <template #legend class="p-3">
                <div class="flex items-center text-sm gap-2 px-2">
                    <i class="pi pi-info-circle text-yellow-300 animate-bounce" />
                    <span class="font-bold">Step {{ panelData?.step }}</span>
                </div>
            </template>
            <span class="font-bold flex justify-center text-sm mb-2">{{ panelData?.title }}</span>
            <p class="m-0 text-xs mb-2">
                {{ panelData?.text }}
            </p>
            <Button label="Don't show again" link @click="hide" :pt="{
                root: {
                    class: ['text-xs', 'p-0', 'float-right', 'relative', 'items-center', 'inline-flex', 'text-center', 'align-bottom', 'justify-center', 'leading-[normal]', 'text-primary-600', 'bg-transparent', 'border-transparent', 'transition', 'duration-200', 'ease-in-out', 'cursor-pointer', 'overflow-hidden', 'select-none']
                }
            }" />
        </Fieldset>
    </transition>
</template>
<script setup lang="ts">
import { guidancePanel } from "~/utils/guidance";
import { GuidanceSteps } from "~/utils/enums";

const { $trpc } = useNuxtApp();
const user = useSupabaseUser();
const supa = useSupabaseClient();

const props = defineProps<{
    currentStep: GuidanceSteps
}>();

const panelData = computed(() => {
    if(props.currentStep == GuidanceSteps.NONE) return null;
    return {
        step: guidancePanel[props.currentStep].step,
        title: guidancePanel[props.currentStep].title,
        text: guidancePanel[props.currentStep].text
    }
});

const guidanceIsVisible = computed(() => {
    return user.value?.user_metadata?.guidanceStatus != false;
});

const isVisible = computed(() => {
    if(guidanceIsVisible.value == false) return false;
    if(props.currentStep == GuidanceSteps.NONE) return false;
    return true;
});

const hide = async () => {
    await $trpc.user.setGuidance.mutate(false);
    supa.auth.refreshSession();
};


</script>
<style scoped>
.slide-fade-enter-active {
  transition: all .3s ease;
}

.slide-fade-leave-active {
  transition: all .3s ease;
}

.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateX(10px);
  opacity: 0;
}
</style>