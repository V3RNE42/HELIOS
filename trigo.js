/** Devuelve la diferencia absoluta entre dos números
 *  @param {Number} num1     @param {Number} num2 
 *  @returns {Number} Diferencia absoluta */
function getAbsoluteDiff(num1, num2)  { 
    return num1>num2? num1-num2 : num2-num1;};

/** Devuelve las nuevas coordinadas de un punto,
 *  basándose en la distancia entre origen y destino,
 *  el ángulo entre ellos y el ratio de movimiento
 *  @param {Object} start Origen del viaje (lat, lon)
 *  @param {Object} end Destino del viaje   (lat, lon)
 *  @param {Number} rate (ratio relativo) de avance (0 a 1)
*  @returns {Object} lat, lon de las nuevas coordenadas  */
function getNewCoords(startCoords, endCoords, fraction) {
    // Primero, calculamos la distancia angular entre origen y destino usando la fórmula del semiverseno
    if (fraction==0) return startCoords;
    if (fraction==1) return endCoords;
    const distance = getAngularDistance(startCoords, endCoords);
    // Después calculamos las coordenadas interpoladas, basándonos en el ratio de avance 'rate'
    const fractionDistance = fraction * distance;
    const bearing = getBearing(startCoords, endCoords);
    const newCoords = getDestinationCoords(startCoords, fractionDistance, bearing);
    return newCoords;
  }
  
  /**
   * Obtiene la distancia en kilómetros entre coordenadas
   * @param {*} startCoords 
   * @param {*} endCoords 
   * @returns {Number} distancia */
  function getAngularDistance(startCoords, endCoords) {
    const earthRadius = 6371; // Radio terrestre => 6,371 km
    const lat1 = toRadians(startCoords.lat);
    const lat2 = toRadians(endCoords.lat);
    const lng1 = toRadians(startCoords.lon);
    const lng2 = toRadians(endCoords.lon);
    const latDiff = lat2 - lat1;
    const lngDiff = lng2 - lng1;
    const a = Math.sin(latDiff / 2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDiff / 2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance;
  }

  // Convierte grados a radianes
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
  // Calcula la el ángulo de inclinación entre dos coordenadas
  function getBearing(startCoords, endCoords) {
    const lat1 = toRadians(startCoords.lat);
    const lat2 = toRadians(endCoords.lat);
    const lng1 = toRadians(startCoords.lon);
    const lng2 = toRadians(endCoords.lon);
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    const bearing = Math.atan2(y, x);
    return (bearing + 2 * Math.PI) % (2 * Math.PI);
  }
  
  // Calcula las coordenadas de destino
  function getDestinationCoords(startCoords, distance, bearing) {
    const earthRadius = 6371; // Radio terrestre => 6,371 km
    const lat1 = toRadians(startCoords.lat);
    const lng1 = toRadians(startCoords.lon);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / earthRadius) + Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / earthRadius) * Math.cos(lat1), Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2));
    return {
      lat: toDegrees(lat2),
      lon: toDegrees(lng2)
    };
  }
  
  // Convierte radianes a grados
  function toDegrees(radians) {
    return radians * 180 / Math.PI;
  }
  
export { getNewCoords, getAbsoluteDiff, getAngularDistance};