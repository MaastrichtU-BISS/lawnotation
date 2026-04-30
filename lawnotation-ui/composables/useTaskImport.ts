import type {
	Annotation,
	AnnotationRelation,
	Assignment,
	Document,
	Task,
	User,
} from "~/types";
import { AssignmentStatuses, Origins } from "~/utils/enums";

export type TaskImportPayload = {
	json: any;
	annotators: string[];
	assignmentStatus: AssignmentStatuses;
	defaultLabelsetId: number;
};

type TaskImportDeps = {
	projectId: number;
	userId: string | null | undefined;
	trpc: any;
	toast: { error: (msg: string) => void; success: (msg: string) => void };
	refreshTaskTable: () => void;
	refreshDocumentTable: () => void;
};

export const useTaskImport = ({
	projectId,
	userId,
	trpc,
	toast,
	refreshTaskTable,
	refreshDocumentTable,
}: TaskImportDeps) => {
	const importProgress = ref({
		loading: false,
		current: 0,
		total: 0,
		message: "Creating Task",
	});

	const importTask = async (payload: TaskImportPayload) => {
		const { json, annotators, assignmentStatus, defaultLabelsetId } = payload;
		importProgress.value.loading = true;
		importProgress.value.message = "Creating Task";
		importProgress.value.total = 0;
		importProgress.value.current = 0;

		try {
			importProgress.value.message = "Creating Labelset";
			let newLabelsetId = defaultLabelsetId;
			if (json.labelset) {
				newLabelsetId = (
					await trpc.labelset.create.mutate({
						editor_id: userId,
						...json.labelset,
					})
				).id;
			}

			importProgress.value.message = "Creating Task";
			const newTask: Omit<Task, "id"> = {
				project_id: projectId,
				name: json.name ?? "Blank",
				desc: json.desc ?? "Blank",
				ann_guidelines: json.ann_guidelines ?? "Blank",
				labelset_id: newLabelsetId,
				annotation_level: json.annotation_level ?? "word",
				ml_model_id: json.ml_model_id ?? undefined,
			};

			const task = await trpc.task.create.mutate(newTask);

			if (json.documents) {
				importProgress.value.message = "Creating Documents";
				importProgress.value.total = json.documents.length;
				importProgress.value.current = 0;

				const documentIds: number[] = [];

				for (const doc of json.documents as Omit<Document, "id">[]) {
					const uploadedDoc = await trpc.document.create.mutate({
						document: {
							name: doc.name,
							full_text: doc.full_text,
							source: Origins.IMPORTED,
							project_id: projectId,
						},
					});

					documentIds.push(uploadedDoc.id);
					importProgress.value.current++;
				}

				importProgress.value.total = 0;
				importProgress.value.current = 0;
				refreshDocumentTable();

				if (json.counts?.annotators && annotators.length) {
					importProgress.value.message = "Creating Annotators";

					const usersPromises: Promise<User["id"] | null>[] = [];
					annotators.forEach((email) => {
						if (!email || !email.length) {
							usersPromises.push(Promise.resolve(null));
						} else {
							usersPromises.push(
								trpc.assignment.assignUserToTask.query({
									email,
									task_id: task.id,
								}),
							);
						}
					});

					const annotatorIds = await Promise.all(usersPromises);

					importProgress.value.message = "Creating Assignments";
					const newAssignments: Omit<Assignment, "id">[] = [];

					json.documents.forEach((d: any, i: number) => {
						d.assignments.forEach((ass: any) => {
							const annotatorId = annotatorIds[ass.annotator - 1] ?? null;

							const newAss: any = {
								document_id: documentIds[i],
								difficulty_rating: ass.difficulty_rating,
								seq_pos: ass.order,
								status:
									assignmentStatus == AssignmentStatuses.NONE
										? ass.status
										: assignmentStatus,
								annotator_number: ass.annotator,
								origin: Origins.IMPORTED,
							};

							if (annotatorId) {
								newAss.annotator_id = annotatorId;
							}

							newAssignments.push(newAss);
						});
					});

					const assignments = await trpc.assignment.createMany.mutate({
						task_id: task.id,
						assignments: newAssignments,
					});

					if (json.counts?.annotations) {
						importProgress.value.message = "Creating Annotations";
						const newAnnotations: Omit<Annotation, "id">[] = [];
						let assIndex = 0;

						json.documents.forEach((d: any) => {
							d.assignments.forEach((ass: any) => {
								const assignment = assignments[assIndex];
								if (!assignment) {
									assIndex++;
									return;
								}

								ass.annotations.forEach((ann: any) => {
									newAnnotations.push({
										start_index: ann.start,
										end_index: ann.end,
										label: ann.label,
										text: ann.text,
										assignment_id: assignment.id,
										origin: Origins.IMPORTED,
										ls_id: ann.ls_id,
										confidence_rating: ann.confidence_rating,
										html_metadata: ann.html_metadata,
									});
								});
								assIndex++;
							});
						});

						const annotations: any[] = [];
						const chunkSize = 100;
						for (let i = 0; i < newAnnotations.length; i += chunkSize) {
							const chunk = newAnnotations.slice(i, i + chunkSize);
							annotations.push(...(await trpc.annotation.createMany.mutate(chunk)));
						}

						importProgress.value.message = "Creating Relations";
						if (json.counts?.relations) {
							const newRelations: Omit<AnnotationRelation, "id">[] = [];
							let annIndex = 0;

							json.documents.forEach((d: any) => {
								d.assignments.forEach((ass: any) => {
									let currentAnn = 0;
									ass.annotations.forEach((ann: any) => {
										ann.relations.forEach((rel: any) => {
											newRelations.push({
												from_id: annotations[annIndex + currentAnn].id,
												to_id: annotations[annIndex + rel.to].id,
												labels: rel.labels,
												direction: rel.direction,
												ls_from: annotations[annIndex + currentAnn].ls_id,
												ls_to: annotations[annIndex + rel.to].ls_id,
											});
										});
										currentAnn++;
									});
									annIndex += currentAnn;
								});
							});

							for (let i = 0; i < newRelations.length; i += chunkSize) {
								const chunk = newRelations.slice(i, i + chunkSize);
								await trpc.relation.createMany.mutate(chunk);
							}
						}
					}
				}
			}

			toast.success("Task successfully imported!");
		} catch (error) {
			toast.error(`Error importing the Task! ${error}`);
		} finally {
			importProgress.value.loading = false;
			refreshTaskTable();
		}
	};

	return {
		importProgress,
		importTask,
	};
};
