<script setup lang="ts">
import Header from '@/components/Header.vue'
</script>
<template>
  <div>
    <Header></Header>
    <div id="breadcrumb-holder"></div>
    <slot />
  </div>
</template>
<style>
</style>