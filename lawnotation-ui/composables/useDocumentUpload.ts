import type { Document } from "~/types";
import type { Doc } from "~/types/archive";

type UploadEvent = { files: File | File[] | FileList };

type DocumentUploadDeps = {
	projectId: number;
	trpc: any;
	toast: { error: (msg: string) => void; success: (msg: string) => void };
	closeModal: () => void;
	refreshDocuments: () => void;
	documentSizeLimitPdf: number;
};

export const useDocumentUpload = ({
	projectId,
	trpc,
	toast,
	closeModal,
	refreshDocuments,
	documentSizeLimitPdf,
}: DocumentUploadDeps) => {
	const uploadDocsProgress = ref({
		loading: false,
		current: 0,
		total: 0,
		message: "Uploading documents",
	});

	const normalizeFiles = (files: File | File[] | FileList): File[] => {
		if (Array.isArray(files)) return files;
		if (files instanceof FileList) return Array.from(files);
		return [files];
	};

	const getBase64 = (file: File) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result);
			reader.onerror = (error) => reject(error);
		});
	};

	const saveDocuments = async (
		newDocs: Omit<Document, "id" | "hash">[],
		preprocess = false,
	) => {
		for (const doc of newDocs) {
			try {
				await trpc.document.create.mutate({
					document: doc,
					preprocess,
				});
				uploadDocsProgress.value.current++;
			} catch {
				toast.error(`Error uploading document: ${doc.name}`);
			}
		}

		refreshDocuments();
		toast.success(`${uploadDocsProgress.value.current} document(s) uploaded!`);
		uploadDocsProgress.value.loading = false;
	};

	const uploadDocuments = async (event: UploadEvent) => {
		const files = normalizeFiles(event.files);
		const newDocs: Omit<Document, "id" | "hash">[] = [];

		uploadDocsProgress.value.loading = true;
		uploadDocsProgress.value.total = files.length;
		uploadDocsProgress.value.current = 0;
		closeModal();

		for (const file of files) {
			if (
				file.size > documentSizeLimitPdf &&
				(file.name.endsWith(".pdf") ||
					file.name.endsWith(".doc") ||
					file.name.endsWith(".docx"))
			) {
				toast.error(
					`File ${file.name} exceeds the 4mb limit for .pdf, .doc, .docx files.`,
				);
				continue;
			}

			const format = file.name.split(".").pop() as DocumentFormats;
			let fullText = "";

			if (format == DocumentFormats.TXT || format == DocumentFormats.HTML) {
				fullText = await file.text();
			} else {
				fullText = (await getBase64(file)) as string;
			}

			newDocs.push({
				name: file.name,
				source: "local_upload",
				full_text: fullText,
				project_id: projectId,
			});
		}

		await saveDocuments(newDocs, true);
	};

	const onDocumentsFetched = async (docs: Doc[]) => {
		const newDocs: Omit<Document, "id" | "hash">[] = [];

		uploadDocsProgress.value.loading = true;
		uploadDocsProgress.value.total = docs.length;
		uploadDocsProgress.value.current = 0;
		closeModal();

		docs.forEach((doc) => {
			newDocs.push({
				name: doc.name,
				source: "rechtspraak",
				full_text: doc.content,
				project_id: projectId,
			});
		});

		await saveDocuments(newDocs);
	};

	return {
		uploadDocsProgress,
		uploadDocuments,
		onDocumentsFetched,
	};
};
