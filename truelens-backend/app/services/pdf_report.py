import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(document) -> bytes:
    """
    Generates a dark monochrome PDF verification report using reportlab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.black,
        spaceAfter=20,
        alignment=1 # Center
    )
    
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.black,
        spaceBefore=15,
        spaceAfter=10
    )
    
    normal_style = styles['Normal']
    
    Story = []
    
    # Title
    Story.append(Paragraph("TrueLens Verification Report", title_style))
    Story.append(Spacer(1, 12))
    
    # Metadata section
    Story.append(Paragraph("Document Information", h2_style))
    
    meta_data = [
        ["Filename:", document.filename],
        ["File Size:", f"{document.file_size} bytes"],
        ["File Type:", document.file_type],
        ["Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")],
    ]
    
    meta_table = Table(meta_data, colWidths=[120, 300])
    meta_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), colors.darkgrey),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    Story.append(meta_table)
    Story.append(Spacer(1, 20))
    
    # Verification Result
    Story.append(Paragraph("Verification Result", h2_style))
    
    status_color = colors.black
    if document.status == "verified":
        status_text = "AUTHENTIC"
        status_color = colors.green
    elif document.status == "flagged":
        status_text = "TAMPERED / FAKE"
        status_color = colors.red
    else:
        status_text = "SUSPICIOUS / ANALYZING"
        status_color = colors.orange
        
    result_data = [
        ["Status:", status_text],
        ["Trust Score:", f"{document.trust_score}/100"],
        ["Document Hash (SHA-256):", document.hash],
    ]
    
    result_table = Table(result_data, colWidths=[150, 270])
    result_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), colors.darkgrey),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1, 0), (1, 0), status_color),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
    ]))
    
    Story.append(result_table)
    Story.append(Spacer(1, 20))
    
    # Findings
    Story.append(Paragraph("Detailed Analysis Findings", h2_style))
    
    if document.findings and len(document.findings) > 0:
        findings_data = [["Type", "Severity", "Message"]]
        for f in document.findings:
            findings_data.append([
                f.get("type", "Unknown"), 
                f.get("severity", "info").upper(), 
                f.get("message", "")
            ])
            
        findings_table = Table(findings_data, colWidths=[100, 70, 250])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        Story.append(findings_table)
    else:
        Story.append(Paragraph("No specific anomalies found.", normal_style))
        
    Story.append(Spacer(1, 30))
    
    # Cryptographic Signature
    if document.signature:
        Story.append(Paragraph("Cryptographic Signature (Ledger)", h2_style))
        sig_data = [
            ["Signature:", document.signature[:40] + "..." if len(document.signature) > 40 else document.signature],
            ["Public Key:", document.public_key[:40] + "..." if document.public_key and len(document.public_key) > 40 else document.public_key],
            ["Verified At:", str(document.verified_at)],
        ]
        
        sig_table = Table(sig_data, colWidths=[120, 300])
        sig_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (0, -1), colors.darkgrey),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        Story.append(sig_table)
        
    Story.append(Spacer(1, 40))
    Story.append(Paragraph("This report was generated automatically by the TrueLens Forensic System.", normal_style))
    
    doc.build(Story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
