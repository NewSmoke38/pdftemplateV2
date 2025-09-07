import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { type FieldPosition } from '../components/PDFViewer';

export interface PDFFillResult {
  success: boolean;
  error?: string;
  pdfBytes?: Uint8Array;
}

export class PDFFiller {
  private static async loadFont(pdfDoc: PDFDocument) {
    try {
      return await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      console.warn('Failed to load Helvetica font, using default');
      return await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  }

  static async mergePDFs(pdfFile1: File, pdfFile2: File): Promise<File> {
    console.log('📄 PDFFiller: mergePDFs called', { 
      pdf1Name: pdfFile1.name, 
      pdf2Name: pdfFile2.name 
    });

    try {
      // Read both PDF files
      console.log('📄 PDFFiller: Reading PDF files');
      const [pdfBytes1, pdfBytes2] = await Promise.all([
        pdfFile1.arrayBuffer(),
        pdfFile2.arrayBuffer()
      ]);
      console.log('📄 PDFFiller: PDF files read', { 
        size1: pdfBytes1.byteLength, 
        size2: pdfBytes2.byteLength 
      });
      
      // Load both PDF documents
      console.log('📄 PDFFiller: Loading PDF documents');
      const [pdfDoc1, pdfDoc2] = await Promise.all([
        PDFDocument.load(pdfBytes1),
        PDFDocument.load(pdfBytes2)
      ]);
      console.log('📄 PDFFiller: PDF documents loaded');
      
      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();
      console.log('📄 PDFFiller: New PDF document created');
      
      // Copy pages from first PDF
      const pages1 = await mergedPdf.copyPages(pdfDoc1, pdfDoc1.getPageIndices());
      pages1.forEach((page) => mergedPdf.addPage(page));
      console.log('📄 PDFFiller: Pages from first PDF added', pages1.length);
      
      // Copy pages from second PDF
      const pages2 = await mergedPdf.copyPages(pdfDoc2, pdfDoc2.getPageIndices());
      pages2.forEach((page) => mergedPdf.addPage(page));
      console.log('📄 PDFFiller: Pages from second PDF added', pages2.length);
      
      // Save the merged PDF
      console.log('📄 PDFFiller: Saving merged PDF');
      const mergedPdfBytes = await mergedPdf.save();
      console.log('📄 PDFFiller: Merged PDF saved', { size: mergedPdfBytes.length });
      
      // Create a new File object
      const mergedFile = new File([mergedPdfBytes], 'merged-document.pdf', { 
        type: 'application/pdf' 
      });
      console.log('📄 PDFFiller: Merged file created', mergedFile.name);
      
      return mergedFile;
    } catch (error) {
      console.error('💥 PDFFiller: Error merging PDFs:', error);
      throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async fillPDF(
    pdfFile: File,
    fields: FieldPosition[],
    formData: Record<string, string>
  ): Promise<PDFFillResult> {
    console.log('📄 PDFFiller: fillPDF called', { 
      pdfFileName: pdfFile.name, 
      fieldsLength: fields.length, 
      formData,
      fields 
    });

    try {
      // Read the PDF file
      console.log('📄 PDFFiller: Reading PDF file');
      const pdfBytes = await pdfFile.arrayBuffer();
      console.log('📄 PDFFiller: PDF file read, size:', pdfBytes.byteLength);
      
      // Load the PDF document
      console.log('📄 PDFFiller: Loading PDF document');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      console.log('📄 PDFFiller: PDF document loaded');
      
      // Get all pages
      const pages = pdfDoc.getPages();
      console.log('📄 PDFFiller: PDF pages count:', pages.length);
      
      if (pages.length === 0) {
        console.log('❌ PDFFiller: PDF has no pages');
        return { success: false, error: 'PDF has no pages' };
      }

      console.log('📄 PDFFiller: Processing all pages', pages.length);

      // Load font
      console.log('📄 PDFFiller: Loading font');
      const font = await this.loadFont(pdfDoc);
      console.log('📄 PDFFiller: Font loaded');

      // Helper function for text wrapping
      const wrapText = (text: string, maxWidth: number, fontSize: number) => {
        const allLines: string[] = [];
        const paragraphs = text.split('\n');
        for (const paragraph of paragraphs) {
          const words = paragraph.split(' ');
          let line = '';

          for (const word of words) {
            const wordWidth = font.widthOfTextAtSize(word, fontSize);

            if (wordWidth > maxWidth) {
              // Handle very long words
              if (line.length > 0) {
                allLines.push(line);
                line = '';
              }

              let tempWord = word;
              while (tempWord.length > 0) {
                let cutIndex = tempWord.length;
                while (font.widthOfTextAtSize(tempWord.substring(0, cutIndex), fontSize) > maxWidth) {
                  cutIndex--;
                }
                if (cutIndex === 0) cutIndex = 1; // Force at least one character
                allLines.push(tempWord.substring(0, cutIndex));
                tempWord = tempWord.substring(cutIndex);
              }
            } else {
              // Handle normal words
              const testLine = line.length > 0 ? `${line} ${word}` : word;
              if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
                allLines.push(line);
                line = word;
              } else {
                line = testLine;
              }
            }
          }

          if (line.length > 0) {
            allLines.push(line);
          }
        }
        return allLines;
      };

      // Fill in the text for each field
      console.log('📄 PDFFiller: Processing fields', fields);
      for (const field of fields) {
        const value = formData[field.id];
        console.log('📄 PDFFiller: Processing field', { field, value });
        
        if (!value || value.trim() === '') {
          console.log('⏭️ PDFFiller: Skipping empty field', field.id);
          continue;
        }

        // Determine which page this field belongs to
        const targetPageIndex = field.pageNumber - 1; // Convert to 0-based index
        const targetPage = pages[targetPageIndex];
        
        if (!targetPage) {
          console.log('❌ PDFFiller: Target page not found', { pageNumber: field.pageNumber, targetPageIndex, totalPages: pages.length });
          continue;
        }

        const { height: pageHeight } = targetPage.getSize();
        console.log('📄 PDFFiller: Target page dimensions', { pageHeight, pageIndex: targetPageIndex });

        // Convert coordinates from screen space to PDF space
        // PDF coordinates start from bottom-left, screen coordinates from top-left
        const pdfX = field.x;
        const pdfY = pageHeight - field.y - field.height;

        // Calculate font size based on field height
        const fontSize = Math.min(field.height * 0.7, 12);

        console.log('📄 PDFFiller: Adding text to PDF', {
          field,
          value,
          pdfX,
          pdfY,
          fontSize,
          pageIndex: targetPageIndex
        });

        // Add text to the PDF
        const lines = wrapText(value, field.width - 4, fontSize); // 4 for padding
        let y = pdfY + field.height - fontSize; // Start from top
        for (const line of lines) {
          targetPage.drawText(line.trim(), {
            x: pdfX + 2, // Small padding
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          y -= fontSize * 1.2; // Move to next line
        }
      }

      // Save the PDF
      console.log('📄 PDFFiller: Saving PDF');
      const modifiedPdfBytes = await pdfDoc.save();
      console.log('📄 PDFFiller: PDF saved, size:', modifiedPdfBytes.length);

      return {
        success: true,
        pdfBytes: modifiedPdfBytes,
      };
    } catch (error) {
      console.error('💥 PDFFiller: Error filling PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static downloadPDF(pdfBytes: Uint8Array, filename: string = 'filled-document.pdf') {
    console.log('💾 PDFFiller: downloadPDF called', { filename, pdfBytesLength: pdfBytes.length });
    
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      console.log('💾 PDFFiller: Blob created', { blobSize: blob.size, blobType: blob.type });
      
      const url = URL.createObjectURL(blob);
      console.log('💾 PDFFiller: Object URL created', url);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      console.log('💾 PDFFiller: Download link created', { href: link.href, download: link.download });
      
      document.body.appendChild(link);
      console.log('💾 PDFFiller: Link added to DOM');
      
      link.click();
      console.log('💾 PDFFiller: Download triggered');
      
      document.body.removeChild(link);
      console.log('💾 PDFFiller: Link removed from DOM');
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      console.log('💾 PDFFiller: Object URL revoked');
    } catch (error) {
      console.error('💥 PDFFiller: Error downloading PDF:', error);
      throw new Error('Failed to download PDF');
    }
  }

  static async fillAndDownloadPDF(
    pdfFile: File,
    fields: FieldPosition[],
    formData: Record<string, string>,
    filename?: string
  ): Promise<PDFFillResult> {
    console.log('📄💾 PDFFiller: fillAndDownloadPDF called', { 
      pdfFileName: pdfFile.name, 
      fieldsLength: fields.length, 
      formData,
      filename 
    });

    const result = await this.fillPDF(pdfFile, fields, formData);
    console.log('📄💾 PDFFiller: fillPDF result', result);
    
    if (result.success && result.pdfBytes) {
      console.log('📄💾 PDFFiller: Starting download');
      this.downloadPDF(result.pdfBytes, filename);
      console.log('📄💾 PDFFiller: Download completed');
    } else {
      console.log('📄💾 PDFFiller: Cannot download - fillPDF failed', result);
    }
    
    return result;
  }

  // Method to get field statistics
  static getFieldStats(fields: FieldPosition[], formData: Record<string, string>) {
    const totalFields = fields.length;
    const filledFields = fields.filter(field => {
      const value = formData[field.id];
      return value && value.trim() !== '';
    }).length;
    const emptyFields = totalFields - filledFields;

    return {
      total: totalFields,
      filled: filledFields,
      empty: emptyFields,
      completionPercentage: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
    };
  }
}
