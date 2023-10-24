const pageData = ref<Record<string, object>>();

export const usePage = <T extends Record<string, object>>() => {
    if (!pageData)
        throw new Error("Failed deconstructing page element")
    return pageData as Ref<T>;
}