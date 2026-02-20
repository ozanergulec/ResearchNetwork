import React, { useState } from 'react';
import AddPublicationModal from '../publications/AddPublicationModal';
import '../../styles/feed/CreatePostBar.css';

interface CreatePostBarProps {
    onPublicationAdded: () => void;
}

const CreatePostBar: React.FC<CreatePostBarProps> = ({ onPublicationAdded }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button className="create-post-bar" onClick={() => setShowModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add New Publication
            </button>

            {showModal && (
                <AddPublicationModal
                    onClose={() => setShowModal(false)}
                    onPublicationAdded={onPublicationAdded}
                />
            )}
        </>
    );
};

export default CreatePostBar;
