from pydantic import BaseModel
from typing import List, Optional


class DocumentSummary(BaseModel):
    id: str
    file_name: str
    note: str = ""
    sticky_note: str = ""


class UploadDocumentResponse(BaseModel):
    document: DocumentSummary
    html: str
    messages: List[str] = []


class PreviewResponse(BaseModel):
    document: DocumentSummary
    html: str
    messages: List[str] = []


class UpdateNoteRequest(BaseModel):
    note: str


class UpdateStickyNoteRequest(BaseModel):
    sticky_note: str


class AnnotationItem(BaseModel):
    kind: str
    rect: Optional[dict] = None
    points: List[dict] = []
    text: str = ""


class UpdateAnnotationsRequest(BaseModel):
    annotations: List[AnnotationItem]