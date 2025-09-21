
import React, { useState } from 'react';
import type { Account } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface AccountsProps {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'status'>) => void;
}

const AccountCard: React.FC<{ account: Account }> = ({ account }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 transition-all hover:border-brand-blue hover:shadow-2xl">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-xl font-bold text-gray-200">{account.name}</h3>
        <p className="text-sm text-gray-400">Created: {new Date(account.createdAt).toLocaleDateString()}</p>
      </div>
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${account.status === 'active' ? 'bg-green-500/20 text-brand-green' : 'bg-gray-600 text-gray-300'}`}>
        {account.status}
      </span>
    </div>
    <div className="mt-6">
      <p className="text-gray-400">Starting Balance</p>
      <p className="text-3xl font-mono font-bold text-brand-blue">${account.startingBalance.toLocaleString()}</p>
    </div>
  </div>
);

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


const Accounts: React.FC<AccountsProps> = ({ accounts, addAccount }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const {name, value} = e.target;
      setSettings(prev => ({...prev, [name]: name === 'baseCurrency' ? value : parseFloat(value) }));
  }

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
        {accounts.map(acc => <AccountCard key={acc.id} account={acc} />)}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-200 mb-6">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-400 mb-1">Base Currency</label>
                  <select id="baseCurrency" name="baseCurrency" value={settings.baseCurrency} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="riskPerTrade" className="block text-sm font-medium text-gray-400 mb-1">Risk per Trade (%)</label>
                  <input type="number" id="riskPerTrade" name="riskPerTrade" value={settings.riskPerTrade} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
               <div>
                  <label htmlFor="defaultLeverage" className="block text-sm font-medium text-gray-400 mb-1">Default Leverage</label>
                  <input type="number" id="defaultLeverage" name="defaultLeverage" value={settings.defaultLeverage} onChange={handleSettingsChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
          </div>
      </div>


      <AddAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addAccount} />
    </div>
  );
};

export default Accounts;