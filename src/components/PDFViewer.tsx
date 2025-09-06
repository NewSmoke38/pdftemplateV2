import React, { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface FieldPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'text' | 'date' | 'number';
}

interface PDFViewerProps {
  file: File | null;
  fields: FieldPosition[];
  onFieldAdd: (field: FieldPosition) => void;
  onFieldUpdate: (id: string, field: Partial<FieldPosition>) => void;
  onFieldDelete: (id: string) => void;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  fields,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  selectedFieldId,
  onFieldSelect,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isAddingField, setIsAddingField] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [newField, setNewField] = useState<Partial<FieldPosition> | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    console.log('🖱️ PDFViewer: handlePageClick called', { isAddingField, dragStart, fieldsLength: fields.length });
    
    if (!isAddingField || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('📍 PDFViewer: Mouse position calculated', { x, y, rect });

    if (!dragStart) {
      console.log('🎯 PDFViewer: Starting field creation', { x, y });
      setDragStart({ x, y });
      setNewField({
        x,
        y,
        width: 0,
        height: 0,
        label: `Field ${fields.length + 1}`,
        type: 'text',
      });
    } else {
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);
      const finalX = Math.min(x, dragStart.x);
      const finalY = Math.min(y, dragStart.y);

      const field: FieldPosition = {
        id: `field_${Date.now()}`,
        x: finalX,
        y: finalY,
        width: Math.max(width, 100),
        height: Math.max(height, 20),
        label: `Field ${fields.length + 1}`,
        type: 'text',
      };

      console.log('✅ PDFViewer: Creating new field', field);
      onFieldAdd(field);
      setIsAddingField(false);
      setDragStart(null);
      setNewField(null);
      console.log('🔄 PDFViewer: Field creation completed, resetting state');
    }
  }, [isAddingField, dragStart, fields.length, onFieldAdd]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingField || !dragStart || !newField || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    const finalX = Math.min(x, dragStart.x);
    const finalY = Math.min(y, dragStart.y);

    setNewField({
      ...newField,
      x: finalX,
      y: finalY,
      width: Math.max(width, 100),
      height: Math.max(height, 20),
    });
  }, [isAddingField, dragStart, newField]);

  const handleFieldClick = (event: React.MouseEvent, fieldId: string) => {
    event.stopPropagation();
    onFieldSelect(fieldId);
  };

  const handleFieldDrag = (event: React.MouseEvent, fieldId: string) => {
    event.stopPropagation();
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onFieldUpdate(fieldId, { x, y });
  };

  const handleFieldResize = (event: React.MouseEvent, fieldId: string, direction: string) => {
    event.stopPropagation();
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    let updates: Partial<FieldPosition> = {};

    switch (direction) {
      case 'se':
        updates = {
          width: Math.max(x - field.x, 50),
          height: Math.max(y - field.y, 20),
        };
        break;
      case 'sw':
        updates = {
          x: Math.min(x, field.x + field.width - 50),
          width: Math.max(field.x + field.width - x, 50),
        };
        break;
      case 'ne':
        updates = {
          y: Math.min(y, field.y + field.height - 20),
          height: Math.max(field.y + field.height - y, 20),
        };
        break;
      case 'nw':
        updates = {
          x: Math.min(x, field.x + field.width - 50),
          y: Math.min(y, field.y + field.height - 20),
          width: Math.max(field.x + field.width - x, 50),
          height: Math.max(field.y + field.height - y, 20),
        };
        break;
    }

    onFieldUpdate(fieldId, updates);
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button
          onClick={() => {
            console.log('➕ PDFViewer: Add Field button clicked', { isAddingField });
            setIsAddingField(!isAddingField);
          }}
          className={isAddingField ? 'active' : ''}
        >
          {isAddingField ? 'Cancel Adding Field' : 'Add Field'}
        </button>
        <div className="page-controls">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
          >
            Next
          </button>
        </div>
        <div className="scale-controls">
          <button onClick={() => setScale(Math.max(0.5, scale - 0.1))}>-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(2.0, scale + 0.1))}>+</button>
        </div>
      </div>

      <div className="pdf-container">
        {file && (
          <div
            ref={pageRef}
            className="pdf-page-container"
            onClick={handlePageClick}
            onMouseMove={handleMouseMove}
            style={{ position: 'relative' }}
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div>Loading PDF...</div>}
              error={<div>Error loading PDF</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Render existing fields */}
            {fields.map((field) => (
              <div
                key={field.id}
                className={`field-overlay ${selectedFieldId === field.id ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: field.x,
                  top: field.y,
                  width: field.width,
                  height: field.height,
                  border: '2px dashed #007bff',
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                  cursor: 'move',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#007bff',
                  fontWeight: 'bold',
                }}
                onClick={(e) => handleFieldClick(e, field.id)}
                onMouseDown={(e) => handleFieldDrag(e, field.id)}
              >
                {field.label}
                {selectedFieldId === field.id && (
                  <>
                    <div
                      className="resize-handle se"
                      onMouseDown={(e) => handleFieldResize(e, field.id, 'se')}
                    />
                    <div
                      className="resize-handle sw"
                      onMouseDown={(e) => handleFieldResize(e, field.id, 'sw')}
                    />
                    <div
                      className="resize-handle ne"
                      onMouseDown={(e) => handleFieldResize(e, field.id, 'ne')}
                    />
                    <div
                      className="resize-handle nw"
                      onMouseDown={(e) => handleFieldResize(e, field.id, 'nw')}
                    />
                    <button
                      className="delete-field"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldDelete(field.id);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Render new field being created */}
            {newField && (
              <div
                className="field-overlay new"
                style={{
                  position: 'absolute',
                  left: newField.x,
                  top: newField.y,
                  width: newField.width,
                  height: newField.height,
                  border: '2px dashed #28a745',
                  backgroundColor: 'rgba(40, 167, 69, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#28a745',
                  fontWeight: 'bold',
                }}
              >
                New Field
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
