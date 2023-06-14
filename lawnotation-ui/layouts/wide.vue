<script setup lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
</script>
<template>
  <div>
    <Header></Header>
    <div id="breadcrumb-holder"></div>
    <slot />
    <Footer></Footer>
  </div>
</template>
<style>
</style>