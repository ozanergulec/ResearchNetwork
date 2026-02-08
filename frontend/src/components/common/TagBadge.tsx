import React from 'react';
import '../../styles/profile/TagBadge.css';

interface TagBadgeProps {
    name: string;
    usageCount?: number;
}

const TagBadge: React.FC<TagBadgeProps> = ({ name, usageCount }) => {
    return (
        <span className="tag-badge">
            {name}
            {usageCount !== undefined && usageCount > 0 && (
                <span className="tag-count">{usageCount}</span>
            )}
        </span>
    );
};

export default TagBadge;
