import React, { useState } from 'react';
import { reviewApi } from '../../services/reviewService';

interface ApplyModalProps {
    pubId: string;
    pubTitle: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ApplyModal: React.FC<ApplyModalProps> = ({ pubId, pubTitle, onClose, onSuccess }) => {
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleApply = async () => {
        setSubmitting(true);
        try {
            await reviewApi.applyToReview(pubId, message);
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.message || err.response?.data || 'Failed to apply');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-modal" onClick={e => e.stopPropagation()}>
                <h3>Apply to Review</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1rem' }}>
                    You are applying to review: <strong>{pubTitle}</strong>
                </p>
                <label>Message (optional)</label>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your expertise and why you'd like to review this publication..."
                />
                <div className="pr-modal-actions">
                    <button className="pr-btn pr-btn-outline" onClick={onClose}>Cancel</button>
                    <button
                        className="pr-btn pr-btn-primary"
                        onClick={handleApply}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplyModal;
