# Sistema de Atajos de Teclado - Dashboard Vigilante

## Descripción General

El sistema de atajos de teclado está diseñado para acelerar drásticamente el flujo de trabajo del vigilante en los procesos de registro y consulta de visitas. Utiliza un enfoque inteligente que se adapta al contexto de la pestaña activa.

## Funcionalidades Implementadas

### 1. Enter como Submit Global

**Comportamiento:**
- Al presionar `Enter` en cualquier campo de texto (`input type="text"`, `type="number"`, etc.), se ejecuta la acción del botón primario del formulario
- No se activa si el foco está en un `textarea` o `button`
- Funciona en ambas pestañas (Activos e Historial)

**Casos de uso:**
- **Pestaña Activos:** Si hay visitantes en espera, requiere doble Enter para registrar la visita completa (evita registros accidentales)
- **Pestaña Historial:** Ejecuta la búsqueda de historial con los filtros actuales (un solo Enter)

### 2. Enfoque Automático Contextual - Pestaña "Visitantes Activos"

**Comportamiento:**
- Al presionar cualquier tecla numérica (0-9) cuando ningún elemento del formulario tiene foco
- Automáticamente enfoca el campo "Número de Documento"
- Inserta el número presionado en el campo

**Flujo de trabajo optimizado:**
1. Usuario presiona `5` → Campo de documento se enfoca y muestra "5"
2. Usuario continúa escribiendo `12345678` → Campo muestra "512345678"
3. Usuario presiona `Enter` → Se ejecuta la búsqueda automática del visitante
4. Usuario llena datos de visita y presiona `Enter` → Aparece confirmación de doble Enter
5. Usuario presiona `Enter` nuevamente → Se registra la visita

### 3. Enfoque Automático Contextual - Pestaña "Historial de Visitas"

**Comportamiento:**
- Al presionar cualquier tecla alfanumérica (letras o números) cuando ningún elemento del formulario tiene foco
- Automáticamente enfoca el campo "Buscar Visitante"
- Inserta el carácter presionado en el campo

**Flujo de trabajo optimizado:**
1. Usuario presiona `j` → Campo de búsqueda se enfoca y muestra "j"
2. Usuario continúa escribiendo `juan` → Campo muestra "juan"
3. Usuario presiona `Enter` → Se ejecuta la búsqueda de historial

### 4. Confirmación de Doble Enter para Registro de Visitas

**Comportamiento:**
- En la pestaña "Visitantes Activos", para registrar una visita se requiere presionar Enter dos veces consecutivas
- El primer Enter muestra una confirmación visual amarilla
- El segundo Enter ejecuta el registro de la visita
- Si pasan más de 3 segundos entre Enter, el contador se resetea

**Beneficios:**
- **Prevención de errores:** Evita registros accidentales por Enter involuntario
- **Confirmación visual:** El usuario ve claramente que necesita confirmar
- **Timeout inteligente:** Se resetea automáticamente si pasa mucho tiempo

**Indicación visual:**
- Aparece un banner amarillo con icono de advertencia
- Mensaje: "Presione Enter nuevamente para confirmar el registro de visita"
- Se oculta automáticamente después de 3 segundos

## Implementación Técnica

### Hook Personalizado: `useKeyboardShortcuts`

```javascript
const useKeyboardShortcuts = ({
  activeTab,        // Pestaña activa ('activos' o 'historial')
  onSubmit,         // Función a ejecutar con Enter
  refs,            // Referencias a elementos del DOM
  enabled          // Si los atajos están habilitados
});
```

### Gestión del Estado

- **Event Listeners:** Se agregan y remueven correctamente para evitar memory leaks
- **Detección de Foco:** Verifica si hay elementos de formulario enfocados
- **Prevención de Conflictos:** No interfiere con el comportamiento nativo de los formularios

### Referencias de DOM

- `documentoInput`: Referencia al input de número de documento
- `busquedaInput`: Referencia al input de búsqueda de historial

## Componente de Ayuda Visual

### `KeyboardShortcutsHelp`

- **Botón flotante:** Icono de teclado en la esquina inferior derecha
- **Modal informativo:** Muestra los atajos disponibles según la pestaña activa
- **Primera vez:** Se muestra automáticamente al cargar la aplicación
- **Persistencia:** Recuerda que el usuario ya vio la ayuda

## Consideraciones de Usabilidad

### Ventajas

1. **Velocidad:** Reduce significativamente el tiempo de registro
2. **Eficiencia:** Permite trabajar sin usar el mouse
3. **Intuitividad:** Se adapta al contexto de la pestaña activa
4. **No intrusivo:** Solo funciona cuando es apropiado

### Limitaciones

1. **Aprendizaje:** Requiere que el usuario conozca los atajos
2. **Contexto:** Solo funciona cuando no hay elementos enfocados
3. **Específico:** Diseñado específicamente para el flujo de trabajo del vigilante

## Configuración

### Habilitar/Deshabilitar

```javascript
useKeyboardShortcuts({
  activeTab,
  onSubmit: handleEnterSubmit,
  refs: { documentoInput, busquedaInput },
  enabled: isAuthenticated // Solo cuando el usuario está autenticado
});
```

### Personalización

Los atajos se pueden personalizar modificando el hook `useKeyboardShortcuts`:

- **Teclas de enfoque:** Cambiar las expresiones regulares para detectar teclas
- **Comportamiento de Enter:** Modificar la lógica de `handleEnterSubmit`
- **Referencias:** Agregar nuevas referencias para otros campos

## Testing

### Casos de Prueba

1. **Enter como Submit:**
   - Presionar Enter en campo de texto → Debe ejecutar acción correspondiente
   - Presionar Enter en textarea → No debe ejecutar acción
   - Presionar Enter en botón → No debe ejecutar acción

2. **Enfoque Automático - Activos:**
   - Presionar número sin foco → Debe enfocar campo de documento
   - Presionar letra sin foco → No debe hacer nada
   - Presionar número con foco en formulario → No debe hacer nada

3. **Enfoque Automático - Historial:**
   - Presionar carácter alfanumérico sin foco → Debe enfocar campo de búsqueda
   - Presionar carácter especial sin foco → No debe hacer nada
   - Presionar carácter con foco en formulario → No debe hacer nada

## Mantenimiento

### Actualizaciones

- **Nuevos atajos:** Agregar en el hook `useKeyboardShortcuts`
- **Nuevas referencias:** Actualizar en los componentes padre e hijo
- **Nuevos comportamientos:** Modificar las funciones de manejo de eventos

### Debugging

- **Console logs:** Agregar logs temporales en las funciones de manejo
- **Estado de foco:** Verificar `document.activeElement`
- **Referencias:** Confirmar que las refs apunten a los elementos correctos

## Futuras Mejoras

1. **Atajos adicionales:** Ctrl+S para guardar, Esc para cancelar
2. **Configuración de usuario:** Permitir personalizar atajos
3. **Indicadores visuales:** Mostrar qué atajos están disponibles
4. **Tutorial interactivo:** Guía paso a paso para nuevos usuarios
