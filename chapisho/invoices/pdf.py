from django.template.loader import render_to_string


def render_pdf(invoice):
    from weasyprint import HTML
    html_string = render_to_string('invoices/pdf_template.html', {'invoice': invoice})
    pdf_file = HTML(string=html_string).write_pdf()
    return pdf_file
