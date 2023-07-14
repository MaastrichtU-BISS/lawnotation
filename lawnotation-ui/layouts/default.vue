<script setup lang="ts">
import Header from "@/components/Header.vue";
</script>

<template>
  <div>
    <Header></Header>
    <div id="breadcrumb-holder"></div>
    <div class="mx-auto max-w-screen-lg py-4">
      <slot />
    </div>
  </div>
</template>
