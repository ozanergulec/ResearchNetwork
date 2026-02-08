import React, { useState } from 'react';
import type { UpdateUserData } from '../../services/userService';
import FormInput from '../common/FormInput';
import '../../styles/profile/ProfileEditForm.css';

interface ProfileEditFormProps {
    initialData: UpdateUserData;
    onSave: (data: UpdateUserData) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
    initialData,
    onSave,
    onCancel,
    loading
}) => {
    const [formData, setFormData] = useState<UpdateUserData>(initialData);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    const updateField = (field: keyof UpdateUserData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    return (
        <form onSubmit={handleSubmit} className="profile-edit-form">
            <FormInput
                label="Full Name"
                value={formData.fullName || ''}
                onChange={updateField('fullName')}
                required
            />

            <FormInput
                label="Title"
                value={formData.title || ''}
                onChange={updateField('title')}
                placeholder="e.g., Prof. Dr., Arş. Gör."
            />

            <FormInput
                label="Institution"
                value={formData.institution || ''}
                onChange={updateField('institution')}
                placeholder="e.g., Boğaziçi Üniversitesi"
            />

            <FormInput
                label="Department"
                value={formData.department || ''}
                onChange={updateField('department')}
                placeholder="e.g., Bilgisayar Mühendisliği"
            />

            <FormInput
                label="Bio"
                value={formData.bio || ''}
                onChange={updateField('bio')}
                multiline
                placeholder="Tell us about your research interests and background..."
            />

            <div className="profile-form-actions">
                <button
                    type="submit"
                    className="profile-save-button"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="profile-cancel-button"
                    disabled={loading}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default ProfileEditForm;
