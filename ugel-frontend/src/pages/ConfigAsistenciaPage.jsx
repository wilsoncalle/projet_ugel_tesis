import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Notification from '../components/Notification';
import DateConfig from '../components/DateConfig';
import { asistenciaConfigService } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ConfigAsistenciaPage = () => {
  useDocumentTitle('Configuración de Asistencia - COAC-UGEL');

  const [form, setForm] = useState({
    minutos_tolerancia_por_dia: 10,
    dias_tolerancia_por_mes: 10,
    aplica_desde: '',
    hora_entrada: '09:00',
  });

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await asistenciaConfigService.getGlobal();
        const data = res.data?.data;
        if (data) {
          setForm({
            minutos_tolerancia_por_dia: data.minutos_tolerancia_por_dia,
            dias_tolerancia_por_mes: data.dias_tolerancia_por_mes,
            aplica_desde: data.aplica_desde?.slice?.(0, 10) || '',
            hora_entrada: data.hora_entrada?.slice?.(0, 5) || '09:00',
          });
        }
      } catch (err) {
        console.error('Error cargando configuración global:', err);
      }
    };
    load();
  }, []);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await asistenciaConfigService.saveGlobal(form);
      setNotification({
        type: 'success',
        message: 'Configuración global guardada correctamente',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setNotification({
        type: 'error',
        message: 'Error al guardar la configuración',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Asistencia</h1>
          <p className="mt-1 text-sm text-gray-500">
            Defina las reglas globales de tolerancia para la asistencia del personal.
          </p>
        </div>
      </div>

      {notification && <Notification {...notification} onClose={() => setNotification(null)} />}

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-4">
          <Input
            label="Minutos de tolerancia por día"
            type="number"
            value={form.minutos_tolerancia_por_dia}
            onChange={(e) => handleChange('minutos_tolerancia_por_dia', e.target.value)}
            min={0}
            placeholder="Ej. 10"
          />
          <Input
            label="Días de tolerancia por mes"
            type="number"
            value={form.dias_tolerancia_por_mes}
            onChange={(e) => handleChange('dias_tolerancia_por_mes', e.target.value)}
            min={0}
            placeholder="Ej. 3"
          />
          
          <Input
            label="Hora de entrada"
            type="time"
            value={form.hora_entrada}
            onChange={(e) => handleChange('hora_entrada', e.target.value)}
          />

          <DateConfig
            label="Aplicar desde"
            value={form.aplica_desde}
            onChange={(val) => handleChange('aplica_desde', val)}
            minYear={new Date().getFullYear()}
            maxYear={new Date().getFullYear() + 5}
            disableFuture={false}
            disablePast={true}
          />

          <div className="md:col-span-4 flex justify-end pt-0">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Más adelante puedes agregar una tabla con overrides por personal */}
    </div>
  );
};

export default ConfigAsistenciaPage;
