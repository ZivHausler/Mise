import React from 'react';

export interface Tab<K extends string = string> {
  key: K;
  label: string;
}

interface TabsProps<K extends string = string> {
  tabs: Tab<K>[];
  activeTab: K;
  onChange: (key: K) => void;
}

export function Tabs<K extends string>({ tabs, activeTab, onChange }: TabsProps<K>) {
  return (
    <div className="flex gap-1 border-b border-neutral-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-body-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'border-b-2 border-primary-500 text-primary-700'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default React.memo(Tabs) as typeof Tabs;
