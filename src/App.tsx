import React, { useState, useCallback } from 'react';
import PDFViewer, { type FieldPosition } from './components/PDFViewer';
import TemplateManager, { type Template } from './components/TemplateManager';
import FormBuilder from './components/FormBuilder';
import { PDFFiller } from './utils/pdfFiller';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldPosition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load templates from localStorage on component mount
  React.useEffect(() => {
    const savedTemplates = localStorage.getItem('pdfTemplates');
    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates).map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt),
        }));
        setTemplates(parsedTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
  }, []);

  // Save templates to localStorage whenever templates change
  React.useEffect(() => {
    localStorage.setItem('pdfTemplates', JSON.stringify(templates));
  }, [templates]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setFields([]);
      setFormData({});
      setSelectedFieldId(null);
      showNotification('success', 'PDF loaded successfully');
    } else {
      showNotification('error', 'Please select a valid PDF file');
    }
  }, [showNotification]);

  const handleFieldAdd = useCallback((field: FieldPosition) => {
    console.log('➕ App: handleFieldAdd called', field);
    setFields(prev => {
      const newFields = [...prev, field];
      console.log('➕ App: Fields updated', { oldFields: prev, newFields });
      return newFields;
    });
    setFormData(prev => {
      const newFormData = { ...prev, [field.id]: '' };
      console.log('➕ App: Form data initialized for new field', { oldFormData: prev, newFormData });
      return newFormData;
    });
    setSelectedFieldId(field.id);
    console.log('➕ App: Field selected', field.id);
    showNotification('success', 'Field added successfully');
  }, [showNotification]);

  const handleFieldUpdate = useCallback((id: string, updates: Partial<FieldPosition>) => {
    setFields(prev => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  }, []);

  const handleFieldDelete = useCallback((id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
    showNotification('success', 'Field deleted successfully');
  }, [selectedFieldId, showNotification]);

  const handleFieldSelect = useCallback((id: string | null) => {
    setSelectedFieldId(id);
  }, []);

  const handleFormDataChange = useCallback((fieldId: string, value: string) => {
    console.log('📝 App: handleFormDataChange called', { fieldId, value });
    setFormData(prev => {
      const newData = { ...prev, [fieldId]: value };
      console.log('📝 App: Form data updated', { oldData: prev, newData });
      return newData;
    });
  }, []);

  const handleTemplateSave = useCallback((templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('💾 App: handleTemplateSave called', templateData);
    const newTemplate: Template = {
      ...templateData,
      id: `template_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    console.log('💾 App: Creating new template', newTemplate);
    setTemplates(prev => {
      const newTemplates = [...prev, newTemplate];
      console.log('💾 App: Templates updated', { oldTemplates: prev, newTemplates });
      return newTemplates;
    });
    showNotification('success', 'Template saved successfully');
  }, [showNotification]);

  const handleTemplateLoad = useCallback((template: Template) => {
    setFields(template.fields);
    setFormData({});
    setSelectedFieldId(null);
    showNotification('success', 'Template loaded successfully');
  }, [showNotification]);

  const handleTemplateDelete = useCallback((id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    showNotification('success', 'Template deleted successfully');
  }, [showNotification]);

  const handleFillAndDownload = useCallback(async () => {
    console.log('📄 App: handleFillAndDownload called', { 
      pdfFile: pdfFile?.name, 
      fieldsLength: fields.length, 
      formData,
      fields 
    });

    if (!pdfFile) {
      console.log('❌ App: No PDF file uploaded');
      showNotification('error', 'Please upload a PDF file first');
      return;
    }

    if (fields.length === 0) {
      console.log('❌ App: No fields added');
      showNotification('error', 'Please add at least one field to the PDF');
      return;
    }

    console.log('🔍 App: Validating form data', { fields, formData });
    const validation = PDFFiller.validateFormData(fields, formData);
    console.log('🔍 App: Validation result', validation);
    
    if (!validation.isValid) {
      console.log('❌ App: Validation failed', validation.errors);
      showNotification('error', `Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    console.log('⚙️ App: Starting PDF processing');
    setIsProcessing(true);
    try {
      const result = await PDFFiller.fillAndDownloadPDF(
        pdfFile,
        fields,
        formData,
        `filled-${pdfFile.name}`
      );

      console.log('📄 App: PDF processing result', result);

      if (result.success) {
        console.log('✅ App: PDF filled and downloaded successfully');
        showNotification('success', 'PDF filled and downloaded successfully');
      } else {
        console.log('❌ App: PDF processing failed', result.error);
        showNotification('error', result.error || 'Failed to fill PDF');
      }
    } catch (error) {
      console.log('💥 App: PDF processing error', error);
      showNotification('error', 'An error occurred while processing the PDF');
      console.error('Error:', error);
    } finally {
      console.log('🔄 App: PDF processing completed, setting isProcessing to false');
      setIsProcessing(false);
    }
  }, [pdfFile, fields, formData, showNotification]);

  const fieldStats = PDFFiller.getFieldStats(fields, formData);

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Template Filler</h1>
        <p>Upload a PDF, add fields with coordinates, fill them with data, and download the result</p>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="app-content">
        <div className="upload-section">
          <div className="file-upload">
            <label htmlFor="pdf-upload" className="upload-label">
              <span className="upload-icon">📄</span>
              <span>Choose PDF File</span>
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="file-input"
            />
            {pdfFile && (
              <div className="file-info">
                <span>📄 {pdfFile.name}</span>
                <span className="file-size">
                  ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>
        </div>

        {pdfFile && (
          <div className="main-workspace">
            <div className="pdf-section">
              <div className="section-header">
                <h2>PDF Viewer & Field Editor</h2>
                <div className="field-stats">
                  <span>Fields: {fieldStats.total}</span>
                  <span>Filled: {fieldStats.filled}</span>
                  <span>Completion: {fieldStats.completionPercentage}%</span>
                </div>
              </div>
              <PDFViewer
                file={pdfFile}
                fields={fields}
                onFieldAdd={handleFieldAdd}
                onFieldUpdate={handleFieldUpdate}
                onFieldDelete={handleFieldDelete}
                selectedFieldId={selectedFieldId}
                onFieldSelect={handleFieldSelect}
              />
            </div>

            <div className="sidebar">
              <div className="template-section">
                <TemplateManager
                  templates={templates}
                  onTemplateSave={handleTemplateSave}
                  onTemplateLoad={handleTemplateLoad}
                  onTemplateDelete={handleTemplateDelete}
                  currentFields={fields}
                />
              </div>

              <div className="form-section">
                <FormBuilder
                  fields={fields}
                  onFieldUpdate={handleFieldUpdate}
                  onFieldDelete={handleFieldDelete}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={handleFieldSelect}
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                />
              </div>

              <div className="download-section">
                <button
                  onClick={() => {
                    console.log('📄 App: Fill & Download button clicked', { 
                      isProcessing, 
                      fieldsLength: fields.length,
                      formData 
                    });
                    handleFillAndDownload();
                  }}
                  disabled={isProcessing || fields.length === 0}
                  className="download-btn"
                >
                  {isProcessing ? 'Processing...' : 'Fill & Download PDF'}
                </button>
                <p className="download-info">
                  {fields.length === 0 
                    ? 'Add fields to the PDF first' 
                    : `Ready to fill ${fieldStats.filled}/${fieldStats.total} fields`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {!pdfFile && (
          <div className="welcome-section">
            <div className="welcome-content">
              <h2>Welcome to PDF Template Filler</h2>
              <div className="features">
                <div className="feature">
                  <span className="feature-icon">📄</span>
                  <h3>Upload PDF</h3>
                  <p>Upload any PDF document to start creating your template</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">📍</span>
                  <h3>Add Fields</h3>
                  <p>Click and drag to add text fields at precise coordinates</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">💾</span>
                  <h3>Save Templates</h3>
                  <p>Save your field configurations for reuse</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">📝</span>
                  <h3>Fill & Download</h3>
                  <p>Fill in your data and download the completed PDF</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;