import React, { useState } from 'react';
import { type FieldPosition } from './PDFViewer';
import { type Template } from './TemplateManager';

interface FloatingToolbarProps {
  fields: FieldPosition[];
  templates: Template[];
  onFieldUpdate: (id: string, field: Partial<FieldPosition>) => void;
  onFieldDelete: (id: string) => void;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  formData: Record<string, string>;
  onFormDataChange: (fieldId: string, value: string) => void;
  onTemplateSave: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTemplateLoad: (template: Template) => void;
  onTemplateDelete: (id: string) => void;
  onFillAndDownload: () => void;
  isProcessing: boolean;
  movable: boolean;
  onMovableToggle: () => void;
  onExportFields: () => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  fields,
  templates,
  onFieldUpdate,
  onFieldDelete,
  selectedFieldId,
  onFieldSelect,
  formData,
  onFormDataChange,
  onTemplateSave,
  onTemplateLoad,
  onTemplateDelete,
  onFillAndDownload,
  isProcessing,
  movable,
  onMovableToggle,
  onExportFields,
}) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<FieldPosition | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleFieldEdit = (field: FieldPosition) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleFieldSave = () => {
    if (editingField) {
      onFieldUpdate(editingField.id, editingField);
      setShowFieldEditor(false);
      setEditingField(null);
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field to save as template');
      return;
    }

    const templateData = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      fields: fields,
    };

    onTemplateSave(templateData);
    setTemplateName('');
    setTemplateDescription('');
    setShowSaveDialog(false);
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

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'date': return '📅';
      case 'number': return '🔢';
      default: return '📝';
    }
  };

  const renderFormInput = (field: FieldPosition) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onFormDataChange(field.id, e.target.value)}
            className="form-input"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onFormDataChange(field.id, e.target.value)}
            className="form-input"
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onFormDataChange(field.id, e.target.value)}
            className="form-input"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <>
      {/* Floating Toolbar */}
      <div className="floating-toolbar">
        <div className="toolbar-icons">
          {movable && (
            <button
              className={`toolbar-icon ${activePanel === 'fields' ? 'active' : ''}`}
              onClick={() => togglePanel('fields')}
              title="Fields"
            >
              📝
            </button>
          )}
          {movable && (
            <button
              className={`toolbar-icon ${activePanel === 'templates' ? 'active' : ''}`}
              onClick={() => togglePanel('templates')}
              title="Templates"
            >
              💾
            </button>
          )}
          {movable && (
            <button
              className="toolbar-icon"
              onClick={onExportFields}
              title="Export Fields Configuration"
            >
              📤
            </button>
          )}
          {!movable && (
            <button
              className={`toolbar-icon ${activePanel === 'form' ? 'active' : ''}`}
              onClick={() => togglePanel('form')}
              title="Fill Form"
            >
              📝
            </button>
          )}
          <button
            className={`toolbar-icon ${activePanel === 'download' ? 'active' : ''}`}
            onClick={() => togglePanel('download')}
            title="Download"
          >
            📄
          </button>
          <button
            className={`toolbar-icon ${movable ? 'active' : ''}`}
            onClick={onMovableToggle}
            title={movable ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          >
            {movable ? '🔒' : '✏️'}
          </button>
        </div>

        {/* Fields Panel */}
        {activePanel === 'fields' && (
          <div className="toolbar-panel">
            <div className="panel-header">
              <h3>Fields ({fields.length})</h3>
              <button className="close-panel" onClick={() => setActivePanel(null)}>×</button>
            </div>
            <div className="fields-list">
              {fields.length === 0 ? (
                <div className="empty-state">
                  <p>No fields added yet. Click on the PDF to add fields.</p>
                </div>
              ) : (
                fields.map((field) => (
                  <div
                    key={field.id}
                    className={`field-item ${selectedFieldId === field.id ? 'selected' : ''}`}
                    onClick={() => onFieldSelect(field.id)}
                  >
                    <div className="field-header">
                      <span className="field-icon">{getFieldTypeIcon(field.type)}</span>
                      <span className="field-label">{field.label}</span>
                    </div>
                    <div className="field-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldEdit(field);
                        }}
                        className="edit-btn"
                        title="Edit field"
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldDelete(field.id);
                        }}
                        className="delete-btn"
                        title="Delete field"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="field-input">
                      {renderFormInput(field)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Templates Panel */}
        {activePanel === 'templates' && (
          <div className="toolbar-panel">
            <div className="panel-header">
              <h3>Templates</h3>
              <button className="close-panel" onClick={() => setActivePanel(null)}>×</button>
            </div>
            <div className="template-controls">
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={fields.length === 0}
                className="save-template-btn"
              >
                Save Template
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="load-template-btn"
              >
                Load Template
              </button>
            </div>
          </div>
        )}

        {/* Form Panel for normal users */}
        {!movable && activePanel === 'form' && (
          <div className="toolbar-panel">
            <div className="panel-header">
              <h3>Fill Form ({fields.length} fields)</h3>
              <button className="close-panel" onClick={() => setActivePanel(null)}>×</button>
            </div>
            <div className="fields-list">
              {fields.length === 0 ? (
                <div className="empty-state">
                  <p>No fields available. Contact administrator to add fields.</p>
                </div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="field-item">
                    <div className="field-header">
                      <span className="field-icon">{getFieldTypeIcon(field.type)}</span>
                      <span className="field-label">{field.label}</span>
                    </div>
                    <div className="field-input">
                      {renderFormInput(field)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Download Panel */}
        {activePanel === 'download' && (
          <div className="toolbar-panel">
            <div className="panel-header">
              <h3>Download</h3>
              <button className="close-panel" onClick={() => setActivePanel(null)}>×</button>
            </div>
            <div className="download-section">
              <button
                onClick={onFillAndDownload}
                disabled={isProcessing || fields.length === 0}
                className="download-btn"
              >
                {isProcessing ? 'Processing...' : 'Fill & Download PDF'}
              </button>
              <p className="download-info">
                {fields.length === 0 
                  ? 'Add fields to the PDF first' 
                  : `Ready to fill ${Object.keys(formData).filter(key => formData[key]).length}/${fields.length} fields`
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && editingField && (
        <div className="modal-overlay">
          <div className="modal field-editor">
            <h3>Edit Field Properties</h3>
            <div className="form-group">
              <label htmlFor="fieldLabel">Field Label:</label>
              <input
                id="fieldLabel"
                type="text"
                value={editingField.label}
                onChange={(e) =>
                  setEditingField({ ...editingField, label: e.target.value })
                }
                placeholder="Enter field label"
              />
            </div>
            <div className="form-group">
              <label htmlFor="fieldType">Field Type:</label>
              <select
                id="fieldType"
                value={editingField.type}
                onChange={(e) =>
                  setEditingField({
                    ...editingField,
                    type: e.target.value as 'text' | 'date' | 'number',
                  })
                }
              >
                <option value="text">Text</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={handleFieldSave} className="primary">
                Save Changes
              </button>
              <button onClick={() => setShowFieldEditor(false)} className="secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
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
              <p>Fields to save: {fields.length}</p>
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveTemplate} className="primary">
                Save
              </button>
              <button onClick={() => setShowSaveDialog(false)} className="secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Templates Modal */}
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
                        Created: {template.createdAt.toLocaleDateString()}
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
    </>
  );
};

export default FloatingToolbar;
