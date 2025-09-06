import React, { useState, useCallback, useEffect } from 'react';
import PDFViewer, { type FieldPosition } from './components/PDFViewer';
import TemplateManager, { type Template } from './components/TemplateManager';
import FormBuilder from './components/FormBuilder';
import FloatingToolbar from './components/FloatingToolbar';
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

  // Load PDF file directly on component mount
  useEffect(() => {
    const loadDefaultPDF = async () => {
      try {
        const response = await fetch('/main.pdf');
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'main.pdf', { type: 'application/pdf' });
          setPdfFile(file);
          console.log('PDF loaded successfully:', file.name);
        } else {
          console.error('Failed to load PDF:', response.statusText);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadDefaultPDF();
  }, []);

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
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="app-content">
        {pdfFile ? (
          <div className="main-workspace">
            <div className="pdf-section">
              <div className="section-header">
                <h2>PDF Template Filler</h2>
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
          </div>
        ) : (
          <div className="loading-section">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h2>Loading PDF...</h2>
              <p>Please wait while we load your PDF document</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar */}
      {pdfFile && (
        <FloatingToolbar
          fields={fields}
          templates={templates}
          onFieldAdd={handleFieldAdd}
          onFieldUpdate={handleFieldUpdate}
          onFieldDelete={handleFieldDelete}
          selectedFieldId={selectedFieldId}
          onFieldSelect={handleFieldSelect}
          formData={formData}
          onFormDataChange={handleFormDataChange}
          onTemplateSave={handleTemplateSave}
          onTemplateLoad={handleTemplateLoad}
          onTemplateDelete={handleTemplateDelete}
          onFillAndDownload={handleFillAndDownload}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

export default App;