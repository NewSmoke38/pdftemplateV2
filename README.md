# PDF Template Filler

A modern web application for creating PDF templates with coordinate-based field placement and automated form filling.

## Features

- **PDF Upload**: Upload any PDF document to start creating your template
- **Coordinate-based Field Placement**: Click and drag to add text fields at precise coordinates
- **Multiple Field Types**: Support for text, date, and number input fields
- **Template Management**: Save and load field configurations for reuse
- **Form Builder**: Dynamic form creation with real-time preview
- **PDF Filling**: Fill in data and download the completed PDF
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

### 1. Upload a PDF
- Click "Choose PDF File" to upload your PDF document
- The PDF will be displayed in the viewer

### 2. Add Fields
- Click "Add Field" button to enter field placement mode
- Click and drag on the PDF to create a field at the desired location
- Fields can be moved, resized, and edited after creation

### 3. Configure Fields
- Click on any field to select it
- Use the form builder to edit field properties (label, type, position)
- Fill in sample data to test your template

### 4. Save Templates
- Click "Save Template" to save your field configuration
- Give your template a name and optional description
- Templates are saved locally in your browser

### 5. Load Templates
- Click "Load Template" to see your saved templates
- Select a template to load its field configuration
- Edit or delete templates as needed

### 6. Fill and Download
- Fill in the form data for all fields
- Click "Fill & Download PDF" to generate the completed document
- The filled PDF will be automatically downloaded

## Field Types

- **Text**: General text input fields
- **Date**: Date picker fields with validation
- **Number**: Numeric input fields with validation

## Technical Details

### Built With
- React 19 with TypeScript
- Vite for development and building
- PDF-lib for PDF manipulation
- React-PDF for PDF viewing
- Modern CSS with responsive design

### Key Components
- `PDFViewer`: Handles PDF display and field placement
- `TemplateManager`: Manages template save/load functionality
- `FormBuilder`: Creates dynamic forms for field data entry
- `PDFFiller`: Handles PDF filling and download operations

### Browser Compatibility
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers supported

## Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Usage Tips

1. **Field Placement**: Use the coordinate system to precisely position fields
2. **Template Reuse**: Save common field configurations as templates
3. **Form Validation**: The app validates data types before PDF generation
4. **Responsive Design**: Works on both desktop and mobile devices
5. **Local Storage**: Templates are saved in your browser's local storage

## Troubleshooting

### PDF Not Loading
- Ensure the file is a valid PDF format
- Check file size (large files may take time to load)
- Try refreshing the page

### Fields Not Appearing
- Make sure you're in "Add Field" mode
- Click and drag to create fields
- Check that the PDF is fully loaded

### Download Issues
- Ensure all required fields are filled
- Check browser download settings
- Try a different browser if issues persist

## License

This project is open source and available under the MIT License.