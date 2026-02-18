import React, { useState } from 'react';
import type { Publication } from '../../services/publicationService';
import '../../styles/feed/ShareModal.css';

interface ShareModalProps {
    publication: Publication;
    onShare: (note: string) => void;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ publication, onShare, onClose }) => {
    const [note, setNote] = useState('');
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        setSharing(true);
        try {
            await onShare(note);
        } catch {
            setSharing(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="share-modal-overlay" onClick={handleOverlayClick}>
            <div className="share-modal">
                <div className="share-modal-header">
                    <h3>Share Publication</h3>
                    <button className="share-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="share-modal-body">
                    <textarea
                        className="share-modal-textarea"
                        placeholder="Add your thoughts about this publication..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        autoFocus
                    />
                    <span className="share-modal-char-count">{note.length}/500</span>

                    {/* Preview of the publication being shared */}
                    <div className="share-modal-preview">
                        <div className="share-modal-preview-label">Sharing:</div>
                        <div className="share-modal-preview-card">
                            <h4 className="share-modal-preview-title">{publication.title}</h4>
                            {publication.abstract && (
                                <p className="share-modal-preview-abstract">
                                    {publication.abstract.length > 150
                                        ? publication.abstract.substring(0, 150) + '...'
                                        : publication.abstract}
                                </p>
                            )}
                            <span className="share-modal-preview-author">
                                by {publication.author.fullName}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="share-modal-footer">
                    <button className="share-modal-cancel" onClick={onClose}>Cancel</button>
                    <button
                        className="share-modal-submit"
                        onClick={handleShare}
                        disabled={sharing}
                    >
                        {sharing ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
