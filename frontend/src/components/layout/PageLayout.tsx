import React from 'react';
import Navbar from './Navbar';
import './PageLayout.css';

export interface PageLayoutProps {
    children: React.ReactNode;
    showNavbar?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({
    children,
    showNavbar = true
}) => {
    return (
        <div className="page-layout">
            {showNavbar && <Navbar />}
            <main className="page-content">
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
