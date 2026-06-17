import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captura un elemento del DOM tal como se ve en pantalla y lo exporta a PDF.
 * Si el contenido excede una página, se reparte en múltiples páginas A4.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const prev = {
    paddingBottom: element.style.paddingBottom,
  };
  // Sacamos el padding de la nav del fondo al capturar.
  element.style.paddingBottom = '0px';
  element.classList.add('is-exporting');

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      backgroundColor: '#0b1220',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: Math.max(element.scrollWidth, 720),
    });
  } finally {
    element.style.paddingBottom = prev.paddingBottom;
    element.classList.remove('is-exporting');
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
  } else {
    // Paginación: se va dibujando la misma imagen con offset negativo.
    let heightLeft = imgH;
    let position = 0;
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
  }

  pdf.save(filename);
}
