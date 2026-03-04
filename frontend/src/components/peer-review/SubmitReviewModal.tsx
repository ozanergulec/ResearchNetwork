import React, { useState } from 'react';
import { reviewApi } from '../../services/reviewService';

interface SubmitReviewModalProps {
    requestId: string;
    pubTitle: string;
    onClose: () => void;
    onSuccess: () => void;
}

const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({ requestId, pubTitle, onClose, onSuccess }) => {
    const [comment, setComment] = useState('');
    const [verdict, setVerdict] = useState('Approve');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!comment.trim()) return;
        setSubmitting(true);
        try {
            await reviewApi.submitReview(requestId, comment, verdict);
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-modal" onClick={e => e.stopPropagation()}>
                <h3>Submit Review</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1rem' }}>
                    Reviewing: <strong>{pubTitle}</strong>
                </p>
                <label>Verdict</label>
                <select value={verdict} onChange={e => setVerdict(e.target.value)}>
                    <option value="Approve">Approve</option>
                    <option value="MinorRevision">Minor Revision</option>
                    <option value="MajorRevision">Major Revision</option>
                    <option value="Reject">Reject</option>
                </select>
                <label>Review Comments</label>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Write your detailed review comments here..."
                    style={{ minHeight: '150px' }}
                />
                <div className="pr-modal-actions">
                    <button className="pr-btn pr-btn-outline" onClick={onClose}>Cancel</button>
                    <button
                        className="pr-btn pr-btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || !comment.trim()}
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitReviewModal;
