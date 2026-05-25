// --- STATE & DATA ---
const viewState = { stars: true, planets: true, constellations: true, grid: false };
let visibleObjects = [];
let mouseX = 0, mouseY = 0;
let timeOffsetHours = 0;

// --- PANNING & ZOOMING STATE ---
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// NEW: Zoom variables and limits
let zoomLevel = 1;
const MIN_ZOOM = 0.8; // Allows zooming out just a tiny bit to see the edges
const MAX_ZOOM = 6.0; // Max zoom limit (6x closer)

// Function to reset the view to the center and default zoom
function resetPan() {
    offsetX = 0;
    offsetY = 0;
    zoomLevel = 1;
}

// --- MOUSE & TOUCH CONTROLS ---
const canvas = document.getElementById('skyCanvas');

// Mouse Dragging
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (isDragging) {
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
    }
});

window.addEventListener('mouseup', () => { isDragging = false; });

// NEW: Mouse Wheel Zooming
canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); // Prevents the whole webpage from scrolling
    const zoomSpeed = 0.15;
    
    if (e.deltaY < 0) {
        // Scrolling up -> Zoom In
        zoomLevel = Math.min(MAX_ZOOM, zoomLevel + zoomSpeed);
    } else {
        // Scrolling down -> Zoom Out
        zoomLevel = Math.max(MIN_ZOOM, zoomLevel - zoomSpeed);
    }
}, { passive: false });

// Touch Events (For Mobile Phones - Dragging AND Pinching)
let initialPinchDistance = null;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        // Two fingers: Start Pinch Zoom
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    } else if (e.touches.length === 1) {
        // One finger: Start Drag
        isDragging = true;
        dragStartX = e.touches[0].clientX - offsetX;
        dragStartY = e.touches[0].clientY - offsetY;
    }
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault(); // Prevents screen zoom
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const pinchScale = currentDistance / initialPinchDistance;
        
        if (pinchScale > 1.05) {
            zoomLevel = Math.min(MAX_ZOOM, zoomLevel + 0.1);
            initialPinchDistance = currentDistance;
        } else if (pinchScale < 0.95) {
            zoomLevel = Math.max(MIN_ZOOM, zoomLevel - 0.1);
            initialPinchDistance = currentDistance;
        }
    } else if (e.touches.length === 1) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        if (isDragging) {
            offsetX = e.touches[0].clientX - dragStartX;
            offsetY = e.touches[0].clientY - dragStartY;
        }
    }
}, {passive: false});

canvas.addEventListener('touchend', () => { 
    isDragging = false; 
    initialPinchDistance = null;
});


// --- TIME MACHINE TOGGLE & MATH ---
const timeSlider = document.getElementById('timeSlider');
const offsetDisplay = document.getElementById('timeOffsetDisplay');

function toggleTimeMachine() {
    const panel = document.getElementById('timeMachinePanel');
    const btn = document.getElementById('btn-time-toggle');
    panel.classList.toggle('visible');
    btn.classList.toggle('active');
}

function updateTimeDisplay() {
    timeOffsetHours = parseFloat(timeSlider.value);
    offsetDisplay.innerText = timeOffsetHours === 0 ? "Live" : 
        (timeOffsetHours > 0 ? `+${timeOffsetHours.toFixed(1)} hrs` : `${timeOffsetHours.toFixed(1)} hrs`);
}
if(timeSlider) timeSlider.addEventListener('input', updateTimeDisplay);

function getSimulatedTime() {
    const dateInput = document.getElementById('simDate');
    let baseDate = new Date(); 
    if (dateInput && dateInput.value) {
        const [year, month, day] = dateInput.value.split('-');
        baseDate.setFullYear(year, month - 1, day);
    }
    baseDate.setMinutes(baseDate.getMinutes() + (timeOffsetHours * 60));
    return baseDate;
}

// --- WIKIPEDIA API CACHE ---
const wikiCache = {};
let currentlyHoveredName = null;

async function fetchStarInfo(name) {
    if (wikiCache[name]) return wikiCache[name];
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();
        const extract = data.extract.split('. ')[0] + '.'; 
        wikiCache[name] = extract;
        return extract;
    } catch (e) {
        wikiCache[name] = "Information not currently available.";
        return wikiCache[name];
    }
}

// --- ASTRONOMY DATA: MASTER STAR DICTIONARY ---
const namedStars = [
    // Orion
    { name: 'Betelgeuse', ra: 5.91, dec: 7.40, mag: 0.45, isNamed: true },
    { name: 'Bellatrix', ra: 5.41, dec: 6.34, mag: 1.64, isNamed: true },
    { name: 'Mintaka', ra: 5.53, dec: -0.30, mag: 2.23, isNamed: true },
    { name: 'Alnilam', ra: 5.60, dec: -1.20, mag: 1.69, isNamed: true },
    { name: 'Alnitak', ra: 5.68, dec: -1.94, mag: 1.77, isNamed: true },
    { name: 'Rigel', ra: 5.24, dec: -8.20, mag: 0.18, isNamed: true },
    { name: 'Saiph', ra: 5.79, dec: -9.67, mag: 2.07, isNamed: true },
    // Ursa Major
    { name: 'Alkaid', ra: 13.79, dec: 49.31, mag: 1.86, isNamed: true },
    { name: 'Mizar', ra: 13.40, dec: 54.92, mag: 2.23, isNamed: true },
    { name: 'Alioth', ra: 12.90, dec: 55.96, mag: 1.77, isNamed: true },
    { name: 'Megrez', ra: 12.26, dec: 57.03, mag: 3.31, isNamed: true },
    { name: 'Phecda', ra: 11.90, dec: 53.70, mag: 2.44, isNamed: true },
    { name: 'Merak', ra: 11.06, dec: 56.38, mag: 2.37, isNamed: true },
    { name: 'Dubhe', ra: 11.06, dec: 61.75, mag: 1.79, isNamed: true },
    // Cassiopeia
    { name: 'Caph', ra: 0.15, dec: 59.15, mag: 2.28, isNamed: true },
    { name: 'Schedar', ra: 0.67, dec: 56.53, mag: 2.24, isNamed: true },
    { name: 'Gamma Cassiopeiae', ra: 0.94, dec: 60.72, mag: 2.15, isNamed: true },
    { name: 'Ruchbah', ra: 1.43, dec: 60.23, mag: 2.68, isNamed: true },
    { name: 'Segin', ra: 1.91, dec: 63.67, mag: 3.37, isNamed: true },
    // Cygnus
    { name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.25, isNamed: true },
    { name: 'Sadr', ra: 20.37, dec: 40.26, mag: 2.23, isNamed: true },
    { name: 'Albireo', ra: 19.51, dec: 27.96, mag: 3.05, isNamed: true },
    { name: 'Delta Cygni', ra: 19.75, dec: 45.13, mag: 2.87, isNamed: true },
    { name: 'Gienah', ra: 20.77, dec: 33.97, mag: 2.48, isNamed: true },
    // Crux
    { name: 'Acrux', ra: 12.44, dec: -63.10, mag: 0.77, isNamed: true },
    { name: 'Gacrux', ra: 12.52, dec: -57.11, mag: 1.64, isNamed: true },
    { name: 'Mimosa', ra: 12.79, dec: -59.69, mag: 1.25, isNamed: true },
    { name: 'Delta Crucis', ra: 12.25, dec: -58.75, mag: 2.79, isNamed: true },
    // Lyra
    { name: 'Vega', ra: 18.61, dec: 38.78, mag: 0.03, isNamed: true },
    { name: 'Zeta Lyrae', ra: 18.74, dec: 37.60, mag: 4.34, isNamed: true },
    { name: 'Delta Lyrae', ra: 18.90, dec: 36.98, mag: 4.22, isNamed: true },
    { name: 'Sulafat', ra: 18.96, dec: 32.68, mag: 3.26, isNamed: true },
    { name: 'Sheliak', ra: 18.83, dec: 33.36, mag: 3.52, isNamed: true },
    // Canis Major
    { name: 'Sirius', ra: 6.75, dec: -16.71, mag: -1.46, isNamed: true },
    { name: 'Mirzam', ra: 6.37, dec: -17.95, mag: 1.98, isNamed: true },
    { name: 'Wezen', ra: 7.14, dec: -26.39, mag: 1.83, isNamed: true },
    { name: 'Adhara', ra: 6.98, dec: -28.97, mag: 1.50, isNamed: true },
    { name: 'Aludra', ra: 7.40, dec: -29.30, mag: 2.45, isNamed: true },
    // Taurus
    { name: 'Aldebaran', ra: 4.59, dec: 16.50, mag: 0.85, isNamed: true },
    { name: 'Ain', ra: 4.47, dec: 19.18, mag: 3.53, isNamed: true },
    { name: 'Zeta Tauri', ra: 5.62, dec: 21.14, mag: 3.01, isNamed: true },
    { name: 'Elnath', ra: 5.43, dec: 28.60, mag: 1.65, isNamed: true },
    // Other bright stars
    { name: 'Polaris', ra: 2.53, dec: 89.26, mag: 1.97, isNamed: true },
    { name: 'Canopus', ra: 6.39, dec: -52.69, mag: -0.74, isNamed: true },
    { name: 'Arcturus', ra: 14.26, dec: 19.18, mag: -0.05, isNamed: true }
];

const starMap = {};
namedStars.forEach(s => starMap[s.name] = s);

// Background faint stars
const backgroundStars = [];
for (let i = 0; i < 150; i++) {
    backgroundStars.push({
        ra: Math.random() * 24, dec: (Math.random() * 180) - 90, mag: Math.random() * 4 + 2, isNamed: false
    });
}
const allStars = [...namedStars, ...backgroundStars];

const planetData = [
    { name: 'Venus', ra: 3.5, dec: 15.0, color: '#00e5ff', isNamed: true },
    { name: 'Mars', ra: 6.0, dec: 23.5, color: '#ff5252', isNamed: true },
    { name: 'Jupiter', ra: 2.0, dec: 12.0, color: '#ffb74d', isNamed: true }
];

// --- MATH ENGINE ---
function getAltAz(raHours, decDeg, latDeg, lonDeg, date) {
    const deg2rad = Math.PI / 180;
    const ra = raHours * 15 * deg2rad; 
    const dec = decDeg * deg2rad;
    const lat = latDeg * deg2rad;
    const jd = (date.getTime() / 86400000.0) + 2440587.5;
    const d = jd - 2451545.0; 
    let lstDeg = (100.46 + 0.985647 * d + lonDeg + (date.getUTCHours() + date.getUTCMinutes() / 60) * 15) % 360;
    if (lstDeg < 0) lstDeg += 360;
    const ha = (lstDeg * deg2rad) - ra;
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const alt = Math.asin(sinAlt);
    const cosAz = (Math.sin(dec) - Math.sin(lat) * Math.sin(alt)) / (Math.cos(lat) * Math.cos(alt));
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))); 
    if (Math.sin(ha) > 0) az = (2 * Math.PI) - az;
    return { alt: alt / deg2rad, az: az / deg2rad };
}

function getCanvasCoords(az, alt, centerX, centerY, radius) {
    const azRad = az * Math.PI / 180;
    const r = radius * (1 - alt / 90);
    return { x: centerX + r * Math.sin(azRad), y: centerY - r * Math.cos(azRad) };
}

function calculateMoonPhase(date) {
    const lp = 2551443; 
    const now = date.getTime() / 1000;
    const new_moon = 947182440;
    const phase = ((now - new_moon) % lp) / lp;
    if (phase < 0.03 || phase > 0.97) return "🌑 New Moon";
    if (phase < 0.22) return "🌒 Waxing Crescent";
    if (phase < 0.28) return "🌓 First Quarter";
    if (phase < 0.47) return "🌔 Waxing Gibbous";
    if (phase < 0.53) return "🌕 Full Moon";
    if (phase < 0.72) return "🌖 Waning Gibbous";
    if (phase < 0.78) return "🌗 Last Quarter";
    return "🌘 Waning Crescent";
}

// --- ANIMATION LOOP ---
function animate() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 1. Calculate the current radius of the sky based on zoom
    const radius = (Math.max(canvas.width, canvas.height) / 1.2) * zoomLevel; 
    
    // 2. NEW: Calculate the maximum allowed drag distance
    const limitX = Math.max(0, radius - (canvas.width / 2));
    const limitY = Math.max(0, radius - (canvas.height / 2));
    
    // 3. NEW: Clamp the offsets so they cannot exceed the limits
    offsetX = Math.max(-limitX, Math.min(limitX, offsetX));
    offsetY = Math.max(-limitY, Math.min(limitY, offsetY));

    // 4. Apply the safe offsets to the center coordinates
    const centerX = (canvas.width / 2) + offsetX;
    const centerY = (canvas.height / 2) + offsetY;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    visibleObjects = [];

    // ... (Keep the rest of your animate function exactly the same from here down!)

    const simDate = getSimulatedTime();
    const lat = parseFloat(document.getElementById('latitude').value) || 40.7128;
    const lon = parseFloat(document.getElementById('longitude').value) || -74.0060;

    // Update UI Panels
    if(document.getElementById('simTimeDisplay')) {
        document.getElementById('simTimeDisplay').innerText = simDate.toLocaleTimeString() + " (" + simDate.toLocaleDateString() + ")";
        document.getElementById('moonPhase').innerText = calculateMoonPhase(simDate);
        const hour = simDate.getHours();
        document.getElementById('sunStatus').innerText = (hour >= 6 && hour < 18) ? "Up (Daytime)" : "Down (Nighttime)";
    }

    // Celestial Grid
    if (viewState.grid) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)'; 
        ctx.lineWidth = 1;

        for (let dec = -80; dec <= 80; dec += 20) {
            ctx.beginPath();
            let isDrawing = false;
            for (let ra = 0; ra <= 24.1; ra += 0.2) { 
                const pos = getAltAz(ra % 24, dec, lat, lon, simDate);
                if (pos.alt > 0) {
                    const c = getCanvasCoords(pos.az, pos.alt, centerX, centerY, radius);
                    if (!isDrawing) {
                        ctx.moveTo(c.x, c.y);
                        isDrawing = true;
                    } else {
                        ctx.lineTo(c.x, c.y);
                    }
                } else {
                    isDrawing = false; 
                }
            }
            ctx.stroke();
        }

        for (let ra = 0; ra < 24; ra += 2) {
            ctx.beginPath();
            let isDrawing = false;
            for (let dec = -90; dec <= 90; dec += 2) {
                const pos = getAltAz(ra, dec, lat, lon, simDate);
                if (pos.alt > 0) {
                    const c = getCanvasCoords(pos.az, pos.alt, centerX, centerY, radius);
                    if (!isDrawing) {
                        ctx.moveTo(c.x, c.y);
                        isDrawing = true;
                    } else {
                        ctx.lineTo(c.x, c.y);
                    }
                } else {
                    isDrawing = false;
                }
            }
            ctx.stroke();
        }
    }

    // Stars
    if (viewState.stars) {
        allStars.forEach(star => {
            const realPos = getAltAz(star.ra, star.dec, lat, lon, simDate);
            if (realPos.alt > 0) {
                const pos = getCanvasCoords(realPos.az, realPos.alt, centerX, centerY, radius);
                const size = Math.max(0.5, 4 - star.mag);
                
                if (star.isNamed) {
                    visibleObjects.push({ ...pos, size: size * 3, data: star });
                    ctx.shadowBlur = size * 4;
                    ctx.shadowColor = '#ffffff';
                }

                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
    }

    // Planets
    if (viewState.planets) {
        planetData.forEach(planet => {
            const realPos = getAltAz(planet.ra, planet.dec, lat, lon, simDate);
            if (realPos.alt > 0) {
                const pos = getCanvasCoords(realPos.az, realPos.alt, centerX, centerY, radius);
                visibleObjects.push({ ...pos, size: 8, data: planet });
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = planet.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = planet.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
    }

    // Constellations
    if (viewState.constellations) {
        const lines = [
            ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Betelgeuse', 'Alnitak'],
            ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Mintaka', 'Rigel'],
            ['Alnitak', 'Saiph'], ['Rigel', 'Saiph'],
            ['Alkaid', 'Mizar'], ['Mizar', 'Alioth'], ['Alioth', 'Megrez'],
            ['Megrez', 'Phecda'], ['Phecda', 'Merak'], ['Merak', 'Dubhe'], ['Dubhe', 'Megrez'],
            ['Caph', 'Schedar'], ['Schedar', 'Gamma Cassiopeiae'], ['Gamma Cassiopeiae', 'Ruchbah'], ['Ruchbah', 'Segin'],
            ['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Delta Cygni', 'Sadr'], ['Gienah', 'Sadr'],
            ['Acrux', 'Gacrux'], ['Mimosa', 'Delta Crucis'],
            ['Vega', 'Zeta Lyrae'], ['Zeta Lyrae', 'Delta Lyrae'], ['Delta Lyrae', 'Sulafat'], ['Sulafat', 'Sheliak'], ['Sheliak', 'Zeta Lyrae'],
            ['Sirius', 'Mirzam'], ['Sirius', 'Wezen'], ['Wezen', 'Adhara'], ['Wezen', 'Aludra'],
            ['Aldebaran', 'Ain'], ['Aldebaran', 'Zeta Tauri'], ['Ain', 'Elnath']
        ];

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;

        lines.forEach(pair => {
            const star1 = starMap[pair[0]];
            const star2 = starMap[pair[1]];
            
            if (star1 && star2) {
                const pos1 = getAltAz(star1.ra, star1.dec, lat, lon, simDate);
                const pos2 = getAltAz(star2.ra, star2.dec, lat, lon, simDate);

                if (pos1.alt > 0 && pos2.alt > 0) {
                    const p1 = getCanvasCoords(pos1.az, pos1.alt, centerX, centerY, radius);
                    const p2 = getCanvasCoords(pos2.az, pos2.alt, centerX, centerY, radius);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });
    }

    // Stop hover tooltips from flashing while dragging the sky
    if (!isDragging) {
        handleHover();
    }
    
    requestAnimationFrame(animate);
}

// --- UI INTERACTIONS & API FETCHING ---
function handleHover() {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    
    let hoveredObject = null;
    for (const obj of visibleObjects) {
        const dist = Math.sqrt(Math.pow(mouseX - obj.x, 2) + Math.pow(mouseY - obj.y, 2));
        if (dist < obj.size + 8) {
            hoveredObject = obj;
            break;
        }
    }

    if (hoveredObject) {
        const name = hoveredObject.data.name;
        document.body.style.cursor = 'pointer';
        tooltip.style.left = mouseX + 15 + 'px';
        tooltip.style.top = mouseY + 15 + 'px';
        tooltip.style.opacity = '1';

        if (currentlyHoveredName !== name) {
            currentlyHoveredName = name;
            tooltip.innerHTML = `<div class="tooltip-title">${name}</div><div class="tooltip-body">Fetching data...</div>`;
            
            fetchStarInfo(name).then(info => {
                if (currentlyHoveredName === name) {
                    tooltip.innerHTML = `<div class="tooltip-title">${name}</div><div class="tooltip-body">${info}</div>`;
                }
            });
        }
    } else {
        tooltip.style.opacity = '0';
        document.body.style.cursor = 'grab'; 
        currentlyHoveredName = null;
    }
}

function toggleLayer(layer) {
    viewState[layer] = !viewState[layer];
    const btn = document.getElementById(`btn-${layer}`);
    if (btn) btn.classList.toggle('active', viewState[layer]);
}

async function searchLocation() {
    const query = document.getElementById('locationSearch').value;
    if (!query) return;

    const searchBtn = document.querySelector('.search-box button');
    const originalText = searchBtn.innerText;
    searchBtn.innerText = "Searching...";

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            document.getElementById('latitude').value = parseFloat(data[0].lat).toFixed(4);
            document.getElementById('longitude').value = parseFloat(data[0].lon).toFixed(4);
        } else {
            alert('City not found. Please try a different name.');
        }
    } catch (error) {
        alert('Could not connect to the search service.');
    } finally {
        searchBtn.innerText = originalText;
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(4);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(4);
            },
            (error) => {
                alert('Unable to access GPS.');
            }
        );
    }
}

window.onload = animate;