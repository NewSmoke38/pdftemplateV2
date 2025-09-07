import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  pageNumber: number; // Page number where this field is located (1-based)
  multiline?: boolean;
}

interface PDFViewerProps {
  file: File | null;
  fields: FieldPosition[];
  onFieldAdd: (field: FieldPosition) => void;
  onFieldUpdate: (id: string, field: Partial<FieldPosition>) => void;
  onFieldDelete: (id: string) => void;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  movable: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  fields,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  selectedFieldId,
  onFieldSelect,
  movable,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isAddingField, setIsAddingField] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [newField, setNewField] = useState<Partial<FieldPosition> | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Detect mobile and set appropriate scale
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && scale > 0.8) {
        setScale(0.8); // Set smaller scale for mobile
      } else if (!mobile && scale < 1.0) {
        setScale(1.0); // Reset to normal scale for desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [scale]);

  // Add global mouse up listener to handle dragging outside the container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragFieldId(null);
        setDragOffset(null);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Add keyboard controls for field positioning
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard shortcuts if an input field is focused
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (!movable || !selectedFieldId) return;

      const field = fields.find(f => f.id === selectedFieldId);
      if (!field) return;

      const step = event.shiftKey ? 10 : 1; // Shift for larger steps
      let newX = field.x;
      let newY = field.y;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          newY = Math.max(0, field.y - step);
          break;
        case 'ArrowDown':
          event.preventDefault();
          newY = field.y + step;
          break;
        case 'ArrowLeft':
          event.preventDefault();
          newX = Math.max(0, field.x - step);
          break;
        case 'ArrowRight':
          event.preventDefault();
          newX = field.x + step;
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          onFieldDelete(selectedFieldId);
          return;
        default:
          return;
      }

      onFieldUpdate(selectedFieldId, { x: newX, y: newY });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [movable, selectedFieldId, fields, onFieldUpdate, onFieldDelete]);

  const handlePageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    console.log('🖱️ PDFViewer: handlePageClick called', { isAddingField, dragStart, fieldsLength: fields.length, movable });
    
    if (!movable || !isAddingField || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

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
        pageNumber: pageNumber,
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
        pageNumber: pageNumber,
      };

      console.log('✅ PDFViewer: Creating new field', field);
      onFieldAdd(field);
      setIsAddingField(false);
      setDragStart(null);
      setNewField(null);
      console.log('🔄 PDFViewer: Field creation completed, resetting state');
    }
  }, [movable, isAddingField, dragStart, fields.length, onFieldAdd, scale, pageNumber]);

  // Touch support for mobile devices
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!isAddingField || !pageRef.current) return;
    
    const touch = event.touches[0];
    const rect = pageRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / scale;
    const y = (touch.clientY - rect.top) / scale;

    if (!dragStart) {
      setDragStart({ x, y });
      setNewField({
        x,
        y,
        width: 0,
        height: 0,
        label: `Field ${fields.length + 1}`,
        type: 'text',
      });
    }
  }, [isAddingField, dragStart, fields.length, scale]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      setDragFieldId(null);
      setDragOffset(null);
    } else if (isAddingField && dragStart && pageRef.current) {
      const touch = event.changedTouches[0];
      const rect = pageRef.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / scale;
      const y = (touch.clientY - rect.top) / scale;

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
        pageNumber: pageNumber,
      };

      onFieldAdd(field);
      setIsAddingField(false);
      setDragStart(null);
      setNewField(null);
    }
  }, [isDragging, isAddingField, dragStart, fields.length, onFieldAdd, scale, pageNumber]);

  const handleFieldTouchStart = useCallback((event: React.TouchEvent, fieldId: string) => {
    event.stopPropagation();
    if (!movable || !pageRef.current) return;

    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const touch = event.touches[0];
    const rect = pageRef.current.getBoundingClientRect();
    const touchX = (touch.clientX - rect.left) / scale;
    const touchY = (touch.clientY - rect.top) / scale;

    // Calculate offset from touch to field position
    const offsetX = touchX - field.x;
    const offsetY = touchY - field.y;

    setIsDragging(true);
    setDragFieldId(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    onFieldSelect(fieldId);
  }, [movable, fields, onFieldSelect, scale]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && dragFieldId && dragOffset && pageRef.current) {
      const touch = event.touches[0];
      const rect = pageRef.current.getBoundingClientRect();
      const touchX = (touch.clientX - rect.left) / scale;
      const touchY = (touch.clientY - rect.top) / scale;

      const newX = touchX - dragOffset.x;
      const newY = touchY - dragOffset.y;

      onFieldUpdate(dragFieldId, { x: newX, y: newY });
    }
  }, [isDragging, dragFieldId, dragOffset, onFieldUpdate, scale]);


  const handleFieldClick = (event: React.MouseEvent, fieldId: string) => {
    event.stopPropagation();
    onFieldSelect(fieldId);
    if (movable) {
      setShowKeyboardHelp(true);
      // Hide help after 3 seconds
      setTimeout(() => setShowKeyboardHelp(false), 3000);
    }
  };

  const handleFieldDoubleClick = (event: React.MouseEvent, fieldId: string) => {
    event.stopPropagation();
    if (!movable) return;
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setEditingFieldId(fieldId);
    setEditingLabel(field.label);
    
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  const handleLabelSave = () => {
    if (editingFieldId && editingLabel.trim()) {
      onFieldUpdate(editingFieldId, { label: editingLabel.trim() });
    }
    setEditingFieldId(null);
    setEditingLabel('');
  };

  const handleLabelCancel = () => {
    setEditingFieldId(null);
    setEditingLabel('');
  };

  const handleLabelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLabelSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleLabelCancel();
    }
  };

  const handleFieldMouseDown = (event: React.MouseEvent, fieldId: string) => {
    event.stopPropagation();
    if (!movable || !pageRef.current) return;

    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const rect = pageRef.current.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / scale;
    const mouseY = (event.clientY - rect.top) / scale;

    // Calculate offset from mouse to field position
    const offsetX = mouseX - field.x;
    const offsetY = mouseY - field.y;

    setIsDragging(true);
    setDragFieldId(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    onFieldSelect(fieldId);
  };

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && dragFieldId && dragOffset && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) / scale;
      const mouseY = (event.clientY - rect.top) / scale;

      const newX = mouseX - dragOffset.x;
      const newY = mouseY - dragOffset.y;

      onFieldUpdate(dragFieldId, { x: newX, y: newY });
    } else if (isAddingField && dragStart && newField && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;

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
    }
  }, [isDragging, dragFieldId, dragOffset, isAddingField, dragStart, newField, onFieldUpdate, scale]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragFieldId(null);
      setDragOffset(null);
    }
  }, [isDragging]);

  const handleFieldResize = (event: React.MouseEvent, fieldId: string, direction: string) => {
    event.stopPropagation();
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

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
        {movable && (
          <button
            onClick={() => {
              console.log('➕ PDFViewer: Add Field button clicked', { isAddingField });
              setIsAddingField(!isAddingField);
            }}
            className={isAddingField ? 'active' : ''}
          >
            {isAddingField ? 'Cancel Adding Field' : 'Add Field'}
          </button>
        )}
        <div className="page-controls">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages} 
            ({fields.filter(f => f.pageNumber === pageNumber).length} fields)
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
          >
            Next
          </button>
        </div>
        <div className="scale-controls">
          <button onClick={() => setScale(Math.max(0.3, scale - 0.1))}>-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(isMobile ? 1.2 : 2.0, scale + 0.1))}>+</button>
        </div>
      </div>

      <div className="pdf-container">
        {file && (
          <div
            ref={pageRef}
            className="pdf-page-container"
            onClick={handlePageClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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

            {/* Render existing fields for current page */}
            {fields.filter(field => field.pageNumber === pageNumber).map((field) => (
              <div
                key={field.id}
                className={`field-overlay ${selectedFieldId === field.id ? 'selected' : ''} ${isDragging && dragFieldId === field.id ? 'dragging' : ''} ${editingFieldId === field.id ? 'editing' : ''} ${movable ? 'movable' : ''}`}
                style={{
                  position: 'absolute',
                  left: field.x * scale,
                  top: field.y * scale,
                  width: field.width * scale,
                  height: field.height * scale,
                  border: '2px dashed #007bff',
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                  cursor: movable ? 'move' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#007bff',
                  fontWeight: 'bold',
                }}
                onClick={(e) => handleFieldClick(e, field.id)}
                onDoubleClick={(e) => handleFieldDoubleClick(e, field.id)}
                onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                onTouchStart={(e) => handleFieldTouchStart(e, field.id)}
              >
                {editingFieldId === field.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={handleLabelSave}
                    onKeyDown={handleLabelKeyDown}
                    className="field-edit-input"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  field.label
                )}
                {selectedFieldId === field.id && movable && (
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
                  left: (newField.x || 0) * scale,
                  top: (newField.y || 0) * scale,
                  width: (newField.width || 0) * scale,
                  height: (newField.height || 0) * scale,
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

      {/* Keyboard Help Tooltip */}
      {showKeyboardHelp && selectedFieldId && movable && (
        <div className="keyboard-help-tooltip">
          <div className="keyboard-help-content">
            <h4>⌨️ Keyboard Controls</h4>
            <div className="keyboard-shortcuts">
              <div className="shortcut-item">
                <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
                <span>Move field (1px)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Shift</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
                <span>Move field (10px)</span>
              </div>
              <div className="shortcut-item">
                <kbd>Delete</kbd> / <kbd>Backspace</kbd>
                <span>Delete field</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
