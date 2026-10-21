import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'chat' | 'history';
  onTabChange: (tab: 'chat' | 'history') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="w-full flex items-center justify-around h-11 max-h-[48px] select-none">
      <button
        type="button"
        onClick={() => onTabChange('chat')}
        className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
          activeTab === 'chat'
            ? 'text-blue-600 bg-blue-50/80 font-bold'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
        }`}
      >
        <MessageSquare className="w-4 h-4 stroke-[2.2]" />
        <span className="text-[12px] leading-tight">Chat</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('history')}
        className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
          activeTab === 'history'
            ? 'text-blue-600 bg-blue-50/80 font-bold'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
        }`}
      >
        <Clock className="w-4 h-4 stroke-[2.2]" />
        <span className="text-[12px] leading-tight">Historique</span>
      </button>
    </nav>
  );
};
