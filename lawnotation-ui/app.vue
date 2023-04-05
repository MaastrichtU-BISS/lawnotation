<template>
  <div>
    <h3>Lawnotation</h3>
  </div>
</template>
<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'
const config = useRuntimeConfig();

onMounted(() => {
  const supabase = createClient(config.apiUrl, config.apiAnonKey)
  console.log(supabase)
})

</script>
