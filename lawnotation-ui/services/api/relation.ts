import { Annotation } from '~/types';
import crud_api from './common/crud';
import { AnnotationRelation, LSSerializedRelation } from "@/types/relation"

const relationApiService = {
  ...crud_api<AnnotationRelation>()('/api/relation'),

  create: async (fields: LSSerializedRelation, from_id: number, to_id: number) => {
    const data = await $fetch('/api/relation', {
      method: 'POST',
      body: {
        fields,
        from_id,
        to_id
      }
    });

    if (typeof data === "undefined")
      throw Error('Method relation.create did not return any data')
    return data;
  },

  findFromAnnotationIds: async (annotation_ids: Annotation['id'][]) => {
    const data = await $fetch(`/api/relation/findFromAnnotationIds/${ annotation_ids.join(',') }`, { method: 'GET' });

    if (typeof data === "undefined")
      throw Error('Method findFromAnnotationIds did not return any data')
    return data;
  },

}

export default relationApiService;