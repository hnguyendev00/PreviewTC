export type DocumentSummary = {
  id: string;
  file_name: string;
  note: string;
  sticky_note: string;
};

export type PreviewResponse = {
  document: DocumentSummary;
  html: string;
  messages: string[];
};

export type AnnotationItem = {
  kind: string;
  rect?: Record<string, unknown> | null;
  points: Record<string, unknown>[];
  text: string;
};