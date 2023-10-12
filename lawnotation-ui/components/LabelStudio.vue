<template>
  <div id="label-studio-container" class="p-4 h-full">
    <div id="label-studio" class="h-full"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
import {
  LSSerializedRelation,
  Assignment,
  LsLabels,
  LSSerializedAnnotations,
} from "~/types";

const { $trpc } = useNuxtApp();

const label_studio = ref();

const emit = defineEmits(["previousAssignment", "nextAssignment"]);

const props = defineProps<{
  user: any;
  assignment: Assignment | undefined;
  annotations: LSSerializedAnnotations | undefined;
  relations: LSSerializedRelation[] | undefined;
  text: string | undefined;
  labels: LsLabels | undefined;
  isEditor: boolean | undefined;
  guidelines: string | undefined;
  // mode: "annotator.annotate" | "annotator.lookback" | "editor.check";
}>();

const serializeLSAnnotations = () => {
  return label_studio.value.store.annotationStore.annotations.map((a: any) =>
    a.serializeAnnotation()
  )[0];
};

const clickPrevious = async () => {
  emit("previousAssignment");
};

const clickNext = async () => {
  if (!props.assignment) return;

  const serializedAnnotations: any[] = serializeLSAnnotations();

  const pos_rating: number = serializedAnnotations.findIndex((x) => x.type == "rating");
  let rating: number = props.assignment.difficulty_rating;
  if (pos_rating >= 0) {
    rating = serializedAnnotations[pos_rating].value.rating;
    serializedAnnotations.splice(pos_rating, 1);
  }

  if (
    props.assignment.status !== "done" &&
    serializedAnnotations.length === 0 &&
    !confirm(
      "No annotations were made in this document.\nAre you sure you want to continue?"
    )
  ) {
    return;
  }

  await updateAnnotationsAndRelations(serializedAnnotations);
  await $trpc.assignment.update.mutate({
    id: props.assignment.id,
    updates: {
      status: "done",
      difficulty_rating: rating,
    },
  });
  emit("nextAssignment");
};

const initLS = async () => {
  // Following is to prevent error:
  const script = document.createElement("script");
  script.src = "data:text/javascript,void(0);";
  document.body.appendChild(script);

  // @ts-expect-error
  const LabelStudio = (await import("@heartexlabs/label-studio")).default;
  label_studio.value = new LabelStudio("label-studio", {
    config: `
                <View style="display: grid; grid-template-columns: min-content 1fr; grid-template-rows: 1fr min-content; height: 100%; min-height: 0;">
                  <View style="width: 150px; background: #f1f1f1; border-radius: 3px; padding: .3em; overflow-y: auto;">
                    <Filter name="fl" toName="label" hotkey="shift+f" minlength="1" />
                    <Labels style="padding-left: 2em; margin-right: 2em;" name="label" toName="text">
                      ${props.labels
                        ?.map(
                          (l) =>
                            `<Label value="${l.name}" background="${l.color}" style="display: inline-table"/>`
                        )
                        .join("\n")}
                    </Labels>
                  </View>
                  <View style="width: 100%">
                    <View style="height: auto; overflow-y: auto; padding: 0 1.7em 1em;">
                      <Text name="text" value="$text" />
                    </View>
                    <Relations>
                      <Relation value="Is a" />
                      <Relation value="Has a" />
                      <Relation value="Implies" />
                      <Relation value="Depends on" />
                      <Relation value="Belongs to" />
                      <Relation value="Related to" />
                      <Relation value="Is not" />
                      <Relation value="Part of" />
                    </Relations>
                  </View>
                  <View style="padding: .7em; border-top: 1px solid rgba(0,0,0,.1);  grid-column: span 2;">
                    <Header style="margin-bottom: 0; margin: 0px; user-select: none;" value="Confidence (1=not confident at all, 5=very confident)"/>
                    <Rating value="$diff-rating" toName="rating" name="rating" maxRating="5" icon="star" size="medium" />
                  </View>
                </View>
                `,
    description: `<html><pre>${props.guidelines}</pre></html>`,
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
      "topbar:prevnext",
      props.isEditor ? "review" : "",
      "instruction",
      "side-column",
      // "ground-truth",
      // "annotations:history",
      // "annotations:tabs",
      // "annotations:menu",
      "annotations:current",
      "annotations:add-new",
      "annotations:delete",
      // "annotations:view-all",
      // "predictions:tabs",
      // "predictions:menu",
      // "auto-annotation",
      "edit-history",
    ],
    user: {
      pk: 1,
      firstName: props.user.value?.email,
      // lastName: "Dean",
    },
    task: {
      annotations: props.annotations?.length
        ? [{ result: (props.annotations as any).concat(props.relations) }]
        : [],
      // predictions: this.predictions,
      data: {
        text: props.text,
        diff_rating: props.assignment?.difficulty_rating,
      },
    },
    onLabelStudioLoad: (LS: any) => {
      LS.settings.showLabels = true;
      if (props.annotations?.length) {
        LS.annotationStore.selectAnnotation(LS.annotationStore.annotations);
      } else {
        const c = LS.annotationStore.addAnnotation({
          userGenerate: true,
        });
        LS.annotationStore.selectAnnotation(c.id);
      }
    },
    onRejectAnnotation() {},

    // 'back'
    onSkipTask() {
      clickPrevious();
    },
    // 'next'
    onSubmitAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotations }
    ) => {
      clickNext();
    },
    onAcceptAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotations }
    ) => {
      clickNext();
    },
    onAcceptAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      clickNext();
    },
    onUpdateAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotations }
    ) => {
      clickNext();
    },
  });
};

const updateAnnotationsAndRelations = async (serializedAnnotations: any[]) => {
  if (!props.assignment) return;

  // create annotations
  const ls_anns = serializedAnnotations.filter((x) => x.type == "labels");
  const db_anns = convert_annotation_ls2db(ls_anns, props.assignment?.id);
  const created_anns = await $trpc.annotation.updateAssignmentAnnotations.mutate({
    assignment_id: props.assignment?.id,
    annotations: db_anns,
  });

  if (!created_anns) return;

  // create relations
  const ls_rels = serializedAnnotations.filter((x) => x.type == "relation");

  ls_rels.map((rel) => {
    let from = -1;
    let to = -1;
    for (let i = 0; i < created_anns.length; ++i) {
      if (created_anns[i].ls_id == (rel as LSSerializedRelation).from_id)
        from = created_anns[i].id;

      if (created_anns[i].ls_id == (rel as LSSerializedRelation).to_id)
        to = created_anns[i].id;
    }
    $trpc.relation.create.mutate({
      fields: rel as LSSerializedRelation,
      from_id: from,
      to_id: to,
    });
  });
};

function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) {
      return resolve(el);
    }

    const observer = new MutationObserver((mutations) => {
      const ob_el = document.querySelector(selector);
      if (ob_el) {
        resolve(ob_el);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

onMounted(() => {
  initLS();

  waitForElement('.lsf-button[aria-label="skip-task"]').then(
    (el) => (el.innerHTML = "Back")
  );
  waitForElement('.lsf-button[aria-label="submit"]').then(
    (el) => (el.innerHTML = "Next")
  );
  waitForElement(".ant-rate").then((el) => {
    if (props.assignment?.difficulty_rating! < 1) return;
    (document
      .getElementsByClassName("ant-rate-star-zero")
      .item(props.assignment?.difficulty_rating! - 1)
      ?.firstChild as HTMLButtonElement).click();
  });
});
</script>
<style>
#label-studio {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.lsf-richtext {
  margin-top: 1.5rem;
}

.lsf-current-task {
  display: none;
}

.lsf-topbar__section {
  border-left: none !important;
  padding: 0 !important;
  margin-left: 0;
}

[aria-label="Reset"],
[aria-label="Copy Annotation"],
[aria-label="Settings"],
[aria-label="Delete"],
.lsf-annotations-list {
  display: none;
}

/* [aria-label="skip-task"], */
[aria-label="reject-annotation"] {
  order: 1;
}

/* [aria-label="skip-task"]:first-child, */
[aria-label="reject-annotation"]:first-child {
  visibility: hidden;
}

/* [aria-label="skip-task"]::after {
  content: "Back";
  margin-left: -40px;
  visibility: visible;
}
*/

[aria-label="reject-annotation"]::after {
  content: "Reject";
  margin-left: -40px;
  visibility: visible;
}

.lsf-labels {
  overflow-y: auto;
}

.lsf-label__text {
  white-space: pre-wrap;
  /* word-break: break-all; */
}

.lsf-label {
  display: inline-table;
  margin: 0px 8px 8px 0px !important;
}

.lsf-tooltip {
  display: none !important;
}

.ls-common {
  min-height: 0;
}

.main-content-wrapper--1qjJ0 {
  min-height: 0;
}

.lsf-main-view {
  min-height: 0;
}

.lsf-main-view__annotation {
  padding: 0;
  height: 100%;
}

sup {
  display: none;
}

.lsf-main-view__infobar {
  display: none;
}

.lsf-entity__info {
  display: none;
}
</style>
