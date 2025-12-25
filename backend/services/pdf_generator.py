"""
PDF Generator Service
Creates professional PDF documents for CVs and cover letters
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Flowable, Table, TableStyle
from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_RIGHT
import io
from typing import Optional

class HorizontalLine(Flowable):
    """Draws a horizontal line"""
    def __init__(self, width=450):
        Flowable.__init__(self)
        self.width = width

    def draw(self):
        self.canv.setStrokeColor(HexColor('#000000'))
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, self.width, 0)

class PDFGenerator:
    """Service for generating PDF documents"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        
        # Custom styles - Latex-like
        self.styles.add(ParagraphStyle(
            name='CVTitle',
            parent=self.styles['Heading1'],
            fontName='Times-Bold',
            fontSize=24,
            leading=28,
            textColor=black,
            alignment=TA_LEFT,
            spaceAfter=6
        ))
        
        self.styles.add(ParagraphStyle(
            name='CVSection',
            parent=self.styles['Heading2'],
            fontName='Times-Bold',
            fontSize=12,
            leading=14,
            textColor=black,
            alignment=TA_LEFT,
            spaceBefore=12,
            spaceAfter=4,
            textTransform='uppercase'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CVBody',
            parent=self.styles['Normal'],
            fontName='Times-Roman',
            fontSize=10,
            leading=12,
            textColor=black,
            alignment=TA_LEFT
        ))

        self.styles.add(ParagraphStyle(
            name='CVBullet',
            parent=self.styles['Normal'],
            fontName='Times-Roman',
            fontSize=10,
            leading=12,
            textColor=black,
            alignment=TA_LEFT,
            leftIndent=15,
            firstLineIndent=0,
            spaceAfter=2
        ))
        
        # Right aligned style for dates
        self.styles.add(ParagraphStyle(
            name='CVDate',
            parent=self.styles['Normal'],
            fontName='Times-Roman',
            fontSize=10,
            leading=12,
            textColor=black,
            alignment=TA_RIGHT
        ))

    def generate_cv_from_json(self, data: dict) -> bytes:
        """
        Generate a professional CV PDF for ANY domain/industry.
        Adapts section titles and structure based on content.
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.4*inch,
            leftMargin=0.4*inch,
            topMargin=0.4*inch,
            bottomMargin=0.4*inch
        )
        
        flowables = []
        styles = self.styles
        available_width = 7.27 * inch

        # Helper functions
        def add_split_header(left_text, right_text, is_bold_left=True):
            p_left = Paragraph(left_text, styles['CVBody'])
            p_right = Paragraph(right_text if right_text else "", styles['CVDate'])
            
            t = Table(
                [[p_left, p_right]], 
                colWidths=[available_width * 0.75, available_width * 0.25]
            )
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
            ]))
            flowables.append(t)

        def add_section(title):
            flowables.append(Paragraph(title.upper(), styles['CVSection']))
            flowables.append(HorizontalLine(width=510))
            flowables.append(Spacer(1, 4))

        # 1. HEADER
        header = data.get("header", {})
        if header.get("name"):
            name_style = ParagraphStyle(
                'HeaderName', parent=styles['CVTitle'], alignment=1, fontSize=24, spaceAfter=4
            )
            flowables.append(Paragraph(header["name"], name_style))
            
            contact_parts = []
            if header.get("email"): contact_parts.append(header["email"])
            if header.get("phone"): contact_parts.append(header["phone"])
            if header.get("location"): contact_parts.append(header["location"])
            if header.get("linkedin"): contact_parts.append("LinkedIn")
            if header.get("github"): contact_parts.append("GitHub")
            
            contact_info = "  |  ".join(contact_parts)
            contact_style = ParagraphStyle(
                'HeaderContact', parent=styles['Normal'], alignment=1, fontSize=10
            )
            flowables.append(Paragraph(contact_info, contact_style))
            flowables.append(Spacer(1, 8))

        # 2. PROFESSIONAL SUMMARY
        if data.get("summary"):
            add_section("Professional Summary")
            flowables.append(Paragraph(data["summary"], styles['CVBody']))
            flowables.append(Spacer(1, 6))

        # 3. EDUCATION (Moved up as standard for all CVs)
        education = data.get("education", [])
        if education:
            add_section("Education")
            for edu in education:
                uni_text = f"<b>{edu.get('institution', '')}</b>"
                if edu.get('location'): 
                    uni_text += f", {edu['location']}"
                
                flowables.append(Paragraph(uni_text, styles['CVBody']))
                
                degree_text = f"<i>{edu.get('degree', '')}</i>"
                date_text = edu.get('dates', '')
                add_split_header(degree_text, date_text)
                flowables.append(Spacer(1, 6))

        # 4. SKILLS (UNIVERSAL - adapts to any skill categories)
        skills = data.get("skills", {})
        if skills:
            # Dynamic section title based on content
            add_section("Core Competencies")
            
            # Handle ANY skill category names (not just technical)
            for category, skill_list in skills.items():
                if skill_list:  # Only show non-empty categories
                    # Capitalize category name nicely
                    category_display = category.replace("_", " ").title()
                    skill_text = f"<b>{category_display}:</b> {', '.join(skill_list)}"
                    flowables.append(Paragraph(skill_text, styles['CVBody']))
            
            flowables.append(Spacer(1, 6))

        # 5. WORK EXPERIENCE
        experience = data.get("experience", [])
        if experience:
            add_section("Professional Experience")
            for job in experience:
                title_text = f"<b>{job.get('title', '')}</b>"
                date_text = job.get('dates', '')
                add_split_header(title_text, date_text)
                
                company_text = job.get('company', '')
                if job.get('location'):
                    company_text += f" | <i>{job['location']}</i>"
                
                flowables.append(Paragraph(company_text, styles['CVBody']))
                
                bullets = job.get("bullets", [])
                for bullet in bullets:
                    flowables.append(Paragraph(f"• {bullet}", styles['CVBullet']))
                
                flowables.append(Spacer(1, 8))

        # 6. PROJECTS (OPTIONAL - only include if present)
        projects = data.get("projects", [])
        if projects:
            add_section("Projects")
            for proj in projects:
                name_text = f"<b>{proj.get('name', '')}</b>"
                if proj.get('technologies'):
                    name_text += f" | <i>{proj['technologies']}</i>"
                
                date_text = proj.get('dates', '')
                add_split_header(name_text, date_text)
                
                if proj.get('description'):
                    flowables.append(Paragraph(f"• {proj['description']}", styles['CVBullet']))
                
                flowables.append(Spacer(1, 4))

        # 7. CERTIFICATIONS & LICENSES
        certifications = data.get("certifications", [])
        if certifications:
            add_section("Certifications & Licenses")
            # Logic to handle both Strings (Legacy) and Objects (New)
            for cert in certifications:
                if isinstance(cert, dict):
                    # Format: "Name - Issuer" (Left, No Bold) ... "Date" (Right)
                    name = cert.get('name', '')
                    issuer = cert.get('issuer', '')
                    year = cert.get('year', '')
                    
                    # Construct Left Side: "Name - Issuer"
                    if issuer:
                        left_text = f"{name} - {issuer}"
                    else:
                        left_text = name
                        
                    # Construct Right Side: just the date
                    right_text = year
                    
                    add_split_header(left_text, right_text)
                else:
                    # Fallback for strings
                    flowables.append(Paragraph(f"• {cert}", styles['CVBody']))
            flowables.append(Spacer(1, 4))

        # 8. ADDITIONAL SECTIONS (if present in JSON)
        # Allows for custom sections like "Publications", "Volunteer Work", etc.
        additional_sections = data.get("additional_sections", {})
        for section_title, section_content in additional_sections.items():
            add_section(section_title)
            if isinstance(section_content, list):
                for item in section_content:
                    flowables.append(Paragraph(f"• {item}", styles['CVBody']))
            else:
                flowables.append(Paragraph(section_content, styles['CVBody']))
            flowables.append(Spacer(1, 4))

            # Remove trailing spacers to prevent blank pages
            while flowables and isinstance(flowables[-1], Spacer):
                flowables.pop()

        doc.build(flowables)
        buffer.seek(0)
        return buffer.getvalue()

# Singleton instance
pdf_generator = PDFGenerator()
