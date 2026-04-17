from io import BytesIO
from openpyxl import Workbook


def build_report(documents: list[dict]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Reports"
    sheet.append(["File Name", "Note", "Sticky Notes"])

    for doc in documents:
        sheet.append([
            doc.get("file_name", ""),
            doc.get("note", ""),
            doc.get("sticky_note", ""),
        ])

    sheet.column_dimensions["A"].width = 36
    sheet.column_dimensions["B"].width = 30
    sheet.column_dimensions["C"].width = 60

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer.read()