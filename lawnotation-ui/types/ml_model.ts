export type MlModel = {
    id: number;
    name: string;
    type: string;
    labelset_id?: number;
    annotation_level: 'word' | 'document';
}