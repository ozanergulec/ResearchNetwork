import React, { useState, useRef, useEffect } from 'react';
import { publicationsApi, type CreatePublicationDto } from '../../services/publicationService';
import { aiApi } from '../../services/aiService';
import { RESEARCH_TOPICS } from '../../data/researchTopics';
import '../../styles/common/Modal.css';
import '../../styles/publications/AddPublicationModal.css';

interface AddPublicationModalProps {
    onClose: () => void;
    onPublicationAdded: () => void;
}

const MAX_TAGS = 6;

const AddPublicationModal: React.FC<AddPublicationModalProps> = ({ onClose, onPublicationAdded }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUploadData, setFileUploadData] = useState({
        title: '',
        abstract: '',
    });
    const [fileTags, setFileTags] = useState<string[]>([]);
    const [fileTagQuery, setFileTagQuery] = useState('');
    const [fileTagFiltered, setFileTagFiltered] = useState<string[]>([]);
    const [fileTagOpen, setFileTagOpen] = useState(false);
    const [fileTagActiveIdx, setFileTagActiveIdx] = useState(-1);
    const fileTagRef = useRef<HTMLDivElement>(null);
    const fileTagListRef = useRef<HTMLUListElement>(null);
    const [dragActive, setDragActive] = useState(false);

    // AI tag suggestions
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Click outside handler for autocomplete dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fileTagRef.current && !fileTagRef.current.contains(e.target as Node)) {
                setFileTagOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (fileTagActiveIdx >= 0 && fileTagListRef.current) {
            const el = fileTagListRef.current.children[fileTagActiveIdx] as HTMLElement;
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [fileTagActiveIdx]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFileUploadData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    // Tag autocomplete helpers
    const filterTopics = (query: string, currentTags: string[]) => {
        if (query.trim().length === 0) return [];
        const tagSet = new Set(currentTags.map(t => t.toLowerCase()));
        return RESEARCH_TOPICS.filter(t =>
            t.toLowerCase().includes(query.toLowerCase()) && !tagSet.has(t.toLowerCase())
        ).slice(0, 15);
    };

    const handleFileTagSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (fileTags.length >= MAX_TAGS) return;
        const q = e.target.value;
        setFileTagQuery(q);
        const matches = filterTopics(q, fileTags);
        setFileTagFiltered(matches);
        setFileTagOpen(matches.length > 0);
        setFileTagActiveIdx(-1);
    };

    const handleFileTagSelect = (topic: string) => {
        if (fileTags.length >= MAX_TAGS) return;
        setFileTags(prev => [...prev, topic]);
        setFileTagQuery('');
        setFileTagFiltered([]);
        setFileTagOpen(false);
        setFileTagActiveIdx(-1);
    };

    const handleFileTagRemove = (topic: string) => {
        setFileTags(prev => prev.filter(t => t !== topic));
    };

    const handleFileTagKeyDown = (e: React.KeyboardEvent) => {
        if (!fileTagOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFileTagActiveIdx(prev => (prev < fileTagFiltered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFileTagActiveIdx(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && fileTagActiveIdx >= 0) {
            e.preventDefault();
            handleFileTagSelect(fileTagFiltered[fileTagActiveIdx]);
        } else if (e.key === 'Escape') {
            setFileTagOpen(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (file.type !== 'application/pdf') {
            setError('Only PDF files are accepted.');
            return;
        }

        if (file.size > maxSize) {
            setError('File size must be less than 10MB.');
            return;
        }

        setSelectedFile(file);
        setError(null);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const handleSuggestTags = async () => {
        setLoadingSuggestions(true);
        setSuggestedTags([]);
        try {
            let res;
            if (selectedFile) {
                res = await aiApi.suggestTagsFromFile(selectedFile, fileTags, 6);
            } else {
                const text = [fileUploadData.title, fileUploadData.abstract].filter(Boolean).join('. ');
                if (text.trim().length < 10) {
                    setLoadingSuggestions(false);
                    return;
                }
                res = await aiApi.suggestTags(text, fileTags, 6);
            }
            const currentLower = new Set(fileTags.map(t => t.toLowerCase()));
            const filtered = res.data.filter(t => !currentLower.has(t.toLowerCase()));
            setSuggestedTags(filtered);
        } catch (err) {
            console.error('Failed to get tag suggestions', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleAcceptSuggestedTag = (tag: string) => {
        if (fileTags.length >= MAX_TAGS) return;
        setFileTags(prev => [...prev, tag]);
        setSuggestedTags(prev => prev.filter(t => t !== tag));
    };

    const handleFileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) {
            setError('Please select a file.');
            return;
        }

        if (!fileUploadData.title.trim()) {
            setError('Title is required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use centralized upload-and-create function
            await publicationsApi.createPublicationWithFile(selectedFile, {
                title: fileUploadData.title,
                abstract: fileUploadData.abstract || undefined,
                tags: fileTags.length > 0 ? fileTags : undefined,
            });

            onPublicationAdded();
            onClose();
        } catch (err: any) {
            console.error('Publication creation error:', err);
            setError(err.message || 'An error occurred while uploading the file.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Publication</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {error && (
                    <div className="modal-error">
                        {error}
                    </div>
                )}

                <div className="modal-body">
                    <form onSubmit={handleFileSubmit}>
                        <div
                            className={`file-drop-zone ${dragActive ? 'active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {selectedFile ? (
                                <div className="file-selected">
                                    <span className="file-icon"></span>
                                    <span className="file-name">{selectedFile.name}</span>
                                    <button
                                        type="button"
                                        className="file-remove"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p>📁 Drag file here or click to select</p>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                        id="file-input"
                                    />
                                    <label htmlFor="file-input" className="file-select-button">
                                        Select File
                                    </label>
                                    <p className="file-help">PDF only (max 10MB)</p>
                                </>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="file-title">Title *</label>
                            <input
                                type="text"
                                id="file-title"
                                name="title"
                                value={fileUploadData.title}
                                onChange={handleFileInputChange}
                                required
                                placeholder="Enter publication title"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="file-abstract">Abstract</label>
                            <textarea
                                id="file-abstract"
                                name="abstract"
                                value={fileUploadData.abstract}
                                onChange={handleFileInputChange}
                                rows={4}
                                placeholder="Enter the abstract (optional)"
                            />
                        </div>

                        <div className="form-group">
                            <label>Tags ({fileTags.length}/{MAX_TAGS})</label>
                            {fileTags.length > 0 && (
                                <div className="pub-tags-chips">
                                    {fileTags.map(tag => (
                                        <span key={tag} className="pub-tag-chip">
                                            {tag}
                                            <button type="button" className="pub-tag-chip-remove" onClick={() => handleFileTagRemove(tag)}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="pub-tag-autocomplete-wrapper" ref={fileTagRef}>
                                <input
                                    type="text"
                                    value={fileTagQuery}
                                    onChange={handleFileTagSearch}
                                    onKeyDown={handleFileTagKeyDown}
                                    placeholder={fileTags.length >= MAX_TAGS ? `Maximum ${MAX_TAGS} tags reached` : 'Search topics (e.g., Machine Learning...)'}
                                    autoComplete="off"
                                    disabled={fileTags.length >= MAX_TAGS}
                                />
                                {fileTagOpen && fileTagFiltered.length > 0 && (
                                    <ul className="pub-tag-autocomplete-list" ref={fileTagListRef}>
                                        {fileTagFiltered.map((topic, idx) => (
                                            <li
                                                key={topic}
                                                className={`pub-tag-autocomplete-item ${idx === fileTagActiveIdx ? 'pub-tag-autocomplete-item-active' : ''}`}
                                                onMouseDown={(e) => { e.preventDefault(); handleFileTagSelect(topic); }}
                                                onMouseEnter={() => setFileTagActiveIdx(idx)}
                                            >
                                                {topic}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <button
                                type="button"
                                className="ai-suggest-btn"
                                onClick={handleSuggestTags}
                                disabled={loadingSuggestions || (!selectedFile && !fileUploadData.title.trim() && !fileUploadData.abstract.trim()) || fileTags.length >= MAX_TAGS}
                            >
                                {loadingSuggestions ? (
                                    <><span className="ai-suggest-spinner" /> Analyzing...</>
                                ) : (
                                    <><span className="ai-suggest-icon">✨</span> AI Suggest Tags</>
                                )}
                            </button>

                            {suggestedTags.length > 0 && (
                                <div className="ai-suggested-tags">
                                    <span className="ai-suggested-label">AI Suggestions:</span>
                                    <div className="ai-suggested-chips">
                                        {suggestedTags.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                className="ai-suggested-chip"
                                                onClick={() => handleAcceptSuggestedTag(tag)}
                                                disabled={fileTags.length >= MAX_TAGS}
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Uploading...' : 'Upload & Add'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddPublicationModal;
