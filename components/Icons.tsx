
import React from 'react';

export const LogoIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand-blue">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DashboardIcon: React.FC = () => <i className="ri-dashboard-line text-2xl"></i>;
export const IntelligenceIcon: React.FC = () => <i className="ri-line-chart-line text-2xl"></i>;
export const AccountsIcon: React.FC = () => <i className="ri-bank-card-line text-2xl"></i>;
export const OperationsIcon: React.FC = () => <i className="ri-briefcase-4-line text-2xl"></i>;
export const ArrowUpIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-arrow-up-line ${className}`}></i>;
export const ArrowDownIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-arrow-down-line ${className}`}></i>;
export const TrashIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-delete-bin-line ${className}`}></i>;
export const StarIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-star-line ${className}`}></i>;
export const StarFillIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-star-fill ${className}`}></i>;
export const AddIcon: React.FC<{className?: string}> = ({className}) => <i className={`ri-add-line ${className}`}></i>;
