"""
Exportação de sessões em PDF e TXT.
"""

import io


def _fmt_time(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"


def export_txt(session: dict, transcripts: list[dict]) -> bytes:
    duration = _fmt_time(transcripts[-1]["timestamp"]) if transcripts else "00:00"
    lines = [
        "TRANSCRIÇÃO DE REUNIÃO",
        "=" * 60,
        f"Assessor : {session['advisor_name']}",
        f"Cliente  : {session['client_name']}",
        f"Data     : {session['created_at'][:10]}",
        f"Duração  : {duration}",
        "",
        "TRANSCRIÇÃO:",
        "-" * 60,
        "",
    ]

    for t in transcripts:
        lines.append(f"[{_fmt_time(t['timestamp'])}] {t['speaker_name']}: {t['text']}")

    if session.get("summary"):
        lines += ["", "RESUMO:", "-" * 60, "", session["summary"]]

    return "\n".join(lines).encode("utf-8")


def export_pdf(session: dict, transcripts: list[dict]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    SPEAKER_COLORS = {
        0: colors.HexColor("#1a56db"),  # Assessor — azul
        1: colors.HexColor("#057a55"),  # Cliente — verde
    }

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title2",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=4,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=4,
    )

    story = [Paragraph("Transcrição de Reunião", title_style), Spacer(1, 5 * mm)]

    meta = [
        ["Assessor:", session["advisor_name"]],
        ["Cliente:", session["client_name"]],
        ["Data:", session["created_at"][:10]],
    ]
    t = Table(meta, colWidths=[40 * mm, 130 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f3f4f6"), colors.white]),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [t, Spacer(1, 8 * mm), Paragraph("Transcrição", h2_style), Spacer(1, 3 * mm)]

    for entry in transcripts:
        color = SPEAKER_COLORS.get(entry["speaker_id"], colors.black)
        speaker_style = ParagraphStyle(
            f"sp_{entry['speaker_id']}",
            parent=styles["Normal"],
            fontSize=9,
            textColor=color,
            fontName="Helvetica-Bold",
            spaceAfter=1,
        )
        text_style = ParagraphStyle(
            "ttext",
            parent=styles["Normal"],
            fontSize=10,
            leftIndent=8,
            spaceAfter=6,
            textColor=colors.HexColor("#374151"),
        )
        story.append(
            Paragraph(f"[{_fmt_time(entry['timestamp'])}]  {entry['speaker_name']}", speaker_style)
        )
        story.append(Paragraph(entry["text"], text_style))

    if session.get("summary"):
        story += [Spacer(1, 8 * mm), Paragraph("Resumo", h2_style), Spacer(1, 3 * mm)]
        summary_style = ParagraphStyle(
            "summary",
            parent=styles["Normal"],
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#374151"),
        )
        summary_html = session["summary"].replace("\n", "<br/>")
        story.append(Paragraph(summary_html, summary_style))

    doc.build(story)
    return buf.getvalue()
