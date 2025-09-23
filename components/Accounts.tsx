
import React, { useState } from 'react';
import { useEffect } from 'react';
import type { Account } from '../types';
import { fetchUserProfile, updateUserProfile, deleteAccount, updateAccountCommissions } from '../services/databaseService';

interface AccountsProps {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'status'>) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  trades: Trade[];
}

interface UserProfile {
  base_currency: string;
  risk_per_trade: number;
  default_leverage: number;
}

const DeleteAccountModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  accountName: string;
}> = ({ isOpen, onClose, onConfirm, accountName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-200">Delete Account</h2>
        <p className="text-gray-400 mb-6">
          Are you sure you want to delete the account "{accountName}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="px-6 py-2 rounded-lg bg-brand-red text-white font-bold hover:bg-red-500"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountCard: React.FC<{ 
  account: Account; 
  onRemove: (accountId: string) => void;
  onUpdate: (accountId: string, updates: Partial<Account>) => void;
  trades: Trade[];
}> = ({ account, onRemove, onUpdate }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    openCloseCommission: account.openCloseCommission,
    nightCommission: account.nightCommission
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = () => {
    try {
      onRemove(account.id);
      setShowDeleteModal(false);
    } catch (error) {
      // Error handling is done in the parent component
      setShowDeleteModal(false);
    }
  };

  const handleSaveCommissions = async () => {
    // Validate input
    if (editData.openCloseCommission < 0 || editData.openCloseCommission > 100) {
      setSaveMessage({ type: 'error', text: 'Open/Close commission must be between 0% and 100%' });
      return;
    }
    
    if (editData.nightCommission < 0 || editData.nightCommission > 100) {
      setSaveMessage({ type: 'error', text: 'Night commission must be between 0% and 100%' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      await updateAccountCommissions(account.id, editData);
      onUpdate(account.id, editData);
      
      setSaveMessage({ type: 'success', text: 'Commission settings updated successfully' });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating commissions:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to update commission settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      openCloseCommission: account.openCloseCommission,
      nightCommission: account.nightCommission
    });
    setIsEditing(false);
    setSaveMessage(null);
  };

  // Calculate current balance based on starting balance + realized P&L from trades
  const accountTrades = trades.filter(trade => trade.accountId === account.id);
  const realizedPnl = accountTrades
    .filter(trade => trade.status === TradeStatus.CLOSED)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const currentBalance = account.startingBalance + realizedPnl;
  return (
    <>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 transition-all hover:border-brand-blue hover:shadow-2xl">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-xl font-bold text-gray-200">{account.name}</h3>
        <p className="text-sm text-gray-400">Created: {new Date(account.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${account.status === 'active' ? 'bg-green-500/20 text-brand-green' : 'bg-gray-600 text-gray-300'}`}>
          {account.status}
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-gray-400 hover:text-brand-blue transition-colors p-1"
          title="Edit commission settings"
        >
          <i className="ri-settings-3-line text-lg"></i>
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-gray-400 hover:text-brand-red transition-colors p-1"
          title="Delete account"
        >
          <i className="ri-delete-bin-line text-lg"></i>
        </button>
      </div>
    </div>
    <div className="mt-6">
      <p className="text-gray-400">Starting Balance</p>
      <p className="text-3xl font-mono font-bold text-brand-blue">${account.startingBalance.toLocaleString()}</p>
    </div>
    
    <div className="mt-4">
      <p className="text-gray-400">Current Balance</p>
      <p className="text-2xl font-mono font-bold text-gray-200">${currentBalance.toLocaleString()}</p>
    </div>
    
    {/* Commission Settings Section */}
    <div className="mt-6 pt-4 border-t border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Commission Settings</h4>
      </div>
      
      {saveMessage && (
        <div className={`px-3 py-2 rounded-lg mb-3 text-sm ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {saveMessage.text}
        </div>
      )}
      
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Open/Close Commission (%)
              <span className="ml-1 text-gray-500" title="Commission charged when opening and closing positions">ⓘ</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={editData.openCloseCommission}
              onChange={(e) => setEditData(prev => ({ ...prev, openCloseCommission: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Night Commission (% per day)
              <span className="ml-1 text-gray-500" title="Daily commission charged for overnight positions">ⓘ</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={editData.nightCommission}
              onChange={(e) => setEditData(prev => ({ ...prev, nightCommission: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-3 py-1 text-xs rounded text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCommissions}
              disabled={isSaving}
              className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
                isSaving
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-blue-500'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Open/Close</p>
            <p className="font-semibold text-gray-200">{account.openCloseCommission}%</p>
          </div>
          <div>
            <p className="text-gray-400">Night (per day)</p>
            <p className="font-semibold text-gray-200">{account.nightCommission}%</p>
          </div>
        </div>
      )}
    </div>
  </div>
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        accountName={account.name}
      />
    </>
  );
};

const AddAccountModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (account: { name: string; startingBalance: number }) => void }> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && balance) {
      onAdd({ name, startingBalance: parseFloat(balance) });
      setName('');
      setBalance('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-gray-200">Add New Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="e.g., Interactive Brokers"
              required
            />
          </div>
          <div>
            <label htmlFor="balance" className="block text-sm font-medium text-gray-400 mb-1">Starting Balance (USD)</label>
            <input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="e.g., 10000"
              required
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-brand-blue text-white font-bold hover:bg-blue-500">Add Account</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Accounts: React.FC<AccountsProps> = ({ accounts, addAccount, removeAccount, updateAccount, trades }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<UserProfile>({
    base_currency: 'USD',
    risk_per_trade: 2.5,
    default_leverage: 5
  });
  const [originalSettings, setOriginalSettings] = useState<UserProfile>({
    base_currency: 'USD',
    risk_per_trade: 2.5,
    default_leverage: 5
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user profile settings on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoadingSettings(true);
        setSettingsError(null);
        const profile = await fetchUserProfile();
        setSettings(profile);
        setOriginalSettings(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
        setSettingsError('Failed to load user settings');
        // Keep default settings on error
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadUserProfile();
  }, []);
  
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newSettings = {
      ...settings,
      [name]: name === 'base_currency' ? value : parseFloat(value)
    };
    
    setSettings(newSettings);
    // Clear any previous save messages when user makes changes
    setSaveMessage(null);
  };

  const handleSaveSettings = async () => {
    // Validate form data
    if (!settings.base_currency || settings.risk_per_trade <= 0 || settings.default_leverage <= 0) {
      setSaveMessage({ type: 'error', text: 'Please ensure all fields have valid values' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);
      setSettingsError(null);

      const newSettings: UserProfile = {
        ...settings
      };

      await updateUserProfile(newSettings);
      setOriginalSettings(newSettings);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating user profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if settings have changed
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-200">Accounts</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-colors"
        >
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => <AccountCard key={acc.id} account={acc} onRemove={removeAccount} onUpdate={updateAccount} trades={trades} />)}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-200 mb-6">Settings</h2>
          {settingsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {settingsError}
            </div>
          )}
          {saveMessage && (
            <div className={`px-4 py-3 rounded-lg mb-4 ${
              saveMessage.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}
          {isLoadingSettings ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading settings...</p>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <label htmlFor="base_currency" className="block text-sm font-medium text-gray-400 mb-1">Base Currency</label>
                  <select id="base_currency" name="base_currency" value={settings.base_currency} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="risk_per_trade" className="block text-sm font-medium text-gray-400 mb-1">Risk per Trade (%)</label>
                  <input type="number" step="0.1" min="0.1" max="100" id="risk_per_trade" name="risk_per_trade" value={settings.risk_per_trade} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
               <div>
                  <label htmlFor="default_leverage" className="block text-sm font-medium text-gray-400 mb-1">Default Leverage</label>
                  <input type="number" min="1" max="500" id="default_leverage" name="default_leverage" value={settings.default_leverage} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                isSaving || !hasUnsavedChanges
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-blue-500'
              }`}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
          </>
          )}
      </div>


      <AddAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addAccount} />
    </div>
  );
};

export default Accounts;