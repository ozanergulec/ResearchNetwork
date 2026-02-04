import React, { useState } from 'react';
import { publicationsApi, type CreatePublicationDto } from '../services/publicationService';
import '../styles/PublicationComponents.css';

interface AddPublicationModalProps {
    onClose: () => void;
    onPublicationAdded: () => void;
}

type TabType = 'manual' | 'file';

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
        tags: ''
    });

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUploadData, setFileUploadData] = useState({
        title: '',
        abstract: '',
        tags: ''
    });
    const [dragActive, setDragActive] = useState(false);

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
            setError('Sadece PDF ve Word dosyaları kabul edilir.');
            return;
        }

        if (file.size > maxSize) {
            setError('Dosya boyutu 10MB\'dan küçük olmalıdır.');
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
            setError('Başlık zorunludur.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const tags = formData.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            const publicationData: CreatePublicationDto = {
                title: formData.title,
                abstract: formData.abstract || undefined,
                doi: formData.doi || undefined,
                publishedDate: formData.publishedDate || undefined,
                tags: tags.length > 0 ? tags : undefined
            };

            await publicationsApi.create(publicationData);
            onPublicationAdded();
            onClose();
        } catch (err: any) {
            console.error('Failed to create publication', err);
            setError(err.response?.data?.message || 'Yayın eklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) {
            setError('Lütfen bir dosya seçin.');
            return;
        }

        if (!fileUploadData.title.trim()) {
            setError('Başlık zorunludur.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Upload file first
            const uploadResponse = await publicationsApi.uploadFile(selectedFile);
            const fileUrl = uploadResponse.data.fileUrl;

            // Create publication with file URL
            const tags = fileUploadData.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            const publicationData: CreatePublicationDto = {
                title: fileUploadData.title,
                abstract: fileUploadData.abstract || undefined,
                fileUrl,
                tags: tags.length > 0 ? tags : undefined
            };

            await publicationsApi.create(publicationData);
            onPublicationAdded();
            onClose();
        } catch (err: any) {
            console.error('Failed to upload and create publication', err);
            setError(err.response?.data?.message || 'Dosya yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Yeni Yayın Ekle</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
                        onClick={() => setActiveTab('manual')}
                    >
                        📝 Manuel Giriş
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => setActiveTab('file')}
                    >
                        📄 Dosya Yükle
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
                                <label htmlFor="title">Başlık *</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleManualInputChange}
                                    required
                                    placeholder="Yayın başlığını girin"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="abstract">Özet (Abstract)</label>
                                <textarea
                                    id="abstract"
                                    name="abstract"
                                    value={formData.abstract}
                                    onChange={handleManualInputChange}
                                    rows={4}
                                    placeholder="Yayının özetini girin (isteğe bağlı)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="doi">DOI Numarası</label>
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
                                <label htmlFor="publishedDate">Yayın Tarihi</label>
                                <input
                                    type="date"
                                    id="publishedDate"
                                    name="publishedDate"
                                    value={formData.publishedDate}
                                    onChange={handleManualInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="tags">Etiketler</label>
                                <input
                                    type="text"
                                    id="tags"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleManualInputChange}
                                    placeholder="Etiketleri virgülle ayırın"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Ekleniyor...' : 'Yayın Ekle'}
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
                                        <span className="file-icon">📄</span>
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
                                        <p>📁 Dosyayı buraya sürükleyin veya tıklayarak seçin</p>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                            id="file-input"
                                        />
                                        <label htmlFor="file-input" className="file-select-button">
                                            Dosya Seç
                                        </label>
                                        <p className="file-help">PDF veya Word (max 10MB)</p>
                                    </>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="file-title">Başlık *</label>
                                <input
                                    type="text"
                                    id="file-title"
                                    name="title"
                                    value={fileUploadData.title}
                                    onChange={handleFileInputChange}
                                    required
                                    placeholder="Yayın başlığını girin"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="file-abstract">Özet (Abstract)</label>
                                <textarea
                                    id="file-abstract"
                                    name="abstract"
                                    value={fileUploadData.abstract}
                                    onChange={handleFileInputChange}
                                    rows={4}
                                    placeholder="Yayının özetini girin (isteğe bağlı)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="file-tags">Etiketler</label>
                                <input
                                    type="text"
                                    id="file-tags"
                                    name="tags"
                                    value={fileUploadData.tags}
                                    onChange={handleFileInputChange}
                                    placeholder="Etiketleri virgülle ayırın"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Yükleniyor...' : 'Yükle ve Ekle'}
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
