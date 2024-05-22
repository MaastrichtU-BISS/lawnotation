export type Crumb = {
  name: string,
  link: string,
}

export type Breadcrumb = Crumb[];

const breadcrumb = ref<Breadcrumb>([]);

export const useBreadcrumb = () => {
  const setBreadcrumb = (_breadcrumb: Breadcrumb) => {
    breadcrumb.value = _breadcrumb;
  }

  return {
    setBreadcrumb,
    breadcrumb
  };
}