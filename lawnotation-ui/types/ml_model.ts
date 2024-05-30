import { AnnotationLevels } from "~/utils/enums";

export type MlModel = {
    id: number;
    name: string;
    type: string;
    labelset_id?: number;
    annotation_level: AnnotationLevels;
}