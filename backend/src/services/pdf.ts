import PDFDocument from 'pdfkit';
export function linkPdf(data: { workerFullName: string; link: string; passcode: string }) {
  const doc = new PDFDocument({ margin: 48 }); const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));
  doc.fontSize(20).text('NERD Worker Registration Link', { align: 'center' }).moveDown();
  doc.fontSize(13).text(`Worker: ${data.workerFullName}`).moveDown();
  doc.text(`Registration Link: ${data.link}`).moveDown();
  doc.text(`Worker Passcode: ${data.passcode}`).moveDown();
  doc.text('Keep this PDF safe. Admin can regenerate it if missing.'); doc.end();
  return new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
