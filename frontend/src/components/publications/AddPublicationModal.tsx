import React, { useState, useRef, useEffect } from 'react';
import { publicationsApi, type CreatePublicationDto } from '../../services/publicationService';
import { RESEARCH_TOPICS } from '../../data/researchTopics';
import '../../styles/common/Modal.css';
import '../../styles/publications/AddPublicationModal.css';

interface AddPublicationModalProps {
    onClose: () => void;
    onPublicationAdded: () => void;
}

type TabType = 'manual' | 'file';

const MAX_TAGS = 4;

const AddPublicationModal: React.FC<AddPublicationModalProps> = ({ onClose, onPublicationAdded }) => {
    const [activeTab, setActiveTab] = useState<TabType>('manual');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Manual Entry State
    const [formData, setFormData] = useState({
        title: '',
        abstract: '',
        doi: '',
        publishedDate: '',
    });
    const [manualTags, setManualTags] = useState<string[]>([]);
    const [manualTagQuery, setManualTagQuery] = useState('');
    const [manualTagFiltered, setManualTagFiltered] = useState<string[]>([]);
    const [manualTagOpen, setManualTagOpen] = useState(false);
    const [manualTagActiveIdx, setManualTagActiveIdx] = useState(-1);
    const manualTagRef = useRef<HTMLDivElement>(null);
    const manualTagListRef = useRef<HTMLUListElement>(null);

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

    // Click outside handlers for autocomplete dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (manualTagRef.current && !manualTagRef.current.contains(e.target as Node)) {
                setManualTagOpen(false);
            }
            if (fileTagRef.current && !fileTagRef.current.contains(e.target as Node)) {
                setFileTagOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (manualTagActiveIdx >= 0 && manualTagListRef.current) {
            const el = manualTagListRef.current.children[manualTagActiveIdx] as HTMLElement;
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [manualTagActiveIdx]);

    useEffect(() => {
        if (fileTagActiveIdx >= 0 && fileTagListRef.current) {
            const el = fileTagListRef.current.children[fileTagActiveIdx] as HTMLElement;
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [fileTagActiveIdx]);

    const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

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

    const handleManualTagSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (manualTags.length >= MAX_TAGS) return;
        const q = e.target.value;
        setManualTagQuery(q);
        const matches = filterTopics(q, manualTags);
        setManualTagFiltered(matches);
        setManualTagOpen(matches.length > 0);
        setManualTagActiveIdx(-1);
    };

    const handleManualTagSelect = (topic: string) => {
        if (manualTags.length >= MAX_TAGS) return;
        setManualTags(prev => [...prev, topic]);
        setManualTagQuery('');
        setManualTagFiltered([]);
        setManualTagOpen(false);
        setManualTagActiveIdx(-1);
    };

    const handleManualTagRemove = (topic: string) => {
        setManualTags(prev => prev.filter(t => t !== topic));
    };

    const handleManualTagKeyDown = (e: React.KeyboardEvent) => {
        if (!manualTagOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setManualTagActiveIdx(prev => (prev < manualTagFiltered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setManualTagActiveIdx(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && manualTagActiveIdx >= 0) {
            e.preventDefault();
            handleManualTagSelect(manualTagFiltered[manualTagActiveIdx]);
        } else if (e.key === 'Escape') {
            setManualTagOpen(false);
        }
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
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            setError('Only PDF and Word files are accepted.');
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

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            setError('Title is required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const publicationData: CreatePublicationDto = {
                title: formData.title,
                abstract: formData.abstract || undefined,
                doi: formData.doi || undefined,
                publishedDate: formData.publishedDate || undefined,
                tags: manualTags.length > 0 ? manualTags : undefined
            };

            await publicationsApi.create(publicationData);
            onPublicationAdded();
            onClose();
        } catch (err: any) {
            console.error('Failed to create publication', err);
            setError(err.response?.data?.message || 'An error occurred while adding the publication.');
        } finally {
            setLoading(false);
        }
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

                <div className="modal-tabs">
                    <button
                        className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
                        onClick={() => setActiveTab('manual')}
                    >
                        Manual Entry
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => setActiveTab('file')}
                    >
                        File Upload
                    </button>
                </div>

                {error && (
                    <div className="modal-error">
                        {error}
                    </div>
                )}

                <div className="modal-body">
                    {activeTab === 'manual' ? (
                        <form onSubmit={handleManualSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">Title *</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleManualInputChange}
                                    required
                                    placeholder="Enter publication title"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="abstract">Abstract</label>
                                <textarea
                                    id="abstract"
                                    name="abstract"
                                    value={formData.abstract}
                                    onChange={handleManualInputChange}
                                    rows={4}
                                    placeholder="Enter the abstract (optional)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="doi">DOI Number</label>
                                <input
                                    type="text"
                                    id="doi"
                                    name="doi"
                                    value={formData.doi}
                                    onChange={handleManualInputChange}
                                    placeholder="10.1234/example.2024.001"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="publishedDate">Publication Date</label>
                                <input
                                    type="date"
                                    id="publishedDate"
                                    name="publishedDate"
                                    value={formData.publishedDate}
                                    onChange={handleManualInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Tags ({manualTags.length}/{MAX_TAGS})</label>
                                {manualTags.length > 0 && (
                                    <div className="pub-tags-chips">
                                        {manualTags.map(tag => (
                                            <span key={tag} className="pub-tag-chip">
                                                {tag}
                                                <button type="button" className="pub-tag-chip-remove" onClick={() => handleManualTagRemove(tag)}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="pub-tag-autocomplete-wrapper" ref={manualTagRef}>
                                    <input
                                        type="text"
                                        value={manualTagQuery}
                                        onChange={handleManualTagSearch}
                                        onKeyDown={handleManualTagKeyDown}
                                        placeholder={manualTags.length >= MAX_TAGS ? `Maximum ${MAX_TAGS} tags reached` : 'Search topics (e.g., Machine Learning...)'}
                                        autoComplete="off"
                                        disabled={manualTags.length >= MAX_TAGS}
                                    />
                                    {manualTagOpen && manualTagFiltered.length > 0 && (
                                        <ul className="pub-tag-autocomplete-list" ref={manualTagListRef}>
                                            {manualTagFiltered.map((topic, idx) => (
                                                <li
                                                    key={topic}
                                                    className={`pub-tag-autocomplete-item ${idx === manualTagActiveIdx ? 'pub-tag-autocomplete-item-active' : ''}`}
                                                    onMouseDown={(e) => { e.preventDefault(); handleManualTagSelect(topic); }}
                                                    onMouseEnter={() => setManualTagActiveIdx(idx)}
                                                >
                                                    {topic}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
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
                                    {loading ? 'Adding...' : 'Add Publication'}
                                </button>
                            </div>
                        </form>
                    ) : (
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
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                            id="file-input"
                                        />
                                        <label htmlFor="file-input" className="file-select-button">
                                            Select File
                                        </label>
                                        <p className="file-help">PDF or Word (max 10MB)</p>
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPublicationModal;
