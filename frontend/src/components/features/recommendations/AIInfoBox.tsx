import React from 'react';
import './RecommendationsComponents.css';

export interface AIInfoBoxProps {
    title?: string;
    description?: string;
}

const AIInfoBox: React.FC<AIInfoBoxProps> = ({
    title = 'AI Matching Engine',
    description = 'Our AI-powered recommendation system will analyze your research interests, publications, and academic profile to suggest the most relevant collaborators. This feature is currently under development.'
}) => {
    return (
        <div className="ai-info-box">
            <div className="ai-info-icon">🤖</div>
            <div className="ai-info-content">
                <h4 className="ai-info-title">{title}</h4>
                <p className="ai-info-text">{description}</p>
            </div>
        </div>
    );
};

export default AIInfoBox;
