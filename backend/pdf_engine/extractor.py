"""
AutoML-X — PDF Text & Table Extractor
Uses pdfplumber to extract text and tables from PDF documents.
"""
import pdfplumber
from typing import Dict, Any, List, Optional


def extract_pdf(file_path: str) -> Dict[str, Any]:
    """
    Extract text and tables from a PDF file.
    Returns dict with: text, pages, tables, page_count
    """
    result = {
        "text": "",
        "pages": [],
        "tables": [],
        "page_count": 0,
    }

    try:
        with pdfplumber.open(file_path) as pdf:
            result["page_count"] = len(pdf.pages)

            all_text_parts = []
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text
                page_text = page.extract_text() or ""
                all_text_parts.append(page_text)

                result["pages"].append({
                    "page_number": page_num,
                    "text": page_text,
                    "width": float(page.width),
                    "height": float(page.height),
                })

                # Extract tables
                page_tables = page.extract_tables()
                if page_tables:
                    for table_idx, table in enumerate(page_tables):
                        if table and len(table) > 1:
                            # First row as headers, rest as data
                            headers = [str(h) if h else f"Col_{i}" for i, h in enumerate(table[0])]
                            rows = []
                            for row in table[1:]:
                                cleaned = [str(cell) if cell else "" for cell in row]
                                rows.append(cleaned)

                            result["tables"].append({
                                "page": page_num,
                                "table_index": table_idx,
                                "headers": headers,
                                "rows": rows,
                                "row_count": len(rows),
                            })

            result["text"] = "\n\n".join(all_text_parts)

    except Exception as e:
        result["error"] = str(e)

    return result


def extract_numeric_data(tables: List[Dict]) -> List[Dict[str, Any]]:
    """
    Extract numerical data from detected tables for chart generation.
    Returns list of chart-ready data structures.
    """
    numeric_datasets = []

    for table in tables:
        headers = table.get("headers", [])
        rows = table.get("rows", [])

        if not headers or not rows:
            continue

        # Try to find numeric columns
        numeric_cols = []
        label_col = None

        for col_idx, header in enumerate(headers):
            # Check if most values in this column are numeric
            numeric_count = 0
            for row in rows:
                if col_idx < len(row):
                    try:
                        val = row[col_idx].replace(",", "").replace("%", "").strip()
                        if val:
                            float(val)
                            numeric_count += 1
                    except (ValueError, AttributeError):
                        pass

            if numeric_count > len(rows) * 0.5:
                numeric_cols.append(col_idx)
            elif label_col is None:
                label_col = col_idx

        if not numeric_cols:
            continue

        # Build dataset
        if label_col is not None:
            labels = []
            for row in rows:
                if label_col < len(row):
                    labels.append(str(row[label_col]))
                else:
                    labels.append("")
        else:
            labels = [f"Row {i+1}" for i in range(len(rows))]

        for num_col in numeric_cols:
            values = []
            for row in rows:
                if num_col < len(row):
                    try:
                        val = row[num_col].replace(",", "").replace("%", "").strip()
                        values.append(float(val))
                    except (ValueError, AttributeError):
                        values.append(0)
                else:
                    values.append(0)

            numeric_datasets.append({
                "label": headers[num_col] if num_col < len(headers) else f"Column {num_col}",
                "labels": labels,
                "values": values,
                "source_page": table.get("page", 1),
            })

    return numeric_datasets
