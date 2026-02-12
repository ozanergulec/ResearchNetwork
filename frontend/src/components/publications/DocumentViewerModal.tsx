import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import '../../styles/publications/DocumentViewerModal.css';

interface DocumentViewerModalProps {
    fileUrl: string;
    fileName: string;
    onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ fileUrl, fileName, onClose }) => {
    const [downloading, setDownloading] = useState(false);
    const [wordHtml, setWordHtml] = useState<string | null>(null);
    const [wordLoading, setWordLoading] = useState(false);
    const [wordError, setWordError] = useState<string | null>(null);

    // Extract file extension from the actual fileUrl (e.g., /uploads/publications/guid.pdf)
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';
    const isDocx = fileExtension === 'docx';
    const isDoc = fileExtension === 'doc';

    // Determine a good download filename: use publication title + correct extension
    const downloadFileName = `${fileName}.${fileExtension || 'pdf'}`;

    // Load and convert .docx files using mammoth.js
    useEffect(() => {
        if (!isDocx) return;

        const loadDocx = async () => {
            setWordLoading(true);
            setWordError(null);
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error('Failed to load file');
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setWordHtml(result.value);
            } catch (error) {
                console.error('Word preview error:', error);
                setWordError('Failed to load Word document preview.');
            } finally {
                setWordLoading(false);
            }
        };

        loadDocx();
    }, [fileUrl, isDocx]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        setDownloading(true);
        try {
            // Use fetch + Blob to handle cross-origin downloads
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = downloadFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            // Fallback: open in new tab
            window.open(fileUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="document-viewer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📄 {fileName}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="document-viewer-content">
                    {isPDF ? (
                        <>
                            <iframe
                                src={fileUrl}
                                className="document-iframe"
                                title={fileName}
                            />
                            <div className="document-actions">
                                <button
                                    className="btn-primary"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                >
                                    {downloading ? '⏳ Downloading...' : '📥 Download PDF'}
                                </button>
                            </div>
                        </>
                    ) : isDocx ? (
                        <>
                            {wordLoading ? (
                                <div className="word-viewer-notice">
                                    <p>⏳ Loading preview...</p>
                                </div>
                            ) : wordError ? (
                                <div className="word-viewer-notice">
                                    <p>⚠️ {wordError}</p>
                                    <button
                                        className="btn-primary"
                                        onClick={handleDownload}
                                        disabled={downloading}
                                    >
                                        {downloading ? '⏳ Downloading...' : '📥 Download File'}
                                    </button>
                                </div>
                            ) : wordHtml ? (
                                <>
                                    <div
                                        className="word-preview-content"
                                        dangerouslySetInnerHTML={{ __html: wordHtml }}
                                    />
                                    <div className="document-actions">
                                        <button
                                            className="btn-primary"
                                            onClick={handleDownload}
                                            disabled={downloading}
                                        >
                                            {downloading ? '⏳ Downloading...' : '📥 Download File'}
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : isDoc ? (
                        <div className="word-viewer-notice">
                            <p>📄 Preview is not supported for .doc files. Please use .docx format for preview.</p>
                            <button
                                className="btn-primary"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? '⏳ Downloading...' : '📥 Download File'}
                            </button>
                        </div>
                    ) : (
                        <div className="word-viewer-notice">
                            <p>⚠️ Preview is not supported for this file type.</p>
                            <button
                                className="btn-primary"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? '⏳ Downloading...' : '📥 Download File'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerModal;

