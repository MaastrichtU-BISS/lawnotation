import type { Document } from "~/types";
import type { Doc } from "~/types/archive";
import type { ImportedDocument } from "vue-legal-docs-import";

type DocumentUploadDeps = {
	projectId: number;
	trpc: any;
	toast: { error: (msg: string) => void; success: (msg: string) => void };
	closeModal: () => void;
	refreshDocuments: () => void;
};

export const useDocumentUpload = ({
	projectId,
	trpc,
	toast,
	closeModal,
	refreshDocuments,
}: DocumentUploadDeps) => {
	const uploadDocsProgress = ref({
		loading: false,
		current: 0,
		total: 0,
		message: "Uploading documents",
	});

	const saveDocuments = async (newDocs: Omit<Document, "id" | "hash">[]) => {
		for (const doc of newDocs) {
			try {
				await trpc.document.create.mutate({ document: doc });
				uploadDocsProgress.value.current++;
			} catch (e) {
				toast.error(`Error uploading document ${doc.name}: ${(e as Error)?.message ?? "unknown error"}`);
			}
		}

		refreshDocuments();
		toast.success(`${uploadDocsProgress.value.current} document(s) uploaded!`);
		uploadDocsProgress.value.loading = false;
	};

	// The documents arrive already read: plain text in the browser, other
	// formats parsed on the server (see UploadDocumentsModal). Named after the
	// file they came from, extension included, as documents always have been.
	const uploadDocuments = async (documents: ImportedDocument[]) => {
		uploadDocsProgress.value.loading = true;
		uploadDocsProgress.value.total = documents.length;
		uploadDocsProgress.value.current = 0;
		closeModal();

		await saveDocuments(
			documents.map((doc) => ({
				name: doc.source,
				source: "local_upload",
				full_text: doc.full_text,
				project_id: projectId,
			})),
		);
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
