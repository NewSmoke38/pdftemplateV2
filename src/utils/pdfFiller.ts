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
      
      // Get the first page (you can modify this to handle multiple pages)
      const pages = pdfDoc.getPages();
      console.log('📄 PDFFiller: PDF pages count:', pages.length);
      
      if (pages.length === 0) {
        console.log('❌ PDFFiller: PDF has no pages');
        return { success: false, error: 'PDF has no pages' };
      }

      const page = pages[0];
      const { height: pageHeight } = page.getSize();
      console.log('📄 PDFFiller: Page dimensions', { pageHeight });

      // Load font
      console.log('📄 PDFFiller: Loading font');
      const font = await this.loadFont(pdfDoc);
      console.log('📄 PDFFiller: Font loaded');

      // Fill in the text for each field
      console.log('📄 PDFFiller: Processing fields', fields);
      for (const field of fields) {
        const value = formData[field.id];
        console.log('📄 PDFFiller: Processing field', { field, value });
        
        if (!value || value.trim() === '') {
          console.log('⏭️ PDFFiller: Skipping empty field', field.id);
          continue;
        }

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
          fontSize
        });

        // Add text to the PDF
        page.drawText(value, {
          x: pdfX + 2, // Small padding from field border
          y: pdfY + (field.height - fontSize) / 2, // Center vertically
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0), // Black text
        });
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

  // Utility method to validate form data
  static validateFormData(fields: FieldPosition[], formData: Record<string, string>): {
    isValid: boolean;
    errors: string[];
  } {
    console.log('🔍 PDFFiller: validateFormData called', { fields, formData });
    const errors: string[] = [];

    for (const field of fields) {
      const value = formData[field.id];
      console.log('🔍 PDFFiller: Validating field', { field, value });
      
      if (!value || value.trim() === '') {
        console.log('❌ PDFFiller: Field is empty', field.label);
        errors.push(`Field "${field.label}" is required`);
        continue;
      }

      // Type-specific validation
      switch (field.type) {
        case 'number':
          if (isNaN(Number(value))) {
            console.log('❌ PDFFiller: Field is not a valid number', field.label, value);
            errors.push(`Field "${field.label}" must be a valid number`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            console.log('❌ PDFFiller: Field is not a valid date', field.label, value);
            errors.push(`Field "${field.label}" must be a valid date`);
          }
          break;
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors,
    };

    console.log('🔍 PDFFiller: Validation result', result);
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
