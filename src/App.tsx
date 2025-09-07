import React, { useState, useCallback, useEffect } from 'react';
import PDFViewer, { type FieldPosition } from './components/PDFViewer';
import { type Template } from './components/TemplateManager';
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
  const [movable, setMovable] = useState<boolean>(false); // Controls if fields can be created/moved

  // Static fields configuration - you can provide this data
  // Fields for different pages - Page 1 fields
  const staticFields: FieldPosition[] = [
    {
        "id": "field_1757231747796",
        "x": 140.44602584838867,
        "y": 146.84091186523438,
        "width": 302,
        "height": 20,
        "label": "Student Name",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231755821",
        "x": 92.77415084838867,
        "y": 170.84091186523438,
        "width": 350,
        "height": 20,
        "label": "URN",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231762714",
        "x": 181.6519889831543,
        "y": 193.84091186523438,
        "width": 100,
        "height": 20,
        "label": "Div",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231779180",
        "x": 142.4673309326172,
        "y": 250.84091186523438,
        "width": 396,
        "height": 20,
        "label": "Activity Name",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231787912",
        "x": 147.33238983154297,
        "y": 272.8409118652344,
        "width": 391,
        "height": 20,
        "label": "Types of Activity",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231797700",
        "x": 106.5383529663086,
        "y": 293.8409118652344,
        "width": 175,
        "height": 20,
        "label": "Date",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231812429",
        "x": 163.3892059326172,
        "y": 313.8409118652344,
        "width": 375,
        "height": 20,
        "label": "Place/Org",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757231818844",
        "x": 145.9289779663086,
        "y": 336.8409118652344,
        "width": 100,
        "height": 20,
        "label": "Hrs",
        "type": "text",
        "pageNumber": 1
    }
]

  // Load and merge PDF files directly on component mount
  useEffect(() => {
    const loadAndMergePDFs = async () => {
      try {
        console.log('Loading main.pdf and main1.pdf...');
        
        // Load both PDF files
        const [mainResponse, main1Response] = await Promise.all([
          fetch('/main.pdf'),
          fetch('/main1.pdf')
        ]);

        if (!mainResponse.ok || !main1Response.ok) {
          throw new Error('Failed to load one or both PDF files');
        }

        const [mainBlob, main1Blob] = await Promise.all([
          mainResponse.blob(),
          main1Response.blob()
        ]);

        const [mainFile, main1File] = [
          new File([mainBlob], 'main.pdf', { type: 'application/pdf' }),
          new File([main1Blob], 'main1.pdf', { type: 'application/pdf' })
        ];

        console.log('Both PDFs loaded successfully, merging...');
        
        // Merge the PDFs using PDFFiller
        const mergedFile = await PDFFiller.mergePDFs(mainFile, main1File);
        setPdfFile(mergedFile);
        console.log('PDFs merged successfully:', mergedFile.name);
      } catch (error) {
        console.error('Error loading or merging PDFs:', error);
        // Fallback to just main.pdf if merging fails
        try {
          const response = await fetch('/main.pdf');
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], 'main.pdf', { type: 'application/pdf' });
            setPdfFile(file);
            console.log('Fallback: main.pdf loaded successfully');
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    };

    loadAndMergePDFs();
  }, []);

  // Load static fields on initial load
  useEffect(() => {
    if (staticFields.length > 0) {
      console.log('📋 Loading static fields:', staticFields);
      setFields(staticFields);
      
      // Initialize form data for static fields
      const initialFormData: Record<string, string> = {};
      staticFields.forEach(field => {
        initialFormData[field.id] = '';
      });
      setFormData(initialFormData);
      
      console.log('✅ Static fields loaded successfully');
    }
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


  const handleFieldAdd = useCallback((field: FieldPosition) => {
    console.log('➕ App: handleFieldAdd called', field);
    
    // Console log the field data in a format that can be easily copied
    console.log('📋 Field Data for Static Configuration:');
    console.log(JSON.stringify(field, null, 2));
    console.log('📋 Copy this field data to add to staticFields array');
    
    setFields(prev => {
      const newFields = [...prev, field];
      console.log('➕ App: Fields updated', { oldFields: prev, newFields });
      
      // Console log all current fields in static configuration format
      console.log('📋 All Current Fields for Static Configuration:');
      console.log(JSON.stringify(newFields, null, 2));
      console.log('📋 Copy this entire array to replace staticFields');
      
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
    setFields(prev => {
      const updatedFields = prev.map(field => 
        field.id === id ? { ...field, ...updates } : field
      );
      
      // Console log updated fields when position changes
      if (updates.x !== undefined || updates.y !== undefined) {
        console.log('📍 Field position updated:', { id, updates });
        console.log('📋 Updated Fields for Static Configuration:');
        console.log(JSON.stringify(updatedFields, null, 2));
        console.log('📋 Copy this entire array to replace staticFields');
      }
      
      return updatedFields;
    });
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

  // Helper function to export current fields configuration
  const exportFieldsConfiguration = useCallback(() => {
    console.log('📋 EXPORT FIELDS CONFIGURATION');
    console.log('================================');
    console.log('Copy this code to replace the staticFields array:');
    console.log('');
    console.log('const staticFields: FieldPosition[] = ' + JSON.stringify(fields, null, 2) + ';');
    console.log('');
    console.log('================================');
    console.log('Total fields:', fields.length);
    console.log('Fields data:', fields);
  }, [fields]);

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
                <h2>FataakFill</h2>
                <div className="field-stats">
                  <span>Total Fields: {fieldStats.total}</span>
                  <span>Filled: {fieldStats.filled}</span>
                  <span>Completion: {fieldStats.completionPercentage}%</span>
                  <span>Pages: {Math.max(...fields.map(f => f.pageNumber), 1)}</span>
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
                movable={movable}
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
          movable={movable}
          onMovableToggle={() => setMovable(!movable)}
          onExportFields={exportFieldsConfiguration}
        />
      )}
    </div>
  );
}

export default App;