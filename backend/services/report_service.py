"""
SOMA.AI — PDF Report Service
Generates professional PDF reports using ReportLab.
"""
import os
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_pdf_report(
    project_data: Dict[str, Any],
    output_path: str,
) -> str:
    """Generate a comprehensive PDF report for the project."""
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=24, textColor=colors.HexColor("#6C63FF"), spaceAfter=20)
    heading_style = ParagraphStyle("CustomHeading", parent=styles["Heading2"], fontSize=16, textColor=colors.HexColor("#333333"), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle("CustomBody", parent=styles["Normal"], fontSize=11, leading=16, spaceAfter=8)
    metric_style = ParagraphStyle("Metric", parent=styles["Normal"], fontSize=12, leading=16, textColor=colors.HexColor("#2D2D2D"))

    elements = []

    # Title
    elements.append(Paragraph("SOMA.AI Report", title_style))
    elements.append(Paragraph(f"Project: {project_data.get('name', 'Untitled')}", styles["Heading3"]))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#6C63FF")))
    elements.append(Spacer(1, 20))

    # Dataset Summary
    elements.append(Paragraph("1. Dataset Overview", heading_style))
    profile = project_data.get("profile", {})
    shape = profile.get("shape", {})
    dataset_info = [
        ["Property", "Value"],
        ["Rows", str(shape.get("rows", "N/A"))],
        ["Columns", str(shape.get("columns", "N/A"))],
        ["Target Column", project_data.get("target_column", "N/A")],
        ["Task Type", project_data.get("task_type", "N/A")],
        ["Missing Values", str(profile.get("total_missing", 0))],
    ]
    table = Table(dataset_info, colWidths=[3*inch, 3.5*inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6C63FF")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F5F5FF")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))

    # Missing values
    missing = profile.get("missing_values", {})
    if missing:
        elements.append(Paragraph("Missing Values by Column", heading_style))
        mv_data = [["Column", "Count", "Percentage"]]
        for col, info in list(missing.items())[:15]:
            mv_data.append([col, str(info["count"]), f"{info['percentage']}%"])
        mv_table = Table(mv_data, colWidths=[2.5*inch, 2*inch, 2*inch])
        mv_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FF6B6B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFF5F5")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(mv_table)
        elements.append(Spacer(1, 20))

    # Model Comparison
    elements.append(PageBreak())
    elements.append(Paragraph("2. Model Comparison", heading_style))
    results = project_data.get("results", {})
    evaluations = results.get("evaluations", [])
    if evaluations:
        is_regression = project_data.get("task_type") == "regression"
        if is_regression:
            model_data = [["Model", "R²", "RMSE", "MAE"]]
            for ev in evaluations:
                m = ev.get("metrics", {})
                model_data.append([
                    ev.get("name", "?"),
                    str(m.get("r2", "N/A")),
                    str(m.get("rmse", "N/A")),
                    str(m.get("mae", "N/A")),
                ])
        else:
            model_data = [["Model", "Accuracy", "F1 Score", "Precision", "Recall"]]
            for ev in evaluations:
                m = ev.get("metrics", {})
                model_data.append([
                    ev.get("name", "?"),
                    str(m.get("accuracy", "N/A")),
                    str(m.get("f1", "N/A")),
                    str(m.get("precision", "N/A")),
                    str(m.get("recall", "N/A")),
                ])

        col_count = len(model_data[0])
        col_width = 6.5 * inch / col_count
        model_table = Table(model_data, colWidths=[col_width] * col_count)
        model_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6C63FF")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F5F5FF")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(model_table)
        elements.append(Spacer(1, 20))

    # Best Model
    elements.append(Paragraph("3. Best Model", heading_style))
    best_name = results.get("best_model_name", "N/A")
    elements.append(Paragraph(f"<b>Selected Model:</b> {best_name}", metric_style))

    if evaluations and results.get("best_model_index") is not None:
        best_metrics = evaluations[results["best_model_index"]].get("metrics", {})
        for key, val in best_metrics.items():
            if key not in ("confusion_matrix", "roc", "pr_curve", "cv_scores", "best_params", "class_labels"):
                elements.append(Paragraph(f"  • {key}: {val}", body_style))

    elements.append(Spacer(1, 15))

    # Feature Importance
    fi = project_data.get("feature_importance", {})
    if fi.get("names"):
        elements.append(Paragraph("4. Feature Importance (Top 10)", heading_style))
        fi_data = [["Feature", "Importance"]]
        for name, val in zip(fi["names"][:10], fi["values"][:10]):
            fi_data.append([str(name), f"{val:.4f}"])
        fi_table = Table(fi_data, colWidths=[3.5*inch, 3*inch])
        fi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4ECDC4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F0FFFE")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(fi_table)
        elements.append(Spacer(1, 20))

    # AI Dataset Explanation
    ai_analysis = profile.get("ai_analysis", "")
    if ai_analysis:
        elements.append(PageBreak())
        elements.append(Paragraph("5. AI Dataset Explanation", heading_style))
        elements.append(Paragraph(str(ai_analysis), body_style))
        elements.append(Spacer(1, 15))

    # Business Insights
    business_insights = project_data.get("business_insights", "")
    if business_insights:
        elements.append(Paragraph("6. Business Insights", heading_style))
        elements.append(Paragraph(str(business_insights), body_style))
        elements.append(Spacer(1, 15))

    # Recommendations
    recommendations = project_data.get("recommendations", "")
    if recommendations:
        elements.append(Paragraph("7. Recommendations", heading_style))
        elements.append(Paragraph(str(recommendations), body_style))
        elements.append(Spacer(1, 15))

    # Footer
    elements.append(Spacer(1, 40))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CCCCCC")))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Generated by SOMA.AI — Automated Machine Learning Platform", ParagraphStyle("Footer", parent=styles["Normal"], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(elements)
    return output_path

