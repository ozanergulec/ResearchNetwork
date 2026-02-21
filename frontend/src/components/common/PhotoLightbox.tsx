import React from 'react';
import ReactDOM from 'react-dom';
import '../../styles/common/PhotoLightbox.css';

interface PhotoLightboxProps {
    imageUrl: string;
    alt?: string;
    onClose: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ imageUrl, alt = 'Photo', onClose }) => {
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return ReactDOM.createPortal(
        <div className="photo-lightbox-backdrop" onClick={handleBackdropClick}>
            <button className="photo-lightbox-close" onClick={onClose} title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
            <img
                src={imageUrl}
                alt={alt}
                className="photo-lightbox-image"
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body
    );
};

export default PhotoLightbox;
