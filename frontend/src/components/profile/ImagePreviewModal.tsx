import React, { useRef } from 'react';
import '../../styles/profile/ImagePreviewModal.css';

interface ImagePreviewModalProps {
    type: 'profile' | 'cover';
    imageUrl: string | null;
    onClose: () => void;
    onUpdate: (file: File) => void;
    onRemove: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
    type,
    imageUrl,
    onClose,
    onUpdate,
    onRemove,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const title = type === 'profile' ? 'Profile Photo' : 'Cover Photo';

    const handleUpdateClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpdate(file);
        }
        e.target.value = '';
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="image-preview-backdrop" onClick={handleBackdropClick}>
            <div className="image-preview-modal">
                {/* Header */}
                <div className="image-preview-header">
                    <h2 className="image-preview-title">{title}</h2>
                    <button className="image-preview-close" onClick={onClose}>×</button>
                </div>

                {/* Image Preview */}
                <div className="image-preview-body">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={title}
                            className={`image-preview-img ${type === 'profile' ? 'preview-circle' : 'preview-rect'}`}
                        />
                    ) : (
                        <div className="image-preview-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            <p>No photo uploaded yet</p>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="image-preview-footer">
                    <div className="image-preview-actions-left">
                        <button className="image-preview-btn update-btn" onClick={handleUpdateClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            Update
                        </button>
                    </div>
                    {imageUrl && (
                        <button className="image-preview-btn delete-btn" onClick={onRemove}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                        </button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

export default ImagePreviewModal;
