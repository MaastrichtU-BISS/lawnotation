import type { NitroFetchRequest } from 'nitropack'
import type { KeyOfRes } from 'nuxt/dist/app/composables/asyncData'
import type { UseFetchOptions } from '#app'

type FetchOptions<T> = UseFetchOptions<
  T extends void ? unknown : T,
  (res: T extends void ? unknown : T) => T extends void ? unknown : T //,
  // KeyOfRes<(res: T extends void ? unknown : T) => T extends void ? unknown : T>
  >
| undefined

export async function request<T>(
  request: NitroFetchRequest,
  opts?: FetchOptions<T>,
) {
  if (process.server)
    return;

  const router = useRouter()
  // const config = useRuntimeConfig()
  const sess = await useSupabaseClient().auth.getSession();
  const token = sess.data.session?.access_token;

  const options: FetchOptions<T> = {
    ...opts,
    // baseURL: config.public.baseURL,
    onResponseError: ({ response }) => {
      if (response.status === 401)
        router.push('/auth/login');
    },
    server: false
  }
  if (token) {
    if (!options.headers)
      options.headers = {};
    
    Object.assign(
      options.headers,
      {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    )
  }

  // return useFetch<T>(request, options)
  return $fetch<T>(request, options)
}

export default request