import React, { useState } from 'react';
import type { UpdateUserData } from '../../services/userService';
import FormInput from '../common/FormInput';
import Autocomplete from '../common/Autocomplete';
import { TURKISH_UNIVERSITIES, TURKISH_DEPARTMENTS } from '../../data/turkishUniversities';
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
                label="Bio"
                value={formData.bio || ''}
                onChange={updateField('bio')}
                multiline
                placeholder="Tell us about your research interests and background..."
            />

            <label className="form-label">
                Institution
                <Autocomplete
                    suggestions={TURKISH_UNIVERSITIES}
                    value={formData.institution || ''}
                    onChange={(val) => setFormData({ ...formData, institution: val })}
                    placeholder="Select your institution"
                    required
                    strict
                    className="profile-autocomplete-input"
                    invalidMessage="Please select an institution from the list"
                />
            </label>

            <label className="form-label">
                Department
                <Autocomplete
                    suggestions={TURKISH_DEPARTMENTS}
                    value={formData.department || ''}
                    onChange={(val) => setFormData({ ...formData, department: val })}
                    placeholder="Select your department"
                    required
                    strict
                    className="profile-autocomplete-input"
                    invalidMessage="Please select a department from the list"
                />
            </label>

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
