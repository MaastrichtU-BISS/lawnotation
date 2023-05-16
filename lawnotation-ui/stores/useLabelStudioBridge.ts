import { defineStore } from 'pinia';
import * as mobx from 'mobx-state-tree'

type LSAnnotation = {
  id: string,
  pk: string,
  type: 
}

type LSAnnotationStore = {
  selected: 
}

type LSRegionStore = {
  selected: 
}


export const useLabelStudioBridge = defineStore("labelStudioBridge", () => {
  const annotationStore = ref<any>(null);

  const setMobxAnnotationStore = (mobxState: mobx.IModelType<any, any>) => {
    const x = mobx.getRoot(mobxState);

    // console.log("x, ", x);

    annotationStore.value = x;
  }

  return { annotationStore, setMobxAnnotationStore };
});