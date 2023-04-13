<template>
  <div>
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
const supabase = useSupabaseClient();

type Id = number;

const route = useRoute();
const task = ref();
const labels = reactive<{ name: string; color: string }[]>([]);
const annotations = reactive<{ result: any; id: Id }[]>([]);
const label_studio = ref();

const fetchTask = async (id: string) => {
  const { data, error } = await supabase.from("tasks").select().eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("TASK: ", data);
    task.value = data[0];
    fetchLabels(task.value.label_id);
  }
};

const fetchLabels = async (id: string) => {
  const { data, error } = await supabase.from("labels").select().eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("LABELS: ", data);
    for (const label of data[0].data) labels.push(label);
    fetchAnnotations(task.value.id);
  }
};

const fetchAnnotations = async (id: string) => {
  const { data, error } = await supabase.from("annotations").select().eq("task_id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("ANNOTATIONS: ", data);
    data.map((ann) => {
      annotations.push({ result: ann.result, id: ann.id });
    });
    initLS();
  }
};

const createAnnotation = async (new_ann: JSON) => {
  const { data, error } = await supabase
    .from("annotations")
    .insert([{ task_id: task.value.id, data: new_ann }]);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("ANNOTATION: ", data);
  }
};

const updateAnnotation = async (id: number, new_ann: JSON) => {
  const { data, error } = await supabase
    .from("annotations")
    .update({ result: new_ann })
    .eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("ANNOTATION: ", data);
  }
};

const initLS = async () => {
  const LabelStudio = (await import("@heartexlabs/label-studio")).default;

  label_studio.value = new LabelStudio("label-studio", {
    config: `
            <View style="display: flex;">
              <View style="width: 150px; background: #f1f1f1; border-radius: 3px">
                <Filter name="fl" toName="label" hotkey="shift+f" minlength="1" />
                <Labels style="padding-left: 2em; margin-right: 2em;" name="label" toName="text">
                  ${labels
                    .map((l) => `<Label value="${l.name}" background="${l.color}" />`)
                    .join("\n")}
                </Labels>
              </View>

              <View>
                <View style="height: auto; overflow-y: auto; padding: 0 1em">
                  <Text name="text" value="$text" />
                </View>

              <Relations>
                <Relation value="Is A" />
                <Relation value="Has Function" />
                <Relation value="Involved In" />
                <Relation value="Related To" />
              </Relations>

                <View>
                  <Choices name="relevance" toName="text" perRegion="true">
                    <Choice value="Relevant" />
                    <Choice value="Non Relevant" />
                  </Choices>

                  <View visibleWhen="region-selected">
                    <Header value="Your confidence" />
                  </View>
                  <Rating name="confidence" toName="text" perRegion="true" />
                </View>
              </View>
            </View>
            `,
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
      "instruction",
      "side-column",
      "annotations:history",
      "annotations:tabs",
      "annotations:menu",
      "annotations:current",
      "annotations:add-new",
      "annotations:delete",
      "annotations:view-all",
      "predictions:tabs",
      "predictions:menu",
      "auto-annotation",
      "edit-history",
    ],
    user: {
      pk: 1,
      firstName: "James",
      lastName: "Dean",
    },
    task: {
      annotations: annotations,
      // predictions: this.predictions,
      data: {
        text: task.value.text,
      },
    },
    onLabelStudioLoad: (LS: any) => {
      if (annotations.length) {
        LS.annotationStore.selectAnnotation(LS.annotationStore.annotations);
      } else {
        const c = LS.annotationStore.addAnnotation({
          userGenerate: true,
        });
        LS.annotationStore.selectAnnotation(c.id);
      }
    },
    onSubmitAnnotation: (LS: any, annotation: any) => {
      createAnnotation(annotation.serializeAnnotation());
    },
    onUpdateAnnotation: (LS: any, annotation: any) => {
      // console.log(LS);
      // console.log(annotation.serializeAnnotation());
      updateAnnotation(annotation.pk, annotation.serializeAnnotation());
    },
  });
};

onMounted(() => {
  fetchTask(route.params.task_id as string);
});

definePageMeta({
  middleware: ["auth"],
});
</script>
