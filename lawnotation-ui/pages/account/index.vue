<template>
  <div>
    <h3 class="my-6 text-xl font-semibold">Manage Account</h3>
    
    <div class="flex flex-col gap-2 w-1/2">
      <label for="username">Email</label>
      <InputText id="username" v-model="accountForm.email" />
      <Button :disabled="!formSaved" label="Save" />
    </div>

  </div>
</template>

<script lang="ts" setup>
const { $trpc } = useNuxtApp()

const accountData = await $trpc.user.me.query();
const accountForm = ref({
  email: accountData.email,
});
const formSaved = ref(true);
watch(accountForm.value, () => {
  formSaved.value = false;
})

</script>