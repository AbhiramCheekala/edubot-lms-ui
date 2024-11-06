import Editor from '@monaco-editor/react';
import axios from 'axios';
import docx2html from 'docx2html';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PDFViewer from './PDFViewer';

interface ContentViewerProps {
  binaryObjectMimeType?: string;
  securedFileUrl?: string;
}

interface NotebookCell {
  cell_type: 'code' | 'markdown';
  source: string[];
}

const ContentViewer: React.FC<ContentViewerProps> = React.memo(({
  binaryObjectMimeType = '',
  securedFileUrl = '',
}) => {
  const [rotation] = useState(0);
  const [zoom] = useState(1);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordContent, setWordContent] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  

  const codeFileExtensions = useMemo(() => [
    '.java', '.py', '.js', '.ts', '.html', '.css',
    '.cpp', '.c', '.rb', '.php', '.go', '.sql', '.json',
    '.ipynb', '.tsx', '.jsx', '.md', '.yaml', '.yml',
    '.xml', '.sh', '.bat', '.ps1', '.swift', '.kt', '.rs'
  ], []);

  const languageMap = useMemo(() => ({
    'java': 'java',
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'html': 'html',
    'css': 'css',
    'cpp': 'cpp',
    'c': 'c',
    'rb': 'ruby',
    'php': 'php',
    'go': 'go',
    'sql': 'sql',
    'json': 'json',
    'ipynb': 'python',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sh': 'shell',
    'bat': 'bat',
    'ps1': 'powershell',
    'swift': 'swift',
    'kt': 'kotlin',
    'rs': 'rust'
  }), []);

  const fetchFileContent = useCallback(async () => {
    if (!securedFileUrl) {
      setError('No file URL provided');
      setIsLoading(false);
      return;
    }

    try {
      if (binaryObjectMimeType === 'application/pdf') {
        const response = await axios.get(securedFileUrl, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
      } else if (binaryObjectMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const response = await axios.get(securedFileUrl, { responseType: 'arraybuffer' });
        const result = await docx2html(response.data, { container: document?.getElementById('hack-edubot-hidden-doc-target')});
        setWordContent(result.toString());
      } else {
        const contentResponse = await axios.get(securedFileUrl, { responseType: 'text' });
        setFileContent(contentResponse.data);
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setError('Error loading file content');
    }
    setIsLoading(false);
  }, [securedFileUrl, binaryObjectMimeType]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchFileContent();

    // Cleanup function to revoke the blob URL when component unmounts
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [fetchFileContent]);

  // const handleRotate = () => setRotation((rotation + 90) % 360);
  // const handleZoomIn = () => setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));
  // const handleZoomOut = () => setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));
  // const handlePrint = () => window.print();
  // const handleDownload = () => securedFileUrl && window.open(securedFileUrl, '_blank');

  // const renderToolbar = () => (
  //   <div className="tw-flex tw-justify-end tw-items-center tw-bg-white tw-p-2 tw-border-b tw-sticky tw-top-0 tw-z-10">
  //     <div className="tw-flex tw-items-center tw-space-x-2">
  //       <Button variant="ghost" size="sm" onClick={handleZoomOut}>
  //         <ZoomOut className="tw-w-4 tw-h-4" />
  //       </Button>
  //       <Button variant="ghost" size="sm" onClick={handleZoomIn}>
  //         <ZoomIn className="tw-w-4 tw-h-4" />
  //       </Button>
  //       <Button variant="ghost" size="sm" onClick={handleRotate}>
  //         <RotateCw className="tw-w-4 tw-h-4" />
  //       </Button>
  //       <Button variant="ghost" size="sm" onClick={handlePrint}>
  //         <Printer className="tw-w-4 tw-h-4" />
  //       </Button>
  //       <Button variant="ghost" size="sm" onClick={handleDownload}>
  //         <Download className="tw-w-4 tw-h-4" />
  //       </Button>
  //     </div>
  //   </div>
  // );

  if (isLoading) {
    return <div>Loading content...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // const supportedDocTypes = [
  //   'application/pdf',
  //   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // ];

  const fileName = securedFileUrl.split('/').pop() || '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

  if (binaryObjectMimeType === 'application/pdf') {
    return (
      <div className="tw-flex tw-flex-col md:tw-h-[600px] tw-bg-white tw-border tw-border-gray-200 tw-rounded-md tw-overflow-hidden">
        {/* {renderToolbar()} */}
        <div className="tw-flex-grow tw-overflow-hidden">
          {pdfBlobUrl && <PDFViewer url={pdfBlobUrl} zoom={zoom} />}
        </div>
      </div>
    );
  } else if (binaryObjectMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (
      <div className="tw-flex tw-flex-col tw-max-h-[600px] tw-bg-white tw-border tw-border-gray-200 tw-rounded-md tw-overflow-hidden">
        {/* {renderToolbar()} */}
        <div className="tw-flex-grow tw-overflow-auto tw-p-4" style={{ fontSize: `${10 * zoom}px` }}>
          <div dangerouslySetInnerHTML={{ __html: wordContent }} />
        </div>
      </div>
    );
  } else if (binaryObjectMimeType.startsWith('image/')) {
    return (
      <div className="tw-flex tw-flex-col tw-h-[50%] tw-bg-white tw-border tw-border-gray-200 tw-rounded-md tw-overflow-hidden">
        {/* {renderToolbar()} */}
        <div className="tw-flex-grow tw-overflow-auto tw-flex tw-items-center tw-justify-center tw-bg-white">
          <div className="tw-max-w-full tw-max-h-full tw-overflow-auto">
            <img
              src={securedFileUrl}
              alt="Content"
              style={{ transform: `rotate(${rotation}deg) scale(${zoom})`}}
            />
          </div>
        </div>
      </div>
    );
  } else {
    // For text files, code files, and any unrecognized types
    let language = 'plaintext';

    if (codeFileExtensions.includes(`.${fileExtension}`)) {
      language = languageMap[fileExtension] || 'plaintext';
    }

    // Special handling for IPython Notebooks
    if (fileExtension === 'ipynb') {
      try {
        const notebookContent = JSON.parse(fileContent);
        const cellContents = notebookContent.cells
          .map((cell: NotebookCell, index: number) => {
            const cellType = cell.cell_type === 'code' ? 'Code' : 'Markdown';
            const cellContent = cell.source.join('');
            return `// Cell ${index + 1} (${cellType}):\n${cellContent}\n\n`;
          })
          .join('');
        setFileContent(cellContents);
        language = 'python';
      } catch (error) {
        console.error('Error parsing IPython Notebook:', error);
        setError('Error parsing IPython Notebook');
      }
    }

    return (
      <div className="tw-flex tw-flex-col tw-h-[600px] tw-bg-white tw-border tw-border-gray-200 tw-rounded-md tw-overflow-hidden">
        {/* {renderToolbar()} */}
        <div className="tw-flex-grow tw-overflow-auto">
          <Editor
            height="100%"
            language={language}
            value={fileContent}
            options={{ 
              readOnly: true, 
              fontSize: 10 * zoom,
              wordWrap: 'on',
              minimap: { enabled: false }
            }}
          />
        </div>
      </div>
    );
  }
});

export default ContentViewer;