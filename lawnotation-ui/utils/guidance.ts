export enum GuidanceSteps {
  NONE = '',
  CREATE_PROJECT = "create_project",
  VIEW_PROJECT = "view_project",
  UPLOAD_DOCUMENTS = "upload_documents",
  CREATE_TASK = "create_task",
  ASSIGN_ANNOTATORS = "assign_annotators",
}

export const guidancePanel = {
  create_project: {
    title: "Create your first project",
    text: "The first step is to create a new project. To do that, click on the highlighted button and fill in the form.",
    step: 1
  },
  view_project: {
    title: "Go to the newly created project",
    text: "Now that you have a project, click on the highlighted button to continue.",
    step: 2
  },
  upload_documents: {
    title: "Upload dataset",
    text: "Before you can create a task, first you need to upload your dataset. To do so, click on the highlighted button and follow the instructions.",
    step: 3
  },
  create_task: {
    title: "Create a new task",
    text: "Now that you have documents, you can create a task by clicking on the highlighted button.",
    step: 4
  },
  assign_annotators: {
    title: "Assign annotators",
    text: "The task is ready, all that remains is to assign annotators to the documents. Click on the highlighted button to go to the last step.",
    step: 5
  },
};
