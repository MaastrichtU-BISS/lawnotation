const pageData = ref<Record<string, object>>();

export const usePage = <T extends Record<string, object>>() => {
    return pageData as Ref<T>;
}