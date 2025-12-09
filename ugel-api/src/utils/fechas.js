const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const LIMA_TZ = 'America/Lima';

function nowLima() {
  const now = dayjs().tz(LIMA_TZ);
  return {
    fecha: now.format('YYYY-MM-DD'),
    hora: now.format('HH:mm:ss'),
    fechaHora: now.toDate(),
    dayjs: now
  };
}

function toLimaDayjs(dateInput) {
  // Si viene un string simple de fecha (YYYY-MM-DD), interpretarlo directamente en zona Lima
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dayjs.tz(dateInput, 'YYYY-MM-DD', LIMA_TZ);
  }

  // En otros casos, respetar el instante recibido y convertirlo a Lima
  return dayjs(dateInput).tz(LIMA_TZ);
}

function toLimaDateYYYYMMDD(dateInput) {
  if (!dateInput) return null;
  return toLimaDayjs(dateInput).format('YYYY-MM-DD');
}

function toLimaTime(dateInput) {
  return toLimaDayjs(dateInput).format('HH:mm:ss');
}

function parseDateRangeInclusive(startDateStr, endDateStr) {
  const start = dayjs.tz(startDateStr, LIMA_TZ).startOf('day');
  const end = dayjs.tz(endDateStr, LIMA_TZ).endOf('day');
  return { start, end };
}

function isDateBetweenInclusive(dateInput, start, end, unit = 'millisecond') {
  return dayjs(dateInput).isBetween(start, end, unit, '[]');
}

module.exports = {
  LIMA_TZ,
  nowLima,
  toLimaDayjs,
  toLimaDateYYYYMMDD,
  toLimaTime,
  parseDateRangeInclusive,
  isDateBetweenInclusive
};

