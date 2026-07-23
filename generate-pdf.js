const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const fs = require("fs");

async function createBarcodePDF() {
  console.log("Generating barcodes, please wait...");

  // Create an A4 PDF document with margins
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Name of the output PDF file
  doc.pipe(fs.createWriteStream("SOPHEA_MART_Barcodes.pdf"));

  // Grid layout settings (3 columns, 7 rows per page)
  const cols = 3;
  const rows = 7;
  const cellWidth = 165;
  const cellHeight = 105;

  let x = 50;
  let y = 50;
  let colCount = 0;
  let rowCount = 0;

  // Loop from 0001 to 0400
  for (let i = 1; i <= 400; i++) {
    const barcodeId = String(i).padStart(4, "0");

    try {
      // 1. Generate the barcode image as a Buffer
      const pngBuffer = await bwipjs.toBuffer({
        bcid: "code128", // Standard barcode format
        text: barcodeId, // The ID (e.g., "0001")
        scale: 3, // Image resolution scale
        height: 15, // Height of the bars
        includetext: true, // Include the text below
        textxalign: "center", // Center the text
      });

      // 2. Insert the barcode into the PDF
      doc.image(pngBuffer, x, y, { width: 120 });

      // 3. Move coordinates for the next barcode
      colCount++;
      x += cellWidth;

      // Move to the next row if the column is full
      if (colCount >= cols) {
        colCount = 0;
        x = 50;
        rowCount++;
        y += cellHeight;
      }

      // Add a new page if the rows are full (and we aren't at the last item)
      if (rowCount >= rows && i < 400) {
        doc.addPage();
        rowCount = 0;
        y = 50;
      }
    } catch (err) {
      console.error(`Error generating barcode ${barcodeId}:`, err);
    }
  }

  doc.end();
  console.log("✅ Success! Your PDF is ready: SOPHEA_MART_Barcodes.pdf");
}

createBarcodePDF();
