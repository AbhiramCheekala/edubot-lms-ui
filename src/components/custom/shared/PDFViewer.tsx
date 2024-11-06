import React, { useEffect, useState } from 'react';

interface PDFViewerProps {
  url: string;
  zoom: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!url) {
    return <div>No PDF URL provided</div>;
  }

  if (isMobile) {
    return (
      <div className="tw-w-full tw-text-center tw-p-5">
        <p className="tw-mb-4">For the best experience on mobile, please download the PDF:</p>
        {/* <Button variant="default" size="lg" onClick={() => window.open(url, '_blank')}>
          <Download className="tw-w-4 tw-h-4 tw-mr-2" />
          Download PDF
        </Button> */}
      </div>
    );
  }

  return (
    <iframe
      src={`${url}#view=FitH&navpanes=0&scrollbar=0&zoom=page-width`}
      title="PDF Viewer"
      width="100%"
      height="100%"
      style={{ border: 'none' }}
    />
  );
};

export default PDFViewer;
