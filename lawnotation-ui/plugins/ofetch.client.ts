import { ofetch } from 'ofetch'

export default defineNuxtPlugin((nuxtApp) => {
  const token = useSupabaseToken()
  globalThis.$fetch = ofetch.create({ baseURL: '', headers: { ...(token.value && { Authorization: `Bearer ${token.value}` }), } })
})