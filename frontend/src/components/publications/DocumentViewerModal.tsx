import React from 'react';
import '../../styles/publications/DocumentViewerModal.css';

interface DocumentViewerModalProps {
    fileUrl: string;
    fileName: string;
    onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ fileUrl, fileName, onClose }) => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';
    const isWord = fileExtension === 'doc' || fileExtension === 'docx';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="document-viewer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📄 {fileName}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="document-viewer-content">
                    {isPDF ? (
                        <iframe
                            src={fileUrl}
                            className="document-iframe"
                            title={fileName}
                        />
                    ) : isWord ? (
                        <div className="word-viewer-notice">
                            <p>📄 Preview is not supported for Word files.</p>
                            <a
                                href={fileUrl}
                                download
                                className="btn-primary"
                                onClick={onClose}
                            >
                                📥 Download File
                            </a>
                            <p className="viewer-hint">
                                veya
                            </p>
                            <a
                                href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                🔗 View with Office Online
                            </a>
                        </div>
                    ) : (
                        <div className="word-viewer-notice">
                            <p>⚠️ Preview is not supported for this file type.</p>
                            <a
                                href={fileUrl}
                                download
                                className="btn-primary"
                                onClick={onClose}
                            >
                                📥 Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerModal;
