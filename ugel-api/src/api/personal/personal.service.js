/**
 * Servicio para gestión de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./personal.repository');
const areasRepository = require('../areas/areas.repository');
const tiposContratoRepository = require('../tipos-contrato/tiposcontrato.repository');
const cargosRepository = require('../cargos/cargos.repository');
const usuariosService = require('../usuarios/usuarios.service');
const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');
const { toLimaDateYYYYMMDD } = require('../../utils/fechas');

// Crea o reactiva usuario automáticamente cuando el personal tiene datos mínimos
const ensureUsuarioParaPersonal = async (personal, userId, origen = 'auto') => {
  try {
    logger.info(`[ensureUsuarioParaPersonal] Iniciando verificación para personal ID ${personal.id} (${origen})`);
    
    // Log de datos recibidos
    logger.debug(`[ensureUsuarioParaPersonal] Datos del personal:`, {
      id: personal.id,
      nombres: personal.nombres,
      apellidos: personal.apellidos,
      numero_documento: personal.numero_documento,
      email: personal.email,
      fecha_nacimiento: personal.fecha_nacimiento
    });

    const fechaNacStr = toLimaDateYYYYMMDD(personal.fecha_nacimiento);
    logger.debug(`[ensureUsuarioParaPersonal] Fecha normalizada: ${fechaNacStr}`);
    
    const tieneDatosMinimos =
      fechaNacStr &&
      personal.numero_documento &&
      personal.email;

    if (!tieneDatosMinimos) {
      logger.warn(
        `[ensureUsuarioParaPersonal] No se creó usuario automático para personal ID ${personal.id} por datos incompletos:`,
        {
          tiene_fecha: !!fechaNacStr,
          tiene_documento: !!personal.numero_documento,
          tiene_email: !!personal.email
        }
      );
      return { created: false, reason: 'datos_incompletos' };
    }

    logger.info(`[ensureUsuarioParaPersonal] Personal ID ${personal.id} tiene datos completos, verificando usuario existente...`);

    const existingUser = await usuariosService.getUsuarioByPersonalId(personal.id);
    
    if (existingUser) {
      logger.info(`[ensureUsuarioParaPersonal] Usuario existente encontrado:`, {
        usuario_id: existingUser.id,
        activo: existingUser.activo,
        nombre_usuario: existingUser.nombre_usuario
      });
    } else {
      logger.info(`[ensureUsuarioParaPersonal] No se encontró usuario existente para personal ID ${personal.id}`);
    }

    const [year, month, day] = fechaNacStr.split('-');
    const password = `${day}${month}${year}`; // DDMMYYYY
    
    logger.debug(`[ensureUsuarioParaPersonal] Contraseña generada (formato DDMMYYYY): ${password}`);

    if (existingUser && existingUser.activo === false) {
      logger.info(`[ensureUsuarioParaPersonal] Reactivando usuario inactivo ID ${existingUser.id}...`);
      
      await usuariosService.updateUsuario(
        existingUser.id,
        {
          nombreUsuario: personal.numero_documento,
          email: personal.email,
          contrasena: password,
          rol: existingUser.rol || 'Personal',
          activo: true,
          personalId: personal.id,
        },
        userId
      );

      logger.info(
        `[ensureUsuarioParaPersonal] Usuario reactivado automáticamente (${origen}) para personal ID: ${personal.id}`
      );
      return { created: false, reactivated: true, userId: existingUser.id };
    }

    if (existingUser && existingUser.activo === true) {
      logger.info(
        `[ensureUsuarioParaPersonal] Personal ID ${personal.id} ya tiene usuario asociado activo (ID ${existingUser.id}), no se crea otro`
      );
      return { created: false, reason: 'ya_existe_activo', userId: existingUser.id };
    }

    // No existe usuario - crear uno nuevo
    logger.info(`[ensureUsuarioParaPersonal] Creando nuevo usuario para personal ID ${personal.id}...`);
    
    const nuevoUsuario = await usuariosService.createUsuario(
      {
        nombreUsuario: personal.numero_documento,
        email: personal.email,
        contrasena: password,
        rol: 'Personal',
        personalId: personal.id,
      },
      userId
    );

    logger.info(
      `[ensureUsuarioParaPersonal] Usuario creado automáticamente (${origen}) para personal ID: ${personal.id}, Usuario ID: ${nuevoUsuario.id}`
    );
    
    return { created: true, userId: nuevoUsuario.id };

  } catch (error) {
    logger.error(
      `[ensureUsuarioParaPersonal] Error creando/reactivando usuario automático para personal ID ${personal.id} (${origen}):`,
      {
        error: error.message,
        stack: error.stack
      }
    );
    // No lanzar el error para que no afecte la actualización del personal
    return { created: false, error: error.message };
  }
};

/**
 * Sincronizar usuarios para todo el personal que cumpla requisitos
 * Incluye limpieza de vínculos incorrectos
 * @param {number} userId - ID del usuario que ejecuta la sincronización
 * @returns {Object} Resultado de la sincronización
 */
const sincronizarUsuariosPersonal = async (userId) => {
  try {
    // PASO 1: Limpiar vínculos incorrectos primero
    logger.info('Limpiando vinculos incorrectos de usuarios...');
    
    // Obtener usuarios que NO son Personal pero tienen personal_id
    const usuariosIncorrectos = await db.query(`
      SELECT id, nombre_usuario, rol, personal_id 
      FROM Usuarios 
      WHERE rol != 'Personal' AND personal_id IS NOT NULL
    `);
    
    let vinculosCorregidos = 0;
    for (const u of usuariosIncorrectos.rows) {
      await db.query('UPDATE Usuarios SET personal_id = NULL WHERE id = $1', [u.id]);
      vinculosCorregidos++;
      logger.info(`Vinculo incorrecto eliminado: Usuario ${u.nombre_usuario} (${u.rol}) ya no apunta a personal_id ${u.personal_id}`);
    }
    
    // PASO 2: Obtener todo el personal activo
    const result = await repository.findAll({ 
      page: 1, 
      limit: 10000,
      activo: true 
    });
    
    const personal = result.personal || [];
    let creados = 0;
    let reactivados = 0;
    let omitidos = 0;
    let yaExistentes = 0;
    let errores = 0;
    const erroresDetalle = [];

    logger.info(`Iniciando sincronizacion de usuarios para ${personal.length} registros de personal`);

    for (const p of personal) {
      try {
        const fechaNacStr = toLimaDateYYYYMMDD(p.fecha_nacimiento);
        const tieneDatosMinimos =
          fechaNacStr &&
          p.numero_documento &&
          p.email;

        if (!tieneDatosMinimos) {
          omitidos++;
          logger.debug(`Personal ID ${p.id} omitido: falta email (${p.email}), fecha_nacimiento (${fechaNacStr}) o numero_documento (${p.numero_documento})`);
          continue;
        }

        // Buscar usuario vinculado a este personal
        const existingUser = await usuariosService.getUsuarioByPersonalId(p.id);
        const [year, month, day] = fechaNacStr.split('-');
        const password = `${day}${month}${year}`; // DDMMYYYY

        if (existingUser && existingUser.activo === false) {
          // Reactivar usuario inactivo
          await usuariosService.updateUsuario(
            existingUser.id,
            {
              nombreUsuario: p.numero_documento,
              email: p.email,
              contrasena: password,
              rol: 'Personal', // Asegurar que sea rol Personal
              activo: true,
              personalId: p.id,
            },
            userId
          );
          reactivados++;
          logger.info(`Usuario reactivado para personal ID ${p.id}: ${p.nombres} ${p.apellidos} (DNI: ${p.numero_documento})`);
          
        } else if (existingUser && existingUser.activo === true) {
          // Ya tiene usuario activo - verificar consistencia
          yaExistentes++;
          
          // Validar que el usuario tenga los datos correctos
          if (existingUser.nombre_usuario !== p.numero_documento || 
              existingUser.email !== p.email ||
              existingUser.rol !== 'Personal') {
            logger.warn(`Personal ID ${p.id} tiene usuario activo pero con datos inconsistentes. Actualizando...`);
            
            await usuariosService.updateUsuario(
              existingUser.id,
              {
                nombreUsuario: p.numero_documento,
                email: p.email,
                contrasena: password,
                rol: 'Personal',
                activo: true,
                personalId: p.id,
              },
              userId
            );
            logger.info(`Usuario actualizado para consistencia: ${p.nombres} ${p.apellidos}`);
          } else {
            logger.debug(`Personal ID ${p.id} ya tiene usuario activo correcto (ID ${existingUser.id})`);
          }
          
        } else if (!existingUser) {
          // NO tiene usuario - verificar que no haya un usuario con ese DNI sin vínculo
          const usuarioExistentePorDNI = await db.query(`
            SELECT id, rol, personal_id 
            FROM Usuarios 
            WHERE nombre_usuario = $1
          `, [p.numero_documento]);
          
          if (usuarioExistentePorDNI.rows.length > 0) {
            const uExistente = usuarioExistentePorDNI.rows[0];
            
            if (uExistente.personal_id === null) {
              // Existe un usuario con ese DNI pero sin personal_id - vincularlo
              await usuariosService.updateUsuario(
                uExistente.id,
                {
                  nombreUsuario: p.numero_documento,
                  email: p.email,
                  contrasena: password,
                  rol: 'Personal',
                  activo: true,
                  personalId: p.id,
                },
                userId
              );
              reactivados++;
              logger.info(`Usuario existente vinculado a personal ID ${p.id}: ${p.nombres} ${p.apellidos}`);
            } else {
              errores++;
              erroresDetalle.push({
                personalId: p.id,
                nombres: `${p.nombres} ${p.apellidos}`,
                error: `Ya existe usuario con DNI ${p.numero_documento} vinculado a otro personal (ID ${uExistente.personal_id})`
              });
              logger.error(`Conflicto: Usuario con DNI ${p.numero_documento} ya existe vinculado a personal ${uExistente.personal_id}`);
            }
          } else {
            // No existe usuario - crear nuevo
            await usuariosService.createUsuario(
              {
                nombreUsuario: p.numero_documento,
                email: p.email,
                contrasena: password,
                rol: 'Personal',
                personalId: p.id,
              },
              userId
            );
            creados++;
            logger.info(`Usuario creado para personal ID ${p.id}: ${p.nombres} ${p.apellidos} (DNI: ${p.numero_documento}, Email: ${p.email})`);
          }
        }
      } catch (error) {
        errores++;
        erroresDetalle.push({
          personalId: p.id,
          nombres: `${p.nombres} ${p.apellidos}`,
          error: error.message
        });
        logger.error(`Error procesando personal ID ${p.id} (${p.nombres} ${p.apellidos}):`, error.message);
      }
    }

    const resultado = {
      total: personal.length,
      creados,
      reactivados,
      yaExistentes,
      omitidos,
      errores,
      vinculosCorregidos,
      erroresDetalle: errores > 0 ? erroresDetalle : undefined
    };

    logger.info('========================================');
    logger.info('Sincronizacion completada:');
    logger.info(`  Total personal: ${resultado.total}`);
    logger.info(`  Usuarios creados: ${resultado.creados}`);
    logger.info(`  Usuarios reactivados: ${resultado.reactivados}`);
    logger.info(`  Ya existentes: ${resultado.yaExistentes}`);
    logger.info(`  Omitidos (datos incompletos): ${resultado.omitidos}`);
    logger.info(`  Vinculos incorrectos corregidos: ${resultado.vinculosCorregidos}`);
    logger.info(`  Errores: ${resultado.errores}`);
    logger.info('========================================');

    return resultado;

  } catch (error) {
    logger.error('Error en sincronizacion de usuarios:', error);
    throw error;
  }
};



/**
 * Obtener todo el personal con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Personal y datos de paginación
 */
const getAllPersonal = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo, areaId, tipoContratoId } = options;
  
  try {
    // Obtener personal con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined,
      areaId: areaId ? parseInt(areaId) : undefined,
      tipoContratoId: tipoContratoId ? parseInt(tipoContratoId) : undefined
    });
    
    // Formatear respuesta - asegurar que personal siempre sea un array
    return {
      personal: Array.isArray(result.personal) ? result.personal : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo personal:', error);
    throw error;
  }
};

/**
 * Obtener personal por ID
 * @param {number} id - ID del personal
 * @returns {Object} Personal encontrado
 */
const getPersonalById = async (id) => {
  try {
    const personal = await repository.findById(id);
    
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    return personal;
    
  } catch (error) {
    logger.error(`Error obteniendo personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener personal por tipo y número de documento
 * @param {string} tipoDocumento - Tipo de documento
 * @param {string} numeroDocumento - Número de documento
 * @returns {Object} Personal encontrado
 */
const getPersonalByDocumento = async (tipoDocumento, numeroDocumento) => {
  try {
    const personal = await repository.findByDocumento(tipoDocumento, numeroDocumento);
    
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    return personal;
    
  } catch (error) {
    logger.error(`Error obteniendo personal por documento ${tipoDocumento}-${numeroDocumento}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo personal
 * @param {Object} personalData - Datos del personal
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Personal creado
 */
const createPersonal = async (personalData, userId) => {
  try {
    const { 
      tipoDocumento, 
      numeroDocumento, 
      nombres, 
      apellidos,
      fechaNacimiento,
      fecha_nacimiento: fechaNacimientoSnake,
      email,
      cargoId,
      areaDestinoId, 
      tipoContratoId 
    } = personalData;
    const fechaNacimientoInput = fechaNacimiento !== undefined ? fechaNacimiento : fechaNacimientoSnake;
    const fechaNacimientoLima = toLimaDateYYYYMMDD(fechaNacimientoInput);
    
    // Verificar que el tipo de documento sea válido
    if (!config.validation.validDocumentTypes.includes(tipoDocumento)) {
      throw new AppError(`Tipo de documento inválido. Tipos válidos: ${config.validation.validDocumentTypes.join(', ')}`, 400);
    }
    
    // Verificar si ya existe personal con el mismo documento
    const existingPersonal = await repository.findByDocumento(tipoDocumento, numeroDocumento);
    if (existingPersonal) {
      throw new AppError('Ya existe personal registrado con este documento', 409);
    }
    
    // Verificar que el área de destino exista y esté activa
    const area = await areasRepository.findById(areaDestinoId);
    if (!area) {
      throw new AppError('Área de destino no encontrada', 404);
    }
    if (!area.activa) {
      throw new AppError('Área de destino inactiva', 400);
    }
    
    // Verificar que el tipo de contrato exista y esté activo
    const tipoContrato = await tiposContratoRepository.findById(tipoContratoId);
    if (!tipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    if (!tipoContrato.activo) {
      throw new AppError('Tipo de contrato inactivo', 400);
    }
    
    // Verificar que el cargo exista y esté activo
    const cargo = await cargosRepository.findById(cargoId);
    if (!cargo) {
      throw new AppError('Cargo no encontrado', 404);
    }
    if (!cargo.activo) {
      throw new AppError('Cargo inactivo', 400);
    }
    
    // Crear el personal
    const newPersonal = await repository.create({
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      nombres,
      apellidos,
      fecha_nacimiento: fechaNacimientoLima,
      email,
      cargo_id: cargoId,
      area_destino_id: areaDestinoId,
      tipo_contrato_id: tipoContratoId,
      activo: true
    });
    
    logger.info(`Personal creado: ${nombres} ${apellidos} por usuario ID: ${userId}`);

    // Crear usuario automático
    await ensureUsuarioParaPersonal(newPersonal, userId, 'creación');
    
    return newPersonal;
    
  } catch (error) {
    logger.error('Error creando personal:', error);
    throw error;
  }
};

/**
 * Actualizar personal existente
 * @param {number} id - ID del personal
 * @param {Object} personalData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Personal actualizado
 */
/**
 * Actualizar personal existente
 * @param {number} id - ID del personal
 * @param {Object} personalData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Personal actualizado
 */
const updatePersonal = async (id, personalData, userId) => {
  try {
    // Verificar si el personal existe
    const existingPersonal = await repository.findById(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    const { 
      tipoDocumento, 
      numeroDocumento, 
      nombres, 
      apellidos,
      fechaNacimiento,
      fecha_nacimiento: fechaNacimientoSnake,
      email,
      cargoId,
      areaDestinoId, 
      tipoContratoId,
      activo
    } = personalData;
    
    const fechaNacimientoInput = fechaNacimiento !== undefined ? fechaNacimiento : fechaNacimientoSnake;
    
    const updateData = {};
    
    // Preparar datos a actualizar
    if (tipoDocumento !== undefined) {
      // Verificar que el tipo de documento sea válido
      if (!config.validation.validDocumentTypes.includes(tipoDocumento)) {
        throw new AppError(`Tipo de documento inválido. Tipos válidos: ${config.validation.validDocumentTypes.join(', ')}`, 400);
      }  
      updateData.tipo_documento = tipoDocumento;
    }
    
    if (numeroDocumento !== undefined) {
      // Si se cambia el documento, verificar que no exista otro personal con ese documento
      if (tipoDocumento !== existingPersonal.tipo_documento || numeroDocumento !== existingPersonal.numero_documento) {
        const duplicatePersonal = await repository.findByDocumento(
          tipoDocumento || existingPersonal.tipo_documento, 
          numeroDocumento
        );
        if (duplicatePersonal && duplicatePersonal.id !== parseInt(id)) {
          throw new AppError('Ya existe otro personal con este documento', 409);
        }
      }
      updateData.numero_documento = numeroDocumento;
    }
    
    if (nombres !== undefined) {
      updateData.nombres = nombres;
    }
    
    if (apellidos !== undefined) {
      updateData.apellidos = apellidos;
    }

    if (fechaNacimientoInput !== undefined) {
      // Normalizamos a YYYY-MM-DD en zona horaria Lima
      const fechaNacStr = toLimaDateYYYYMMDD(fechaNacimientoInput);
      if (!fechaNacStr) {
        throw new AppError('Fecha de nacimiento inválida', 400);
      }
      updateData.fecha_nacimiento = fechaNacStr;
    }

    if (email !== undefined) {
      updateData.email = email;
    }
    
    if (cargoId !== undefined) {
      // Verificar que el cargo exista y esté activo
      const cargo = await cargosRepository.findById(cargoId);
      if (!cargo) {
        throw new AppError('Cargo no encontrado', 404);
      }
      if (!cargo.activo) {
        throw new AppError('Cargo inactivo', 400);
      }
      
      updateData.cargo_id = cargoId;
    }
    
    if (areaDestinoId !== undefined) {
      // Verificar que el área de destino exista y esté activa
      const area = await areasRepository.findById(areaDestinoId);
      if (!area) {
        throw new AppError('Área de destino no encontrada', 404);
      }
      if (!area.activa) {
        throw new AppError('Área de destino inactiva', 400);
      }
      
      updateData.area_destino_id = areaDestinoId;
    }
    
    if (tipoContratoId !== undefined) {
      // Verificar que el tipo de contrato exista y esté activo
      const tipoContrato = await tiposContratoRepository.findById(tipoContratoId);
      if (!tipoContrato) {
        throw new AppError('Tipo de contrato no encontrado', 404);
      }
      if (!tipoContrato.activo) {
        throw new AppError('Tipo de contrato inactivo', 400);
      }
      
      updateData.tipo_contrato_id = tipoContratoId;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingPersonal;
    }
    
    logger.info(`[updatePersonal] Actualizando personal ID ${id} con datos:`, updateData);
    
    // Actualizar personal
    const updatedPersonal = await repository.update(id, updateData);

    logger.info(`[updatePersonal] Personal ID ${id} actualizado por usuario ID: ${userId}`);

    // IMPORTANTE: Verificar si se actualizaron campos críticos para usuario
    const camposCriticosActualizados = 
      updateData.email !== undefined || 
      updateData.fecha_nacimiento !== undefined || 
      updateData.numero_documento !== undefined;

    if (camposCriticosActualizados) {
      logger.info(`[updatePersonal] Se actualizaron campos críticos (email/fecha_nacimiento/numero_documento), verificando creación de usuario...`);
      
      // Si ahora tiene datos completos, crear o reactivar usuario automáticamente
      const resultado = await ensureUsuarioParaPersonal(updatedPersonal, userId, 'actualización');
      
      if (resultado.created) {
        logger.info(`[updatePersonal] Usuario creado exitosamente para personal ID ${id}`);
      } else if (resultado.reactivated) {
        logger.info(`[updatePersonal] Usuario reactivado para personal ID ${id}`);
      } else if (resultado.reason === 'ya_existe_activo') {
        logger.info(`[updatePersonal] Personal ID ${id} ya tiene usuario activo`);
      } else if (resultado.reason === 'datos_incompletos') {
        logger.warn(`[updatePersonal] Personal ID ${id} aún no tiene datos completos para crear usuario`);
      } else if (resultado.error) {
        logger.error(`[updatePersonal] Error al intentar crear usuario para personal ID ${id}: ${resultado.error}`);
      }
    } else {
      logger.debug(`[updatePersonal] No se actualizaron campos críticos, omitiendo verificación de usuario`);
    }

    return updatedPersonal;
    
  } catch (error) {
    logger.error(`[updatePersonal] Error actualizando personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar personal (soft delete)
 * @param {number} id - ID del personal
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deletePersonal = async (id, userId) => {
  try {
    // Verificar si el personal existe
    const existingPersonal = await repository.findById(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingPersonal.activo) {
      throw new AppError('El personal ya está inactivo', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Personal ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener personal eliminado (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Personal eliminado y datos de paginación
 */
const getDeletedPersonal = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener personal eliminado con paginación
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      personal: Array.isArray(result.personal) ? result.personal : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo personal eliminado:', error);
    throw error;
  }
};

/**
 * Restaurar personal eliminado
 * @param {number} id - ID del personal
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Personal restaurado
 */
const restorePersonal = async (id, userId) => {
  try {
    // Verificar si el personal existe (incluyendo eliminados)
    const existingPersonal = await repository.findByIdIncludingDeleted(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar si ya está activo
    if (existingPersonal.activo) {
      throw new AppError('El personal ya está activo', 400);
    }
    
    // Restaurar personal (marcar como activo)
    const restoredPersonal = await repository.restore(id);
    
    logger.info(`Personal ID ${id} restaurado por usuario ID: ${userId}`);
    
    return restoredPersonal;
    
  } catch (error) {
    logger.error(`Error restaurando personal ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllPersonal,
  getPersonalById,
  getPersonalByDocumento,
  createPersonal,
  updatePersonal,
  deletePersonal,
  getDeletedPersonal,
  restorePersonal,
  sincronizarUsuariosPersonal
};
