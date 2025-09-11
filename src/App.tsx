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
        "id": "field_1757256490526",
        "x": 283.8359375,
        "y": 179.7265625,
        "width": 239,
        "height": 20,
        "label": "Nature of Activity",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256521542",
        "x": 184.1640625,
        "y": 205.7265625,
        "width": 283,
        "height": 24,
        "label": "Name of Student",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256539025",
        "x": 416.046875,
        "y": 229.7265625,
        "width": 128,
        "height": 20,
        "label": "Division",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256554758",
        "x": 182.859375,
        "y": 251.7265625,
        "width": 239,
        "height": 24,
        "label": "Date of Activity",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256570626",
        "x": 182.7265625,
        "y": 277.7265625,
        "width": 241,
        "height": 20,
        "label": "Time",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256580259",
        "x": 183.9296875,
        "y": 300.7265625,
        "width": 245,
        "height": 20,
        "label": "Venue",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256590911",
        "x": 184.78125,
        "y": 324.7265625,
        "width": 244,
        "height": 20,
        "label": "Organized by",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256604563",
        "x": 183.3203125,
        "y": 349.7265625,
        "width": 241.6796875,
        "height": 27,
        "label": "Name of Faculty In charge",
        "type": "text",
        "pageNumber": 1
    },
    {
        "id": "field_1757256681412",
        "x": 76.765625,
        "y": 419.2265625,
        "width": 500,
        "height": 114,
        "label": "Objectives of the Activity",
        "type": "text",
        "pageNumber": 1,
        "multiline": true
    },
    {
        "id": "field_1757256720515",
        "x": 74.78125,
        "y": 554.2265625,
        "width": 503,
        "height": 200,
        "label": "Execution of Activity",
        "type": "text",
        "pageNumber": 1,
        "multiline": true
    },
    {
        "id": "field_1757256794979",
        "x": 72.6484375,
        "y": 170.7265625,
        "width": 509,
        "height": 227,
        "label": "Outcomes",
        "type": "text",
        "pageNumber": 2,
        "multiline": true
    }
]

// const dummyData: Record<string, string> = {
//   "field_1757231747796": "Shivani Sharma",
//   "field_1757231755821": "2110992222",
//   "field_1757231762714": "BE-11",
//   "field_1757231779180": "Won 1st prize in hackathon",
//   "field_1757231787912": "Technical",
//   "field_1757256306444": "2024-01-15",
//   "field_1757231812429": "Chandigarh University",
//   "field_1757256296778": "10",
//   "field_1757250271849": "10",
//   "field_1757250592332": "2024-01-20",
//   "field_1757256490526": "Technical",
//   "field_1757256521542": "Shivani Sharma",
//   "field_1757256539025": "BE-11",
//   "field_1757256554758": "2024-01-15",
//   "field_1757256570626": "10:00 AM",
//   "field_1757256580259": "Chandigarh University",
//   "field_1757256590911": "Dr. APJ Abdul Kalam Block",
//   "field_1757256604563": "Dr. S.S. Bhatnagar",
//   "field_1757256681412": `1. To win the hackathon.
// 2. To learn new technologies.
// 3. To work in a team.
// 4. To solve a real-world problem.
// 5. To have fun.`,
//   "field_1757256720515": `1. We started by brainstorming ideas.
// 2. We then created a plan and divided the work.
// 3. We worked on the project for 24 hours straight.
// 4. We faced many challenges but we overcame them.
// 5. We finally completed the project and presented it to the judges.`,
//   "field_1757256794979": `1. We won the first prize in the hackathon.
// 2. We learned a lot of new things.
// 3. We worked as a team and supported each other.
// 4. We are proud of our project and what we accomplished.
// 5. We are now more confident in our abilities.`,
// };


  // Load PDF file directly on component mount
  useEffect(() => {
    const loadPDF = async () => {
      try {
        console.log('Loading main1.pdf...');
        
        // Load PDF file
        const response = await fetch('/main1.pdf');

        if (!response.ok) {
          throw new Error('Failed to load PDF file');
        }

        const blob = await response.blob();
        const file = new File([blob], 'main1.pdf', { type: 'application/pdf' });

        setPdfFile(file);
        console.log('PDF loaded successfully:', file.name);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPDF();
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

  // const handleFillWithDummyData = () => {
  //   setFormData(dummyData);
  //   showNotification('success', 'Form filled with dummy data!');
  // };

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
        {/* <button onClick={handleFillWithDummyData} style={{ marginBottom: '1rem' }}>Fill with Dummy Data</button> */}
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