import type { PreviewResponse, DocumentSummary } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${await response.text()}`);
  }
  return await response.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${await response.text()}`);
  }
}
export async function fetchDocument(docId: string): Promise<PreviewResponse> {
  const response = await fetch(`${API_BASE}/documents/${docId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${await response.text()}`);
  }
  return await response.json();
}

export async function uploadDocument(file: File): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload document: ${text}`);
  }

  return await response.json();
}

export async function updateNote(docId: string, note: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${docId}/note`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update note: ${await response.text()}`);
  }
}

export async function updateStickyNote(
  docId: string,
  sticky_note: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${docId}/sticky-note`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sticky_note }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update sticky note: ${await response.text()}`);
  }
}

async function handleDroppedFiles(files: FileList | null): Promise<void> {
  if (!files || files.length === 0) {
    return;
  }

  try {
    setIsLoading(true);
    setError("");

    const uploadedResults = await Promise.all(
      Array.from(files).map((file) => uploadDocument(file))
    );

    await loadDocuments();

    const lastUploaded = uploadedResults[uploadedResults.length - 1];
    if (lastUploaded?.document?.id) {
      setCurrentId(lastUploaded.document.id);
      setPreviewHtml(lastUploaded.html);
    }
  } catch (err) {
    console.error(err);
    setError(err instanceof Error ? err.message : "Failed to upload file.");
  } finally {
    setIsLoading(false);
  }
}

function handleDragOver(e: React.DragEvent<HTMLElement>) {
  e.preventDefault();
}

function handleDrop(e: React.DragEvent<HTMLElement>) {
  e.preventDefault();
  void handleDroppedFiles(e.dataTransfer.files);
}