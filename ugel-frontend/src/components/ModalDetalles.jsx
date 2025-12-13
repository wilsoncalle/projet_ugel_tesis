import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ModalDetalles = ({
  isOpen,
  onClose,
  data = {},
  title = 'Detalles',
  size = 'md',
  renderContent,
  fields = [],
  children
}) => {
  const getSizeClasses = () => {
    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-3xl',
      xl: 'max-w-5xl'
    };
    return sizes[size] || sizes.md;
  };

  const renderDefaultContent = () => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="col-span-2 text-center py-8">
          <p className="text-gray-500">No hay información disponible</p>
        </div>
      );
    }

    const items =
      fields.length > 0
        ? fields.map((field, index) => ({
            key: field.key,
            label: field.label,
            value: field.render
              ? field.render(data[field.key], data)
              : data[field.key] || '-'
          }))
        : Object.entries(data)
            .filter(([key, value]) => key !== 'id' && key !== 'isPreview' && typeof value !== 'function')
            .map(([key, value]) => ({
              key,
              label: key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim(),
              value: value === null || value === undefined ? '-' : String(value)
            }));

    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {items.map((item, index) => (
          <div key={index}>
            <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={`relative w-full transform overflow-hidden rounded-2xl bg-white px-6 py-6 text-left shadow-2xl transition-all sm:my-8 ${getSizeClasses()}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1 rounded-full bg-gray-100 px-4 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    Cerrar
                  </button>
                </div>

                {/* Content */}
                <div className="mt-2">
                  {renderContent ? renderContent(data) : renderDefaultContent()}
                  {children && <div className="mt-8 border-t border-gray-100 pt-6">{children}</div>}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ModalDetalles;
