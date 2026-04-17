from pathlib import Path
import mammoth
import pandas as pd
from PyPDF2 import PdfReader


def convert_file_to_html(file_path: Path) -> tuple[str, list[str]]:
    suffix = file_path.suffix.lower()
    messages: list[str] = []

    if suffix == ".docx":
        with open(file_path, "rb") as f:
            result = mammoth.convert_to_html(f)
        html = result.value
        messages = [str(m) for m in result.messages]

    elif suffix == ".txt":
        text = file_path.read_text(errors="ignore")
        html = f"<pre>{text}</pre>"

    elif suffix == ".pdf":
        reader = PdfReader(str(file_path))
        text = "".join(page.extract_text() or "" for page in reader.pages) 
        html = f"<pre>{text}</pre>"
    
    elif suffix in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
        html = df.to_html(index=False)

    else:
        raise ValueError("Unsupported file type")
    styled_html = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    line-height: 1.5;
                }}
                pre {{
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }}
                table {{
                    border-collapse: collapse;
                    width: 100%;
                }}
                th, td {{
                    border: 1px solid #ccc;
                    padding: 6px;
                }}
            </style>
        </head>
        <body>
            {html}
        </body>
    </html>
    """

    return styled_html, messages