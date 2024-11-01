<template>
    <slot />
</template>

<script setup>
const route = useRoute();
useHead(() => ({
    link: [
        {
            rel: 'canonical',
            href: 'https://app.lawnotation.org' + route.path,
        },
    ],
}))
</script>