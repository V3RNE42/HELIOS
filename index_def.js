import { SunCalc } from "./suncalc.js"
import sunCalc from "./SunCalc_function.js";
//importo algunas funciones trigonometricas y matematicas que he creado aparte
import { getNewCoords, getAbsoluteDiff } from "./trigo.js";
import { Spinner } from "./spinner.js";
import countries from "./countries.js";
//con la funcion getTimes sacamos el MediodiaSolar
let { getTimes } = SunCalc;
//con la funcion getDayInfo sacamos el amanaecer y el anochecer (entre otros datos)
let { preventDefault } = window.Event.prototype;
let { getDayInfo } = sunCalc();

/** Ajuste de las horas en las fechas por defecto: 
suelen empezar a las 10:42 por algun motivo*/
let DATE_ADJUSTMENT = (34 * 60 + 42) * 60000;
/** 24 horas en milisegundos */
let ONE_DAY = 24 * 60 * 60 * 1000;
/** 1 hora en milisegundos */
let ONE_HOUR = 60 * 60 * 1000;
/**Puramente ornamental */
let Solete = new Spinner();
/** Info relativa a coordenadas y posiciones solares |
 * start - inicio espacio/tiempo del viaje |
 * end   - final espacio/tiempo  del viaje |
 * NaS   - Norte A Sur? (true/false)    */
const specialData = ["start", "end", "NaS"];
/** Info relativa a horas y minutos   */
const horas = ["horasalida", "minutosalida", "horallegada", "minutollegada"];
/** Info recogida en el formulario servido en la web */
const form = ["cambio", "sun", ...horas, "origen", "destino", "diasalida", "diallegada", ...specialData, "local", "paisOrigen", "paisDestino"];
const ID = [...form, "formulario", "submit", "reset", "resetea", "result", "render"];
/** Array de subsecciones del tramo Principal entre las coordenadas iniciales y finales del array datos */
let subSection = [{}];
/** Array de información principal con la que trabajar */
let datos = [{}];

window.addEventListener('DOMContentLoaded', () => {
    reloadId(ID);
    countries.forEach((el) => {
            paisOrigen.innerHTML += `<option value="${el}" ${el == 'Spain' ? 'selected' : ''}>${el}</option>`;
            paisDestino.innerHTML += `<option value="${el}" ${el == 'Spain' ? 'selected' : ''}>${el}</option>`;
        });
    onClick(submit, async () => {
        if (checkForm()) {
            formulario.style.display = "none";
            Solete.spin(document.querySelector('body'));
            datos.push({ ...form.forEach((el) => datos[el] = valor(el)) });
            await updateSubsections();
            if (datos.length > 0) {
                renderResults();
            } else {
                window.alert("No hay datos!");
            };
            Solete.stop();
        };
    });
    onClick(reset, () => {
        window.location.reload();
    });
});

/** Esta función comprueba que la opción LOCAL sólo puedda 
    ser marcada si el origen y el destino tienen diferencia horaria */
async function checkLocal() {
    if (datos['local']===true) {
        let startOffset, endOffset;
        startOffset = await getOffset(datos['start']);
        endOffset = await getOffset(datos['end']);
        datos['local'] = startOffset === endOffset ? false : true;
    };
};

/** Actualiza el numero de subSecciones del trayecto principal   */
async function updateSubsections() {
    //limpio el array 'datos' de algunos elementos que ya no necesitamos
    horas.forEach((el) => delete datos[el.toString()]);
    let salida = new Date(datos.diasalida.getTime());
    let llegada = new Date(datos.diallegada.getTime());
    let coordenadas = {};
    let latitudOrigen = 0.0, longitudOrigen = 0.0, latitudDestino = 0.0, longitudDestino = 0.0;
    try {
        coordenadas = await updateCoords();
        datos.NaS = coordenadas.latDest < coordenadas.latOrig ? true : false;
        if (coordenadas !== undefined && coordenadas !== null) {
            latitudOrigen = coordenadas.latOrig;
            longitudOrigen = coordenadas.lonOrig;
            latitudDestino = coordenadas.latDest;
            longitudDestino = coordenadas.lonDest;
        } else {
            window.alert("Error al actualizar las coordenadas");
            return;
        };
    } catch (error) {
        console.log(error);
    };
    //adquirimos amaneceres y anocheceres en origen y destino
    let tiempo1 = getDayInfo(salida, latitudOrigen, longitudOrigen);
    let tiempo2 = getDayInfo(llegada, latitudDestino, longitudDestino);
    //adquirimos el mediodia solar en origen 
    let times = getTimes(salida, latitudDestino, longitudDestino);
    datos.start = {
      lat: coordenadas.latOrig,
      lon: coordenadas.lonOrig,
      sunset: tiempo1.sunset.end,
      sunrise: tiempo1.sunrise.start,
      solarnoon: times.solarNoon,
    };
    //...y en destino
    times = getTimes(llegada, latitudOrigen, longitudDestino);
    datos.end = {
      lat: coordenadas.latDest,
      lon: coordenadas.lonDest,
      sunset: tiempo2.sunset.end,
      sunrise: tiempo2.sunrise.start,
      solarnoon: times.solarNoon,
    };
    try {
        await checkLocal();
        await updateSingleSections();
        await sectionFormatter();
        sectionAdapter();
        datos["secciones"] = subSection;
    } catch (error) {
        window.alert(error.message);
        console.log(error);
    };
};

/** Devuelve el huso horario de las coordenadas dadas */
async function getOffset(coords) {
    let endpoint = 'https://api.ipgeolocation.io/timezone',
        APIkey = '7dad049d4d154390835146e2daa22d6f',
        { lat, lon } = coords,
        huso = 0;
    try {
        let response = await fetch(`${endpoint}?apiKey=${APIkey}&lat=${lat}&long=${lon}`);
        let data = await response.json();
        if (data!=undefined || data!=null) {
            huso = data.timezone_offset.valueOf();
            return huso;
        } else throw new Error('No se pudo hacer fetch');
    } catch (error) {
        console.log(error);
        try {
            const backupEndpoint = 'https://api.timezonedb.com/v2.1/get-time-zone';
            const backupAPIkey = 'PVC3S7OZ8ZA9';
            const backupResponse = await fetch(`${backupEndpoint}?key=${backupAPIkey}&format=json&by=position&lat=${lat}&lng=${lon}`);
            let backupData = await backupResponse.json();
            if (backupData.status === 'OK') {
                huso = backupData.gmtOffset;
            } else throw new Error('No se pudo obtener datos de TimeZoneDB API');
            return huso;
        } catch (backupError) {
            console.log(backupError);
        }
    }
}

/** Renderiza los datos en pantalla*/
function renderResults() {
    let { secciones, cambio, sun, local, night } = datos;
    let leftSeat;
    formulario.style.display = "none";
    let someInfo = document.createElement('div');
    let destino = datos["destino"], origen = datos["origen"], 
        paisOrigen = datos["paisOrigen"], paisDestino = datos["paisDestino"];
    [destino, origen, paisOrigen, paisDestino].forEach((e) => {e = e.replaceAll("%20"," ")});

    someInfo.innerHTML =
        `<b>Salida:</b>  ${datos["diasalida"]} <br>
        <b>Llegada:</b>  ${datos["diallegada"]} <br>
        <b>Origen:</b>   ${origen} , ${paisOrigen}<br>
        <b>Destino:</b>  ${destino}, ${paisDestino} <br>`;
    document.querySelector('header').appendChild(someInfo);

    /** Analiza la propiedad AnteMeridiana y devuelve
     *  izquierda (true), o derecha (false)
     *  @param {Boolean} ams True-Antes | False-Despues
     *  @param {Boolean} NaS True-NorteASur | False-SurANorte
     *  @returns {Boolean} True-Izquierda | False-Derecha*/
    let getLeftSeat = (ams, NaS) => {
        let leftSeat = true;
        if (!ams) { leftSeat = !leftSeat; };
        if (!datos["sun"]) { leftSeat = !leftSeat; };
        if (!NaS) { leftSeat = !leftSeat; };
        return leftSeat;
    };

    secciones.forEach((el, i) => {
        let hours2, minutes2, noonHour, noonMin, hours1, minutes1, day, month, year;
        /* Ajuste a los husos horarios locales */
        if (local) {
            let originalOffset = secciones[0].sunriseOffset;
            el.sunset = (el.sunset != null && el.sunsetOffset != originalOffset) ? new Date(el.sunset.getTime() + (el.sunsetOffset.valueOf() - originalOffset) * ONE_HOUR) : el.sunset;
            el.sunrise = (el.sunrise != null && el.sunrisetOffset != originalOffset) ? new Date(el.sunrise.getTime() + (el.sunriseOffset.valueOf() - originalOffset) * ONE_HOUR) : el.sunrise;
            el.noon = (el.noon != null && el.noonOffset != originalOffset) ? new Date(el.noon.getTime() + (el.noonOffset.valueOf() - originalOffset) * ONE_HOUR) : el.noon;
        };

        hours2 = (null != el.sunset) ? el.sunset.getHours() : el.noon?.getHours(),
        minutes2 = (null != el.sunset) ? el.sunset.getMinutes() : el.noon?.getMinutes(),
        noonHour = el.noon?.getHours(),
        noonMin = el.noon?.getMinutes(),
        hours1 = (null != el.sunrise) ? el.sunrise.getHours() : el.noon?.getHours(),
        minutes1 = (null != el.sunrise) ? el.sunrise.getMinutes() : el.noon?.getMinutes(),
        day = el.sunrise?.getDate().toString(),
        month = el.sunrise?.getMonth(),
        year = el.sunrise?.getFullYear();

        let adapt = (num) => num >= 9 ? num.toString() : "0" + num.toString();

        let texto = ``;
        if (!night) {
            texto = `<b>Dia ${day + "/" + (month + 1) + "/" + year}:</b>`;
        };
        if (secciones.length > 1) {
            texto += `\n\t Tramo (${i + 1}/${secciones.length})`
        };
        texto += `<br>`;

        if (el.night) {
            texto += `🌙 El viaje va a producirse enteramente de noche 🌙`;
        } else if (el["AM"] == null && el["noon"] != null) {
            if (cambio) { /* Es posible cambiar de asiento */
                let sameTime = !(hours1 == noonHour && minutes1 == noonMin);
                if (sameTime) {
                    texto += `Siéntate en el lado ${getLeftSeat(true, el.NaS) ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo de ${adapt(hours1) + ":" + adapt(minutes1)} ` +
                        `a ${adapt(noonHour) + ":" + adapt(noonMin)}, y luego`;
                };
                texto += `\t  ${sameTime ? 's' : 'S'}iéntate al lado ${getLeftSeat(false, el.NaS) ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo `;
                texto += sameTime
                    ? `de ${adapt(noonHour) + ":" + adapt(noonMin)} a ${adapt(hours2) + ":" + adapt(minutes2)} `
                    : `durante todo el trayecto  `;
            } else { /* No es posible cambiar de asiento */
                if (el["sunrise"] != null) {
                    let morning = el["noon"].getTime() - el["sunrise"].getTime(),
                        afternoon = el["sunset"].getTime() - el["noon"].getTime();
                    leftSeat = getLeftSeat(morning >= afternoon, el.NaS);
                    texto += `Siéntate en el lado ${leftSeat ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo de ${adapt(hours1) + ":" + adapt(minutes1)} ` +
                        `a ${adapt(hours2) + ":" + adapt(minutes2)}  `;
                } else if (el["sunrise"] == null) {
                    texto += `Siéntate en el lado ${getLeftSeat(false, el.NaS) ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo de ${adapt(hours1) + ":" + adapt(minutes1)} ` +
                        `a ${adapt(hours2) + ":" + adapt(minutes2)}  `;
                } else if (el["sunset"] == null) {
                    texto += `Siéntate en el lado ${getLeftSeat(true, el.NaS) ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo de ${adapt(hours1) + ":" + adapt(minutes1)} ` +
                        `a ${adapt(hours2) + ":" + adapt(minutes2)} `;
                };
            };
        } else { /* No es necesario cambiarse: todo el trayecto courre ANTES o DESPUÉS del Mediodia Solar */
            leftSeat = getLeftSeat(el["AM"], el.NaS);
            texto += `Siéntate en el lado ${leftSeat ? "<b>izquierdo</b>" : "<b>derecho</b>"} del vehículo durante todo el trayecto `;
        };
        if (!el.night) texto += `${sun ? '<span>☀️</span>' : '<span>⛅</span>'}`;

        let div = document.createElement("div");
        div.setAttribute('id', `${i % 2 == 0 ? 'light' : 'dark'}`);
        div.setAttribute('class', 'card');
        let p = document.createElement("p");
        p.innerHTML = texto;
        div.appendChild(p);
        render.appendChild(div);
    });
    let boton = document.createElement("button");
    boton.innerHTML = "Refrescar";
    boton.setAttribute("class", "preferencia");
    boton.setAttribute("id", "resetea");
    render.appendChild(boton);
    render.style.display = 'inherit';
    reloadId(ID);
    onClick(resetea, () => { window.location.reload(); });
};


/** Adapta las secciones para facilitar su posterior interpretación 
 *  y renderización en pantalla  */
function sectionAdapter() {
    let { diasalida, diallegada } = datos;
    let fechas = [diasalida, diallegada];
    /**Antes del Mediodia Solar? true: false: null*/
    let AM;
    let cosa = [{}, {}];
    let indices = [0, (subSection.length - 1)];
    for (let j = 0; j < fechas.length; j++) {
        let sunset = subSection[indices[j]]["sunset"],
            sunrise = subSection[indices[j]]["sunrise"],
            noon = subSection[indices[j]]["noon"];
        let night = datos.night;
        if (!night) {
            if (subSection.length > 1) {
                if (j == 0) {
                    sunrise = sunrise.getTime() > diasalida.getTime() ? sunrise : diasalida;
                    noon = noon?.getTime() > diasalida.getTime() ? noon : diasalida;
                } else {
                    sunset = sunset.getTime() < diallegada.getTime() ? sunset : diallegada;
                    noon = noon?.getTime() < diallegada.getTime() ? noon : diallegada;
                };
            } else {
                sunrise = sunrise.getTime() > diasalida.getTime() ? sunrise : diasalida;
                sunset = sunset.getTime() < diallegada.getTime() ? sunset : diallegada;
            };
            if ((noon > sunrise && noon > sunset) || (noon == diallegada)) {
                AM = true;
            } else if ((noon < sunrise && noon < sunset) || (noon == diasalida)) {
                AM = false;
            } else {
                AM = null;
            };
        };
        cosa[indices[j]] = {
            sunrise: sunrise,
            sunriseCoords: sunrise != null ? subSection[indices[j]]["sunriseCoords"] : null,
            sunriseOffset: sunrise != null ? subSection[indices[j]]["sunriseOffset"] : null,
            sunset: sunset,
            sunsetCoords: sunset != null ? subSection[indices[j]]["sunsetCoords"] : null,
            sunsetOffset: sunset != null ? subSection[indices[j]]["sunsetOffset"] : null,
            NaS: subSection[indices[j]].NaS,
            noon: noon,
            noonCoords: subSection[indices[j]]["noonCoords"],
            noonOffset: subSection[indices[j]]["noonOffset"],
            /* Datos adicionales: */
            night: night,
            AM: AM
        };
        subSection[indices[j]] = cosa[indices[j]];
    };
    console.log("Secciones adaptadas");
    console.log(subSection);
};

/** Formatea las secciones para que sean entidades separadas, cada una con su
 *  amanecer, ocaso y mediodía solar    */
async function sectionFormatter() {
    let { start, end, local } = datos;
    try {
        let formatted = [{}];
        //Eliminamos elementos sobrantes
        while (!subSection[0].date) subSection.shift();
        //ordenamos
        subSection.sort((e, f) => { return e["date"].getTime() > f["date"].getTime() ? 1 : -1 });
        //eliminamos o actualizamos la primera y la última posición, 
        //según sea de día o no en la segunda y la penúltima posición
        //RECUERDA: debe empezar por 'sunrise'. Debe acabar por 'sunset'
        let eventos = ["sunrise", "sunset"];
        let propiedades = [start, end];
        for (let j = 0; j < eventos.length; j++) {
            let indices = [1, (subSection.length - 2)];
            if (eventos[j] == subSection[indices[j]]["event"]) {
                (j > 0) ? subSection.pop() : subSection.shift();
            } else {
                subSection[j > 0 ? indices[j] + 1 : 0] = {
                    event: eventos[j],
                    date: propiedades[j][eventos[j]],
                    coords: getNewCoords(datos["start"], datos["end"], (j > 0 ? 1 : 0)),
                    offset: local ? await getOffset(j > 0 ? datos["end"] : datos["start"]) : null,
                    rate: j > 0 ? 1 : 0,
                };
            };
        };
        //comprobamos que el número de elementos sea par
        if (subSection.length % 2 != 0) {
            throw new Error("Error en el formateo de las secciones");
        };
        //formateamos - PASO FINAL
        for (let i = 0; i < subSection.length; i += 2) {
            let noon, sunrise, sunset, sunriseCoords, sunsetCoords, noonCoords, sunriseOffset, sunsetOffset, noonOffset, NaS;
            sunrise = subSection[i]["date"];
            sunset = subSection[i + 1]["date"];
            noon = new Date(Math.floor((sunset.getTime() - sunrise.getTime()) / 2) + sunrise.getTime());
            sunriseCoords = subSection[i]["coords"];
            sunsetCoords = subSection[i + 1]["coords"];
            noonCoords = {
                lat: (((sunsetCoords.lat - sunriseCoords.lat) / 2) + sunriseCoords.lat),
                lon: (((sunsetCoords.lon - sunriseCoords.lon) / 2) + sunriseCoords.lon)
            };
            sunriseOffset = subSection[i]["offset"];
            sunsetOffset = subSection[i + 1]["offset"];
            noonOffset = local ? await getOffset(noonCoords) : null;
            NaS = subSection[i]["coords"].lat > subSection[i + 1]["coords"].lat;
            formatted[i / 2] = {
                sunrise: sunrise,
                sunriseCoords: sunriseCoords,
                sunriseOffset: sunriseOffset,
                sunset: sunset,
                sunsetCoords: sunsetCoords,
                sunsetOffset: sunsetOffset,
                noon: noon,
                noonCoords: noonCoords,
                noonOffset: noonOffset,
                NaS: NaS
            };
        };
        subSection = formatted;
        console.log("Subsecciones formateadas: \n");
        console.log(subSection);
    } catch (error) {
        console.log(error);
    }
};

/** Establece amaneceres y anocheceres con un rango de exactitud determinado,
 * a lo largo del trayecto (se mueve tanto el vehículo como la tierra alrededor del sol),
 * y marca sus coordenadas, su hora, el tipo de evento (amanecer o anochecer) y la 
 * tasa de avance respecto al trayecto total.   */
async function updateSingleSections() {
    /** Máxima diferencia aceptable (milisegundos) */
    let MAX_DIFF = 2500;
    /**Tasa de avance a lo largo del trayecto*/
    let RATE = 0;
    let { start, end, diasalida, diallegada, local } = datos;
    let datePointer = diasalida;
    let diff = ONE_HOUR;
    let time = new Date(new Date().getTime() - ONE_DAY), tiempo = new Date();
    let total_time = diallegada.getTime() - diasalida.getTime();
    let limit = (Math.floor(total_time * 2 / ONE_DAY) >= 1) ? Math.floor(total_time * 2 / ONE_DAY) : 2;
    /** Máxima cantidad de iteraciones en el bucle */
    let MAX_LOOPS = limit**2;
    let increase = MAX_DIFF / total_time;
    let loops = 0, cont = 0;
    let { lat, lon } = start, coordPoint = { lat, lon };
    let seekSunset = isThereDaylightNow(coordPoint, datePointer);
    subSection = [{}];
    subSection.push({ date: diasalida, rate: 0, timeZone: local ? await getOffset(coordPoint) : null });
    let iteraciones = 0, dayInfo;
    /* Funciones auxiliares */
    let getNewDatePointer = () => new Date(diasalida.getTime() + (Math.floor(RATE * total_time))),
        newCoords = () => getNewCoords(start, end, RATE),
        getRateOfDate = (date) => (date - diasalida.getTime()) / total_time,
        updateTime = () => {
            dayInfo = getDayInfo(datePointer, coordPoint.lat, coordPoint.lon);
            tiempo = seekSunset ? dayInfo.sunset.start : dayInfo.sunrise.end;
            return new Date(tiempo.getTime());
        };
    let nextDay = Math.floor(diasalida.getTime() / ONE_DAY) == Math.floor(diallegada.getTime() / ONE_DAY) - 1;
    datos.night = (nextDay && 
        getDayInfo(diasalida,  start.lat, start.lon).sunset.start.getTime() <= diasalida.getTime() && 
        getDayInfo(diallegada, start.lat, start.lon).sunrise.end.getTime()  >= diallegada.getTime());
    while (!datos.night && cont <= limit + 1 && datePointer.getTime() < diallegada.getTime() && loops < MAX_LOOPS) {
        loops++;
        if (!seekSunset && cont >= 0 ) {
            datePointer = new Date(datePointer.getTime() + ONE_DAY);
        };
        while (!(time.getTime()>subSection[subSection.length-1].date.getTime()) || !(diff<=MAX_DIFF)) {
            iteraciones++;
            time = updateTime();

            RATE = getRateOfDate(time.getTime());
            coordPoint = newCoords();
            if ((seekSunset && isThereDaylightNow(coordPoint, datePointer)) || 
                (!seekSunset && !isThereDaylightNow(coordPoint, datePointer))) {
                RATE += increase
            } else {
                RATE -= increase
            };
            coordPoint = newCoords();
            datePointer = getNewDatePointer();
            datePointer = updateTime();
            
            diff = getAbsoluteDiff(time.getTime(), datePointer.getTime());
        };
        if (RATE < 1 && RATE > subSection[subSection.length - 1].rate) {
            subSection.push({
                event: seekSunset ? "sunset" : "sunrise",
                date: datePointer,
                coords: coordPoint,
                offset: local ? await getOffset(coordPoint) : null,
                rate: RATE
            });
            diff = ONE_HOUR;
            cont++;
            seekSunset = !seekSunset;
        };
    };
    subSection.push({ date: diallegada, rate: 1 , timeZone: local ? await getOffset(coordPoint) : null });
    console.log("se han necesitado " + iteraciones + " iteraciones para una "
        + "precisión de +/- " + MAX_DIFF + " milisegundos en los cálculos");
    console.log(subSection);
    //comprobamos que No haya salido una cosa muy loca:
    if (checkForDuplicates(subSection, 'date')) {
        throw new Error('Ha habido algún error con las fechas!');
    };
};

/** Función que comprueba si hay duplicados en un array,
 *  para al menos una de sus propiedades
 *  @param {Array} array donde buscar
 *  @param {String} property propiedad que comparar
 *  @returns True si hay duplicados // False si no los hay   */
function checkForDuplicates(array, property) {
    if (array.length > 1) {
        if (array.some(el => el[property])) {
            for (let i = 0; i < array.length; i++) {
                for (let j = 0; j < array.length; j++) {
                    if (array[i][property] == array[j][property]
                        && i != j) {
                        return true;
                    };
                };
            };
            return false;
        } else {
            console.log("Propiedad no encontrada en ningún elemento del array");
        };
    };
};

/** Nos dice si es de día en un momento dado, en un lugar dado
 *  @param {Object} here coordenadas actuales
 *  @param {Date} now momento actual 
 *  @returns {Boolean} True si es de dia, false si es de noche */
function isThereDaylightNow(here, now) {
    let amanecer = getDayInfo(now, here.lat, here.lon).sunrise.end;
    let ocaso = getDayInfo(now, here.lat, here.lon).sunset.start;
    return (now.getTime() >= amanecer.getTime() && now.getTime() < ocaso.getTime());
};

/** Consigue las coordenadas de las ciudades y las devuelve en forma de objeto
 * @returns {Object} Objeto con las coordenadas recién obtenidas  */
async function updateCoords() {
    let coordenadas1 = await getCoords(datos.origen, datos.paisOrigen);
    let coordenadas2 = await getCoords(datos.destino, datos.paisDestino);
    let coord = {
        latOrig: coordenadas1.lat,
        lonOrig: coordenadas1.lon,
        latDest: coordenadas2.lat,
        lonDest: coordenadas2.lon
    };
    if (coordenadas1 && coordenadas2) {
        return coord;
    } else {
        return null;
    };
};
/** Conseguimos las coordenadas de las ciudades que le 
 * pasemos como parámetros. Para ello, usaremos la API de OpenStreetMap, que nos devuelve
 * las coordenadas de una ciudad a partir de su nombre. 
 * En caso de que la API de OpenStreetMap no funcione, usaremos la API de OpenCageData.
 * @param {String} city @param {String} country /país 
 * @return {JSON} JSON con los datos Lon(gitud) y Lat(itud)*/
async function getCoords(city, country) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search.php?city=${city}&country=${country}&format=jsonv2`);
        let data = await response.json();
        if (data.length > 0) { 
            data = data[0]; 
            return { lon: parseFloat(data.lon), lat: parseFloat(data.lat) };
        } else throw new Error('No se pudo obtener datos de nominatim');
    } catch (error) {
        console.log(error);
        try {
            const apiKey = 'b40897201f924666a9e86f365d5efb13';
            const backupResponse = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${city},${country}&key=${apiKey}`);
            let backupData = await backupResponse.json();
            if (backupData.results.length > 0) { 
                console.log(backupData);
                backupData = backupData.results[0]; 
                return { lon: parseFloat(backupData.geometry.lng), lat: parseFloat(backupData.geometry.lat) };
            } else throw new Error('No se pudo obtener datos de OpenCage Data API');
        } catch (backupError) {
            console.log(backupError);
        }
    }
};
/** Retorna el valor "cocinado" de un elemento del DOM, listo para ser usado
 * @param {String} id 
 * @returns {Boolean, Number, String, null} */
function valor(id) {
    let valor = null;
    switch (id) {
        case "minutosalida":
            valor = parseInt(getVal(id), 10) + parseInt(getVal("horasalida"), 10) * 60;
            break;
        case "minutollegada":
            valor = parseInt(getVal(id), 10) + parseInt(getVal("horallegada"), 10) * 60;
            break;
        case "diasalida":
            valor = parseInt(getVal(id), 10) + parseInt(getVal("horasalida"), 10) * 60;
            valor = new Date(new Date(getVal(id)).getTime() + valor * 60000 + (parseInt(getVal("minutosalida"), 10)) * 60000 - DATE_ADJUSTMENT);
            break;
        case "diallegada":
            valor = parseInt(getVal(id), 10) + parseInt(getVal("horallegada"), 10) * 60;
            valor = new Date(new Date(getVal(id)).getTime() + valor * 60000 + (parseInt(getVal("minutollegada"), 10)) * 60000 - DATE_ADJUSTMENT);
            break;
        case "origen":
        case "destino":
        case "paisOrigen":
        case "paisDestino":
            valor = getVal(id).trim().replaceAll(" ", "%20").replaceAll("á", "a").replaceAll("é", "e").replaceAll("í", "i").replaceAll("ó", "o").replaceAll("ú", "u").replaceAll("ñ", "n").replaceAll("ü", "u").replaceAll("ç", "c").replaceAll("à", "a").replaceAll("è", "e").replaceAll("ì", "i").replaceAll("ò", "o").replaceAll("ù", "u").toLowerCase();
            break;
        default:
            valor = getVal(id);
            break;
    }
    if (valor == "true") {
        valor = true;
    } else if (valor == "false") {
        valor = false;
    }
    return valor;
}
/** Añade un escuchador de eventos click a un elemento DOM,
 * lo cual ejecuta una función de forma SEGURA en caso de click
 * @param {Object} elem Nombre del elemento DOM
 * @param {Function} fun Nombre de la función a ejecutar */
function onClick(elem, fun) {
    elem.addEventListener("click", (e) => {
        e.preventDefault();
        fun();
    })
}
/**Añade a cada elemento del array ID su elemento del DOM correspondiente*/
function reloadId(IDES) {
    //imprescindible
    IDES.forEach((el) => (window[el] = getID(el) ? getID(el) : null));
    //extras
    const colorToggle = getID('color-toggle');
    colorToggle.classList.add('rotate');
    [...horas, "diasalida", "diallegada"].forEach((inputId) => {
        getID(inputId).addEventListener("change", updateArrivalTime());});
    document.querySelector('header').addEventListener('mouseenter', () => {
        getID('info-text').style.display = 'inline';});
    document.querySelector('header').addEventListener('mouseleave', () => {
        getID('info-text').style.display = 'none';});
}
/** Función que devuelve un elemento del DOM
 * @param {String} id ID del elemento DOM a seleccionar
 * @returns {Object} Elemento DOM */
function getID(id) {
    return document.getElementById(id);
}
/** Función que devuelve el valor de un elemento del DOM
 * @param {String} id ID del elemento DOM a seleccionar
 * @returns {*} Valor del elemento */
let getVal = (id) => typeof id == "string" ? getID(id)?.value : id?.value;
    
/** Comprueba que todos los campos del formulario están correctamente
 *  rellenos, y si no lo están, muestra un mensaje de error 
 *  @returns {Boolean} True si NO hay ningún error en el formulario*/
function checkForm() {
    let NoErr = true, msg = "";
    form.forEach((el) => {
        if ((getVal(el) == "" || getVal(el) == null) && !specialData.includes(el)) {
            msg += `El campo ${el} está vacío \n`;
            NoErr = false;
        }
    });
    if (valor("origen") == valor("destino")) {
        msg += "El origen y el destino no pueden ser iguales \n";
        NoErr = false;
    }
    if (getVal("minutosalida") > 59 || getVal("minutosalida") < 0
        || getVal("minutollegada") > 59 || getVal("minutollegada") < 0) {
        msg += "El campo de minutos no es correcto \n";
        NoErr = false;
    }
    if (getVal("horallegada") > 23 || getVal("horallegada") < 0
        || getVal("horasalida") > 23 || getVal("horasalida") < 0) {
        msg += "El campo de horas no es correcto \n";
        NoErr = false;
    }
    if ((getVal("diasalida") > getVal("diallegada"))) {
        msg += "La fecha de llegada no puede ser anterior a la de salida \n";
        NoErr = false;
    }
    if (valor("diasalida") < Date.now() / 1000 / 60 / 60 / 24) {
        msg += "La fecha de salida no puede ser anterior al día de hoy \n";
        NoErr = false;
    }
    if (valor("diasalida") == valor("diallegada") &&
        valor("minutosalida") == valor("minutollegada") &&
        valor("horasalida") == valor("horallegada")) {
        msg += "Además: No existe el teletransporte guapi 😉 \n";
        NoErr = false;
    }
    if (!NoErr) window.alert(msg);
    return NoErr;
}
/** Comprueba que la hora de salida no sea posterior a la de llegada, 
 *  y si es así, iguala ambas    */
function updateArrivalTime() {
    const horasalida = parseInt(getID("horasalida").value);
    const minutosalida = parseInt(getID("minutosalida").value);
    const horallegada = parseInt(getID("horallegada").value);
    const minutollegada = parseInt(getID("minutollegada").value);
    const diasalida = new Date(getID("diasalida").value);
    const diallegada = new Date(getID("diallegada").value);
    diasalida.setHours(horasalida, minutosalida);
    diallegada.setHours(horallegada, minutollegada);
    if (diasalida > diallegada) {
        getID("horallegada").value = horasalida;
        getID("minutollegada").value = minutosalida;
        getID("diallegada").value = getID("diasalida").value;
    }
}