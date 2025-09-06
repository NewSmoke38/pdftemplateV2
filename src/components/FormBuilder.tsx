import React, { useState, useEffect } from 'react';
import { type FieldPosition } from './PDFViewer';

interface FormBuilderProps {
  fields: FieldPosition[];
  onFieldUpdate: (id: string, field: Partial<FieldPosition>) => void;
  onFieldDelete: (id: string) => void;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  formData: Record<string, string>;
  onFormDataChange: (fieldId: string, value: string) => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onFieldUpdate,
  onFieldDelete,
  selectedFieldId,
  onFieldSelect,
  formData,
  onFormDataChange,
}) => {
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<FieldPosition | null>(null);

  useEffect(() => {
    if (selectedFieldId) {
      const field = fields.find(f => f.id === selectedFieldId);
      if (field) {
        setEditingField(field);
        setShowFieldEditor(true);
      }
    } else {
      setShowFieldEditor(false);
      setEditingField(null);
    }
  }, [selectedFieldId, fields]);

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

  const handleFieldCancel = () => {
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'date':
        return '📅';
      case 'number':
        return '🔢';
      default:
        return '📝';
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
    <div className="form-builder">
      <div className="form-builder-header">
        <h3>Form Fields ({fields.length})</h3>
        <p>Click on a field to edit its properties or fill in data</p>
      </div>

      <div className="fields-list">
        {fields.length === 0 ? (
          <div className="empty-state">
            <p>No fields added yet. Add fields to the PDF to get started.</p>
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
                <span className="field-type">({field.type})</span>
              </div>
              <div className="field-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFieldEdit(field);
                  }}
                  className="edit-btn"
                  title="Edit field properties"
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
            <div className="form-group">
              <label>Position & Size:</label>
              <div className="position-inputs">
                <div>
                  <label>X:</label>
                  <input
                    type="number"
                    value={Math.round(editingField.x)}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        x: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label>Y:</label>
                  <input
                    type="number"
                    value={Math.round(editingField.y)}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        y: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label>Width:</label>
                  <input
                    type="number"
                    value={Math.round(editingField.width)}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        width: parseFloat(e.target.value) || 100,
                      })
                    }
                  />
                </div>
                <div>
                  <label>Height:</label>
                  <input
                    type="number"
                    value={Math.round(editingField.height)}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        height: parseFloat(e.target.value) || 20,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleFieldSave} className="primary">
                Save Changes
              </button>
              <button onClick={handleFieldCancel} className="secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
