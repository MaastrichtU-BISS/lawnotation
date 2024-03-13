<template>
  <Labelsets @add-labelset="navigateTo('/labelset/new')" @edit-labelset="(itemId) => navigateTo(`/labelset/${itemId}`)" />
</template>

<script setup lang="ts">
import Labelsets from "~/components/Labelsets.vue";

definePageMeta({
  middleware: ["auth"],
});
</script>
~/components/Labelsets.vue