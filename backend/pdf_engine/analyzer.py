"""
AutoML-X — PDF Data Analyzer & Chart Generator
Generates chart configurations from extracted PDF numerical data.
"""
import re
from typing import Dict, Any, List


def generate_charts(numeric_datasets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate chart configurations from extracted numeric data.
    Returns list of chart configs ready for Chart.js on the frontend.
    """
    charts = []

    for dataset in numeric_datasets:
        labels = dataset.get("labels", [])
        values = dataset.get("values", [])
        label = dataset.get("label", "Data")

        if not labels or not values or len(labels) < 2:
            continue

        # Generate bar chart
        charts.append({
            "type": "bar",
            "title": f"{label} — Bar Chart",
            "data": {
                "labels": labels[:20],  # Limit to 20 items
                "datasets": [{
                    "label": label,
                    "data": values[:20],
                    "backgroundColor": _generate_colors(min(len(values), 20)),
                }]
            },
            "source_page": dataset.get("source_page", 1),
        })

        # Generate line chart if sequential data
        if len(values) >= 3:
            charts.append({
                "type": "line",
                "title": f"{label} — Trend Line",
                "data": {
                    "labels": labels[:20],
                    "datasets": [{
                        "label": label,
                        "data": values[:20],
                        "borderColor": "rgba(108, 99, 255, 1)",
                        "backgroundColor": "rgba(108, 99, 255, 0.1)",
                        "fill": True,
                        "tension": 0.3,
                    }]
                },
                "source_page": dataset.get("source_page", 1),
            })

        # Generate pie chart if <= 8 categories
        if 2 <= len(values) <= 8 and all(v >= 0 for v in values):
            charts.append({
                "type": "pie",
                "title": f"{label} — Distribution",
                "data": {
                    "labels": labels[:8],
                    "datasets": [{
                        "data": values[:8],
                        "backgroundColor": _generate_colors(min(len(values), 8)),
                    }]
                },
                "source_page": dataset.get("source_page", 1),
            })

    return charts


def _generate_colors(n: int) -> List[str]:
    """Generate a list of visually distinct colors."""
    palette = [
        "rgba(108, 99, 255, 0.7)",
        "rgba(78, 205, 196, 0.7)",
        "rgba(255, 107, 107, 0.7)",
        "rgba(255, 206, 86, 0.7)",
        "rgba(54, 162, 235, 0.7)",
        "rgba(153, 102, 255, 0.7)",
        "rgba(255, 159, 64, 0.7)",
        "rgba(46, 204, 113, 0.7)",
        "rgba(231, 76, 60, 0.7)",
        "rgba(52, 152, 219, 0.7)",
        "rgba(155, 89, 182, 0.7)",
        "rgba(241, 196, 15, 0.7)",
        "rgba(26, 188, 156, 0.7)",
        "rgba(230, 126, 34, 0.7)",
        "rgba(149, 165, 166, 0.7)",
        "rgba(192, 57, 43, 0.7)",
        "rgba(41, 128, 185, 0.7)",
        "rgba(142, 68, 173, 0.7)",
        "rgba(39, 174, 96, 0.7)",
        "rgba(44, 62, 80, 0.7)",
    ]
    return [palette[i % len(palette)] for i in range(n)]


def detect_key_metrics(text: str) -> List[Dict[str, Any]]:
    """
    Detect key numerical metrics from text.
    Finds patterns like "Revenue: $1.2M", "Growth: 15%", etc.
    """
    metrics = []

    # Pattern: label followed by number with optional currency/percentage
    patterns = [
        r"([A-Z][a-zA-Z\s]{2,30})[\s:]+\$?([\d,]+\.?\d*)\s*(%|million|billion|M|B|K)?",
        r"([\w\s]{3,25})\s+(?:is|was|reached|grew|increased|decreased)\s+(?:to\s+)?\$?([\d,]+\.?\d*)\s*(%|million|billion|M|B|K)?",
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            label = match.group(1).strip()
            value = match.group(2).replace(",", "")
            unit = match.group(3) if match.lastindex >= 3 else ""

            try:
                num_val = float(value)
                metrics.append({
                    "label": label,
                    "value": num_val,
                    "unit": unit or "",
                    "raw_text": match.group(0).strip(),
                })
            except ValueError:
                continue

    # Deduplicate by label
    seen = set()
    unique_metrics = []
    for m in metrics:
        key = m["label"].lower()
        if key not in seen:
            seen.add(key)
            unique_metrics.append(m)

    return unique_metrics[:20]  # Limit to 20 metrics
