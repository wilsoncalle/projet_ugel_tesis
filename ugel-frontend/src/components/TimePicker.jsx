import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ClockIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

const pad = (n) => String(n).padStart(2, '0');

const TimePicker = ({ label = 'Hora', value = '', onChange, stepMinutes = 5, className = '' }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = useMemo(() => Array.from({ length: Math.floor(60 / stepMinutes) }, (_, i) => pad(i * stepMinutes)), [stepMinutes]);

  const handleSelect = (h, m, close) => {
    const time = `${pad(h)}:${pad(m)}`;
    onChange && onChange(time);
    close();
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <Popover className="relative">
        <div className="relative">
          <Popover.Button as="div" className="w-full">
            <input
              type="text"
              value={inputValue}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10 cursor-pointer"
              placeholder="HH:MM"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-events-none">
              <ClockIcon className="h-4 w-4 text-gray-400" />
            </div>
          </Popover.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <Popover.Panel className="absolute z-50 mt-1 left-0">
            {({ close }) => (
              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg w-[18rem]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Horas</div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {hours.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelect(Number(h), value?.split(':')[1] || '00', close)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${value?.startsWith(h + ':') ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Minutos</div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {minutes.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelect(value?.split(':')[0] || '00', Number(m), close)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${value?.endsWith(':' + m) || value === m ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
};

export default TimePicker;


