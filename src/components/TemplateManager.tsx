import React, { useState } from 'react';
import { type FieldPosition } from './PDFViewer';

export interface Template {
  id: string;
  name: string;
  description: string;
  fields: FieldPosition[];
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateManagerProps {
  templates: Template[];
  onTemplateSave: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTemplateLoad: (template: Template) => void;
  onTemplateDelete: (id: string) => void;
  currentFields: FieldPosition[];
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onTemplateSave,
  onTemplateLoad,
  onTemplateDelete,
  currentFields,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSaveTemplate = () => {
    console.log('💾 TemplateManager: handleSaveTemplate called', { 
      templateName, 
      templateDescription, 
      currentFieldsLength: currentFields.length,
      currentFields 
    });

    if (!templateName.trim()) {
      console.log('❌ TemplateManager: Template name is empty');
      alert('Please enter a template name');
      return;
    }

    if (currentFields.length === 0) {
      console.log('❌ TemplateManager: No fields to save');
      alert('Please add at least one field to save as template');
      return;
    }

    const templateData = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      fields: currentFields,
    };

    console.log('✅ TemplateManager: Saving template', templateData);
    onTemplateSave(templateData);

    setTemplateName('');
    setTemplateDescription('');
    setShowSaveDialog(false);
    console.log('🔄 TemplateManager: Template saved, dialog closed');
  };

  const handleLoadTemplate = (template: Template) => {
    onTemplateLoad(template);
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      onTemplateDelete(id);
    }
  };

  return (
    <div className="template-manager">
      <div className="template-controls">
        <button
          onClick={() => {
            console.log('💾 TemplateManager: Save Template button clicked', { currentFieldsLength: currentFields.length });
            setShowSaveDialog(true);
          }}
          disabled={currentFields.length === 0}
          className="save-template-btn"
        >
          Save Template
        </button>
        <button
          onClick={() => {
            console.log('📂 TemplateManager: Load Template button clicked', { showTemplates });
            setShowTemplates(!showTemplates);
          }}
          className="load-template-btn"
        >
          Load Template
        </button>
      </div>

      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Save Template</h3>
            <div className="form-group">
              <label htmlFor="templateName">Template Name:</label>
              <input
                id="templateName"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label htmlFor="templateDescription">Description (optional):</label>
              <textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description"
                rows={3}
                maxLength={200}
              />
            </div>
            <div className="form-group">
              <p>Fields to save: {currentFields.length}</p>
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveTemplate} className="primary">
                Save
              </button>
              <button onClick={() => {
                console.log('❌ TemplateManager: Cancel button clicked');
                setShowSaveDialog(false);
              }} className="secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="modal-overlay">
          <div className="modal templates-modal">
            <h3>Load Template</h3>
            {templates.length === 0 ? (
              <p>No templates saved yet.</p>
            ) : (
              <div className="templates-list">
                {templates.map((template) => (
                  <div key={template.id} className="template-item">
                    <div className="template-info">
                      <h4>{template.name}</h4>
                      {template.description && (
                        <p className="template-description">{template.description}</p>
                      )}
                      <p className="template-meta">
                        {template.fields.length} fields • 
                        Created: {template.createdAt.toLocaleDateString()} • 
                        Updated: {template.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="template-actions">
                      <button
                        onClick={() => handleLoadTemplate(template)}
                        className="load-btn"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button onClick={() => setShowTemplates(false)} className="secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
