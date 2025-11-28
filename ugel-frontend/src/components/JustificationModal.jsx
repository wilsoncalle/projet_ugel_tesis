import React, { useState, useRef, useEffect } from 'react';
import ModalGenerico from './ModalGenerico';
import Button from './Button';
import { CloudArrowUpIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const JustificationModal = ({ isOpen, onClose, onSubmit, attendanceRecord, isLoading }) => {
  const [motivo, setMotivo] = useState('');
  const [archivo, setArchivo] = useState(null);
  
  // Refs para el manejo de archivos y el textarea
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  
  const [dragActive, setDragActive] = useState(false);
  const MAX_CHARS = 500;

  // Efecto para auto-ajustar la altura del textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Primero reseteamos la altura para obtener el scrollHeight correcto si se borra texto
      textareaRef.current.style.height = 'auto';
      // Ajustamos a la altura del contenido
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [motivo]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (validTypes.includes(file.type)) {
      setArchivo(file);
    } else {
      alert('Solo se permiten archivos PDF o imágenes (JPG, PNG)');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      alert('Por favor ingrese el motivo de la justificación');
      return;
    }
    onSubmit({ motivo, archivo });
  };

  const removeFile = () => {
    setArchivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ModalGenerico
      isOpen={isOpen}
      onClose={onClose}
      title={`Justificar ${attendanceRecord?.estado_presencia || 'Falta/Tardanza'}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Sección de detalles informativos */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
          <div className="flex items-start gap-3">
             <div className="mt-0.5">
               <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <div>
                <p className="font-semibold text-blue-900 mb-1">Detalles del registro:</p>
                <ul className="text-blue-700 space-y-0.5">
                  <li><span className="font-medium">Fecha:</span> {attendanceRecord?.fecha ? new Date(attendanceRecord.fecha).toLocaleDateString() : '-'}</li>
                  <li><span className="font-medium">Estado:</span> {attendanceRecord?.estado_presencia}</li>
                  {attendanceRecord?.minutos_tardanza > 0 && (
                    <li><span className="font-medium">Tiempo:</span> {attendanceRecord.minutos_tardanza} min de tardanza</li>
                  )}
                </ul>
             </div>
          </div>
        </div>

        {/* AREA DE TEXTO MEJORADA */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="motivo" className="block text-sm font-semibold text-gray-700">
              Motivo de la justificación <span className="text-red-500">*</span>
            </label>
          </div>
          
          <div className="relative">
            <textarea
              id="motivo"
              ref={textareaRef}
              className="w-full rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-600 focus:ring-blue-600 text-gray-700 text-sm leading-relaxed p-3 min-h-[100px] resize-none overflow-hidden transition-all duration-200 ease-in-out"
              placeholder="Explique detalladamente la razón de su falta o tardanza..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              maxLength={MAX_CHARS}
              rows={3}
            />
            {/* Contador de caracteres */}
            <div className={`absolute bottom-2 right-3 text-xs font-medium transition-colors ${
              motivo.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'
            }`}>
              {motivo.length}/{MAX_CHARS}
            </div>
          </div>
        </div>

        {/* Sección de Archivos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Evidencia (Opcional)
          </label>
          <p className="text-xs text-gray-500 mb-3">Adjunte certificados médicos o documentos de respaldo.</p>
          
          {!archivo ? (
            <div
              className={`group border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-white p-3 rounded-full shadow-sm w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                <CloudArrowUpIcon className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-gray-700 font-medium">
                <span className="text-blue-600">Clic para subir</span> o arrastre aquí
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG (Máx. 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <DocumentTextIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {archivo.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="Eliminar archivo"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!motivo.trim()}
          >
            Enviar Justificación
          </Button>
        </div>
      </form>
    </ModalGenerico>
  );
};

export default JustificationModal;