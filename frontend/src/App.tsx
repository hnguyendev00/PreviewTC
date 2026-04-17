import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  deleteDocument,
  fetchDocument,
  fetchDocuments,
  updateNote,
  updateStickyNote,
  uploadDocument,
} from "./api";
import type { DocumentSummary } from "./types";

export default function App() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [filter, setFilter] = useState("");
  const [sortAscending, setSortAscending] = useState(true);
  const [stickyOpen, setStickyOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleDeleteDocument(
  e: React.MouseEvent<HTMLButtonElement>,
  docId: string
): Promise<void> {
  e.stopPropagation();

  const confirmed = window.confirm("Remove this file?");
  if (!confirmed) {
    return;
  }

  try {
    setError("");
    await deleteDocument(docId);

    const remainingDocs = documents.filter((doc) => doc.id !== docId);
    setDocuments(remainingDocs);

    if (currentId === docId) {
      if (remainingDocs.length > 0) {
        const nextDoc = remainingDocs[0];
        setCurrentId(nextDoc.id);
        const preview = await fetchDocument(nextDoc.id);
        setPreviewHtml(preview.html);
      } else {
        setCurrentId(null);
        setPreviewHtml("");
      }
    }
  } catch (err) {
    console.error(err);
    setError(err instanceof Error ? err.message : "Failed to delete file.");
  }
}

  async function loadDocuments(): Promise<void> {
    try {
      setError("");
      const docs: DocumentSummary[] = await fetchDocuments();
      setDocuments(docs);

      if (docs.length === 0) {
        setCurrentId(null);
        setPreviewHtml("");
        return;
      }

      const selectedId =
        currentId && docs.some((doc) => doc.id === currentId)
          ? currentId
          : docs[0].id;

      setCurrentId(selectedId);

      const preview = await fetchDocument(selectedId);
      setPreviewHtml(preview.html);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    }
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    await handleDroppedFiles(files);
    event.target.value = "";
  }

  async function handleDroppedFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const results = await Promise.all(
        Array.from(files).map((file) => uploadDocument(file))
      );

      await loadDocuments();

      const lastUploaded = results[results.length - 1];
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

  function handleDragEnter(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDragging(false);
    void handleDroppedFiles(e.dataTransfer.files);
  }

  async function handleSelectDocument(docId: string): Promise<void> {
    try {
      setError("");
      setCurrentId(docId);
      const preview = await fetchDocument(docId);
      setPreviewHtml(preview.html);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load preview.");
    }
  }

  async function handleNoteChange(docId: string, note: string): Promise<void> {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, note } : doc))
    );

    try {
      await updateNote(docId, note);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update note.");
    }
  }

  async function handleStickyNoteChange(
    docId: string,
    stickyNote: string
  ): Promise<void> {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, sticky_note: stickyNote } : doc
      )
    );

    try {
      await updateStickyNote(docId, stickyNote);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update sticky note."
      );
    }
  }

  const filteredDocuments = useMemo(() => {
    const value = filter.trim().toLowerCase();

    const result = documents.filter((doc) => {
      return (
        value === "" ||
        doc.file_name.toLowerCase().includes(value) ||
        doc.note.toLowerCase().includes(value) ||
        doc.sticky_note.toLowerCase().includes(value)
      );
    });

    result.sort((a, b) =>
      sortAscending
        ? a.file_name.localeCompare(b.file_name)
        : b.file_name.localeCompare(a.file_name)
    );

    return result;
  }, [documents, filter, sortAscending]);

  const currentDocument =
    documents.find((doc) => doc.id === currentId) ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stickyOpen ? "320px 1fr 320px" : "320px 1fr",
        gap: 12,
        minHeight: "100vh",
        padding: 12,
        boxSizing: "border-box",
        background: "#f5f6f8",
      }}
    >
      <section
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          background: isDragging ? "#f4fff4" : "white",
          borderRadius: 12,
          padding: 12,
          border: isDragging ? "2px dashed #4caf50" : "1px solid #ddd",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label style={{ flex: 1 }}>
            <input
              type="file"
              accept=".docx,.txt,.pdf,.xlsx,.xls"
              multiple
              onChange={handleUpload}
              style={{ width: "100%" }}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              window.open("http://127.0.0.1:8000/reports/export", "_blank")
            }
          >
            Reports
          </button>
        </div>

        <div style={{ marginBottom: 8, color: "#666", fontSize: 13 }}>
          Drag and drop files here, or choose files above.
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setSortAscending((prev) => !prev)}
          >
            Sort: {sortAscending ? "A → Z" : "Z → A"}
          </button>

          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter documents..."
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ fontWeight: 600, marginBottom: 8 }}>Documents</div>

        {isLoading && (
          <div style={{ marginBottom: 8, color: "#555" }}>Uploading...</div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 8,
              padding: 8,
              border: "1px solid #e0b4b4",
              background: "#fff6f6",
              color: "#9f3a38",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {filteredDocuments.length === 0 ? (
            <div
              style={{
                padding: 12,
                border: "1px dashed #ccc",
                borderRadius: 10,
                color: "#666",
                background: "#fafafa",
              }}
            >
              No documents found.
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  void handleSelectDocument(doc.id);
                }}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border:
                    currentId === doc.id
                      ? "1px solid #d9b300"
                      : "1px solid #ddd",
                  background: currentId === doc.id ? "#fff7cc" : "white",
                  cursor: "pointer",
                }}
              >
                <div   style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  }}
>
  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
    {doc.file_name}
  </div>

  <button
    type="button"
    onClick={(e) => {
      void handleDeleteDocument(e, doc.id);
    }}
    style={{
      border: "1px solid #ddd",
      background: "#fff",
      borderRadius: 6,
      padding: "4px 8px",
      cursor: "pointer",
      flexShrink: 0,
    }}
  >
    Remove
  </button>
                </div>

                <input
                  type="text"
                  value={doc.note}
                  placeholder="Rotation"
                  onChange={(e) => {
                    void handleNoteChange(doc.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </button>
            ))
          )}
        </div>
      </section>

      <section
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #ddd",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 10,
            borderBottom: "1px solid #eee",
          }}
        >
          <button type="button">Highlight</button>
          <button type="button">Draw</button>
          <button type="button">Text Box</button>
          <button type="button">Undo</button>
          <button type="button">Clear</button>

          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={() => setStickyOpen((prev) => !prev)}
            >
              {stickyOpen ? "Hide Sticky Notes" : "Show Sticky Notes"}
            </button>
          </div>
        </div>

        <div style={{ padding: 16, minHeight: 600 }}>
          {currentDocument ? (
            <>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 12,
                }}
              >
                {currentDocument.file_name}
              </div>

              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div>Loading preview...</div>
              )}
            </>
          ) : (
            <div>
              <h2>Select or upload a file</h2>
              <p>Your preview will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {stickyOpen && (
        <aside
          style={{
            background: "white",
            borderRadius: 12,
            padding: 12,
            border: "1px solid #ddd",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sticky Notes</div>

          <textarea
            value={currentDocument?.sticky_note ?? ""}
            onChange={(e) => {
              if (currentDocument) {
                void handleStickyNoteChange(currentDocument.id, e.target.value);
              }
            }}
            placeholder="Sticky notes for the selected file"
            style={{ width: "100%", minHeight: 300, resize: "vertical" }}
            disabled={!currentDocument}
          />
        </aside>
      )}
    </div>
  );
}