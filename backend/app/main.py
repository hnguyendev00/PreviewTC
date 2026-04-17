from pathlib import Path
from uuid import uuid4
from tempfile import gettempdir
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .schemas import (
    DocumentSummary,
    PreviewResponse,
    UpdateAnnotationsRequest,
    UpdateNoteRequest,
    UpdateStickyNoteRequest,
    UploadDocumentResponse,
)
from .services.file_service import convert_file_to_html
from .services.report_service import build_report

app = FastAPI(title="DOCX Preview Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://preview-tc.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(gettempdir()) / "docx_preview_web_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DOCUMENTS: dict[str, dict] = {}


@app.get("/health")
def health_check():
    return {"ok": True}


@app.get("/documents")
def list_documents():
    return [
        DocumentSummary(
            id=doc_id,
            file_name=data["file_name"],
            note=data.get("note", ""),
            sticky_note=data.get("sticky_note", ""),
        )
        for doc_id, data in DOCUMENTS.items()
    ]


@app.post("/documents/upload", response_model=UploadDocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    allowed_exts = [".docx", ".txt", ".pdf", ".xlsx", ".xls"]

    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail="Supported types: .docx, .txt, .pdf, .xlsx, .xls",
        )

    doc_id = str(uuid4())
    save_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"

    try:
        content = await file.read()
        save_path.write_bytes(content)

        html, messages = convert_file_to_html(save_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"File processing failed: {exc}")

    DOCUMENTS[doc_id] = {
        "id": doc_id,
        "file_name": file.filename,
        "file_path": str(save_path),
        "note": "",
        "sticky_note": "",
        "annotations": [],
        "html": html,
        "messages": messages,
    }

    return UploadDocumentResponse(
        document=DocumentSummary(id=doc_id, file_name=file.filename),
        html=html,
        messages=messages,
    )


@app.get("/documents/{doc_id}", response_model=PreviewResponse)
def get_document(doc_id: str):
    doc = DOCUMENTS.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return PreviewResponse(
        document=DocumentSummary(
            id=doc_id,
            file_name=doc["file_name"],
            note=doc.get("note", ""),
            sticky_note=doc.get("sticky_note", ""),
        ),
        html=doc["html"],
        messages=doc.get("messages", []),
    )


@app.patch("/documents/{doc_id}/note")
def update_note(doc_id: str, payload: UpdateNoteRequest):
    doc = DOCUMENTS.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc["note"] = payload.note
    return {"ok": True}


@app.patch("/documents/{doc_id}/sticky-note")
def update_sticky_note(doc_id: str, payload: UpdateStickyNoteRequest):
    doc = DOCUMENTS.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc["sticky_note"] = payload.sticky_note
    return {"ok": True}


@app.put("/documents/{doc_id}/annotations")
def update_annotations(doc_id: str, payload: UpdateAnnotationsRequest):
    doc = DOCUMENTS.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc["annotations"] = [item.model_dump() for item in payload.annotations]
    return {"ok": True}


@app.get("/documents/{doc_id}/annotations")
def get_annotations(doc_id: str):
    doc = DOCUMENTS.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"annotations": doc.get("annotations", [])}

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    doc = DOCUMENTS.pop(doc_id, None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = doc.get("file_path")
    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception:
            pass

    return {"ok": True}

@app.get("/reports/export")
def export_report():
    rows = list(DOCUMENTS.values())
    content = build_report(rows)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="reports.xlsx"'},
    )