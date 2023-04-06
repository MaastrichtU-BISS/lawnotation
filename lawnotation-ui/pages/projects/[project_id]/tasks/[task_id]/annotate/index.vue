<template>
  <div>
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import { createClient } from "@supabase/supabase-js";
import LabelStudio from "@heartexlabs/label-studio";

import "@heartexlabs/label-studio/build/static/css/main.css";
const config = useRuntimeConfig();
const supabase = createClient(config.apiUrl, config.apiAnonKey);

const route = useRoute();
const task = ref();
const labels = ref();
const annotations = ref([]);
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
  console.log(id);
  const { data, error } = await supabase.from("labels").select().eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("LABELS: ", data);
    labels.value = data[0].data;
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
    if (data[0]) annotations.value = data[0].data;
    initLS();
  }
};

const initLS = () => {
  label_studio.value = new LabelStudio("label-studio", {
    config: `
            <View style="display: flex;">
              <View style="width: 150px; background: #f1f1f1; border-radius: 3px">
                <Filter name="fl" toName="label" hotkey="shift+f" minlength="1" />
                <Labels style="padding-left: 2em; margin-right: 2em;" name="label" toName="text">
                  ${labels.value
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
      annotations: annotations.value,
      // predictions: this.predictions,
      data: {
        text: task.value.text,
      },
    },
    onLabelStudioLoad: (LS) => {
      if (annotations.value.length) {
        LS.annotationStore.selectAnnotation(LS.annotationStore.annotations);
      } else {
        const c = LS.annotationStore.addAnnotation({
          userGenerate: true,
        });
        LS.annotationStore.selectAnnotation(c.id);
      }
    },
    onSubmitAnnotation: (LS, annotation) => {},
    onUpdateAnnotation: (LS, annotation) => {},
  });
};

onMounted(() => {
  fetchTask(route.params.task_id as string);
});
</script>
