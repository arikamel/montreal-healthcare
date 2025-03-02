// Global variables
let currentLang = 'en';
let map;
let directionsService;
let directionsRenderer;
let userLocation = null;
let hospitals = [];

// Complete hospital coordinates mapping for Montreal
const hospitalLocations = {
    "Centre hospitalier de l'Université de Montréal": { lat: 45.5124, lng: -73.5578 },
    "Hôpital de Montréal pour enfants": { lat: 45.4661, lng: -73.5594 },
    "Hôpital Royal Victoria": { lat: 45.5088, lng: -73.5821 },
    "Hôpital général de Montréal": { lat: 45.4973, lng: -73.5873 },
    "Institut universitaire en santé mentale de Montréal": { lat: 45.5762, lng: -73.5549 },
    "Hôpital du Sacré-Cœur de Montréal": { lat: 45.5332, lng: -73.7139 },
    "Institut de Cardiologie de Montréal": { lat: 45.5728, lng: -73.5641 }
};

// Translations for bilingual support
const translations = {
    en: {
        // General
        "Urgence": "Emergency",
        "Médecine générale": "General Medicine",
        "Chirurgie": "Surgery",
        "Soins intensifs": "Intensive Care",
        
        // Cardiology
        "Cardiologie": "Cardiology",
        "Urgence cardiologique": "Cardiac Emergency",
        "Chirurgie cardiaque": "Cardiac Surgery",
        "Électrophysiologie": "Electrophysiology",
        "Soins intensifs cardiaques": "Cardiac Intensive Care",
        "Réadaptation cardiaque": "Cardiac Rehabilitation",
        "Imagerie cardiaque": "Cardiac Imaging",
        "Recherche cardiovasculaire": "Cardiovascular Research",
        
        // Pediatric
        "Urgence pédiatrique": "Pediatric Emergency",
        "Pédiatrie générale": "General Pediatrics",
        "Cardiologie pédiatrique": "Pediatric Cardiology",
        "Chirurgie pédiatrique": "Pediatric Surgery",
        "Neurologie pédiatrique": "Pediatric Neurology",
        "Oncologie pédiatrique": "Pediatric Oncology",
        "Soins intensifs pédiatriques": "Pediatric Intensive Care",
        "Psychiatrie pédiatrique": "Pediatric Psychiatry",
        
        // Mental Health
        "Urgence psychiatrique": "Psychiatric Emergency",
        "Psychiatrie générale": "General Psychiatry",
        "Gérontopsychiatrie": "Geriatric Psychiatry",
        "Troubles anxieux": "Anxiety Disorders",
        "Troubles de l'humeur": "Mood Disorders",
        "Psychose": "Psychosis",
        "Dépendances": "Addiction",
        "Thérapie": "Therapy",
        
        // Other Specialties
        "Neurologie": "Neurology",
        "Oncologie": "Oncology",
        "Obstétrique": "Obstetrics",
        "Radiologie": "Radiology",
        "Orthopédie": "Orthopedics",
        "Pneumologie": "Pulmonology",
        "Traumatologie": "Traumatology",
        "Transplantation": "Transplantation"
    },
    fr: {
        // All French terms are already in French, so we just map them to themselves
        "Urgence": "Urgence",
        "Médecine générale": "Médecine générale",
        // ... etc (all other terms remain the same in French)
    }
};

function normalizeServiceName(serviceName) {
    return serviceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

function updateTranslations(departments) {
    // Add any new departments to translations
    departments.forEach(dept => {
        const normalizedName = normalizeServiceName(dept);
        if (!translations.en[normalizedName]) {
            translations.en[normalizedName] = dept;
            // You might want to manually add French translations later
            translations.fr[normalizedName] = dept;
        }
    });
}

// Function to get hospital coordinates
function getHospitalPosition(hospitalName) {
    // Normalize the hospital name for comparison
    const normalizedName = hospitalName.toLowerCase()
        .replace(/['-]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\(.*\)/g, '') // Remove anything in parentheses
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();

    console.log('Normalized name:', normalizedName);

    // Map of normalized names to original names
    const nameMapping = {
        'centre hospitalier de luniversite de montreal': 'Centre hospitalier de l\'Université de Montréal',
        'lhopital de montreal pour enfants': 'Hôpital de Montréal pour enfants',
        'hopital royal victoria centre universitaire de sante mcgill site glen': 'Hôpital Royal Victoria',
        'hopital general de montreal': 'Hôpital général de Montréal',
        'institut universitaire en sante mentale de montreal': 'Institut universitaire en santé mentale de Montréal',
        'hopital du sacrecoeurdemontreal': 'Hôpital du Sacré-Cœur de Montréal',
        'institut de cardiologie de montreal': 'Institut de Cardiologie de Montréal'
    };

    // Get the standardized name
    const standardName = nameMapping[normalizedName];
    console.log('Normalized name mapped to:', standardName);

    // Return the coordinates for the standardized name
    const coordinates = hospitalLocations[standardName];
    
    if (!coordinates) {
        console.warn(`No coordinates found for hospital: ${hospitalName} (normalized: ${normalizedName}, mapped: ${standardName})`);
        return { lat: 45.5017, lng: -73.5673 }; // Montreal center as fallback
    }

    return coordinates;
}

// Fetch real hospital data from the server
async function fetchHospitalData() {
    try {
        const response = await fetch('http://localhost:3000/api/hospitals');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const mappedData = data.map(hospital => {
            const position = getHospitalPosition(hospital.name);
            // Assign appropriate services based on hospital type
            const services = ['emergency']; // Base service
            
            // Add specific services based on hospital name/type
            if (hospital.name.includes('CARDIOLOGIE')) {
                services.push('cardiology');
            }
            if (hospital.name.includes('ENFANTS')) {
                services.push('pediatric');
            }
            if (hospital.name.includes('SANTÉ MENTALE')) {
                services.push('psychiatry');
            }
            // Add more service mappings based on hospital names or data

            return {
                ...hospital,
                position: position,
                services: services
            };
        });
        
        return mappedData;
    } catch (error) {
        console.error('Error fetching hospital data:', error);
        showError(translations[currentLang].error);
        return [];
    }
}

// Initialize Google Maps
async function initMap() {
    console.log('initMap called'); // Debug log

    if (!document.getElementById('map')) {
        console.error('Map container not found');
        return;
    }

    const montreal = { lat: 45.5017, lng: -73.5673 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: montreal,
        mapId: '80c537c6c9dc4b4d'
    });

    console.log('Map initialized'); // Debug log

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    try {
        await initHospitals();
        console.log('Hospitals initialized'); // Debug log
        initLanguageToggle();
        initLocationButton();
        initRealTimeUpdates();
        initModalListeners();
    } catch (error) {
        console.error('Error in initMap:', error);
    }
}

// Initialize hospitals with real data
async function initHospitals() {
    showLoading();
    hospitals = await fetchHospitalData();
    hideLoading();
    
    if (hospitals.length === 0) {
        showError(translations[currentLang].error);
        return;
    }

    hospitals.forEach(hospital => {
        const marker = addMarker(hospital, map);
        hospital.marker = marker;
    });

    // Initialize search
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchHospitals(e.target.value, hospitals);
        });
    }

    // Initialize service filter
    initServiceFilter();
    populateWaitTimes(hospitals);
    checkEmergencyStatus();
}

// Add marker to map
function addMarker(hospital, map) {
    console.log(`=== ADDING MARKER ===`);
    console.log(`Hospital: ${hospital.name}`);
    console.log(`Position:`, hospital.position);
    console.log(`===================`);

    if (!hospital.position || !hospital.position.lat || !hospital.position.lng) {
        console.error('Invalid position for hospital:', hospital);
        return null;
    }

    try {
        const marker = new google.maps.Marker({
            position: hospital.position,
            map: map,
            title: hospital.name
        });

        const infoWindow = new google.maps.InfoWindow({
            content: createInfoWindowContent(hospital)
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        return marker;
    } catch (error) {
        console.error('Error creating marker:', error);
        return null;
    }
}

// Create info window content
function createInfoWindowContent(hospital) {
    // Format wait time
    const formatWaitTime = (waitTime) => {
        // If waitTime is just a number, assume it's in minutes
        const minutes = parseInt(waitTime);
        if (!isNaN(minutes)) {
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                if (remainingMinutes === 0) {
                    return `${hours}h`;
                }
                return `${hours}h ${remainingMinutes}min`;
            }
            return `${minutes}min`;
        }
        // If it's not a number, return as is
        return waitTime;
    };

    const distance = hospital.distance ? 
        `<p><strong>${translations[currentLang].distance}:</strong> ${hospital.distance} ${translations[currentLang].kmAway}</p>` : '';

    return `
        <div class="info-window">
            <h3>${hospital.name}</h3>
            <p><strong>${translations[currentLang].waitTime}:</strong> ${formatWaitTime(hospital.waitTime)}</p>
            <p><strong>${translations[currentLang].services}:</strong> ${hospital.services.map(service => translations[currentLang][service] || service).join(', ')}</p>
            ${distance}
            <button onclick="getDirections('${hospital.name}')" class="direction-button">
                ${translations[currentLang].getDirections}
            </button>
            <button onclick="showHospitalDetails('${hospital.name}')" class="details-button">
                ${translations[currentLang].moreInfo}
            </button>
        </div>
    `;
}

// Update real-time data
function initRealTimeUpdates() {
    setInterval(async () => {
        const updatedHospitals = await fetchHospitalData();
        if (updatedHospitals.length > 0) {
            hospitals = updatedHospitals;
            populateWaitTimes(hospitals);
            checkEmergencyStatus();
            updateMarkers();
        }
    }, 300000); // Update every 5 minutes
}

// ... (continued from previous part)

// Language toggle functionality
function initLanguageToggle() {
    const enButton = document.getElementById('lang-en');
    const frButton = document.getElementById('lang-fr');
    
    if (enButton && frButton) {
        enButton.addEventListener('click', () => setLanguage('en'));
        frButton.addEventListener('click', () => setLanguage('fr'));
    }
}

// Set language and update UI
function setLanguage(lang) {
    currentLang = lang;
    
    // Update all translatable elements
    document.querySelectorAll('[data-en]').forEach(element => {
        element.textContent = element.getAttribute(`data-${lang}`);
    });

    // Update search placeholder
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.placeholder = translations[lang].search;
    }

    // Update service filter
    initServiceFilter();

    // Refresh all hospital markers and cards
    hospitals.forEach(hospital => {
        if (hospital.marker) {
            const infoWindow = new google.maps.InfoWindow({
                content: createInfoWindowContent(hospital)
            });
            
            hospital.marker.addListener('gmp-click', () => {
                infoWindow.open(map, hospital.marker);
            });
        }
    });

    populateWaitTimes(hospitals);
}

// Initialize location services
function initLocationButton() {
    const locateButton = document.getElementById('locate-me');
    if (locateButton) {
        locateButton.addEventListener('click', () => {
            if (navigator.geolocation) {
                locateButton.disabled = true;
                navigator.geolocation.getCurrentPosition(
                    position => {
                        userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        updateDistances();
                        locateButton.disabled = false;
                    },
                    error => {
                        console.error('Error getting location:', error);
                        alert(translations[currentLang].enableLocation);
                        locateButton.disabled = false;
                    }
                );
            }
        });
    }
}

// Get directions to hospital
function getDirections(hospitalName) {
    if (!userLocation) {
        alert(translations[currentLang].enableLocation);
        return;
    }

    const hospital = hospitals.find(h => h.name === hospitalName);
    if (hospital) {
        const request = {
            origin: userLocation,
            destination: hospital.position,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
                const directionsPanel = document.getElementById('directions-panel');
                if (directionsPanel) {
                    directionsPanel.style.display = 'block';
                }
            } else {
                console.error('Directions request failed:', status);
                alert(translations[currentLang].error);
            }
        });
    }
}

// Show hospital details in modal
function showHospitalDetails(hospitalName) {
    const hospital = hospitals.find(h => h.name === hospitalName);
    const modal = document.getElementById('hospital-details');
    const content = document.getElementById('hospital-details-content');
    
    if (hospital && modal && content) {
        content.innerHTML = `
            <h2>${hospital.name}</h2>
            <p><strong>${translations[currentLang].waitTime}:</strong> ${hospital.waitTime}</p>
            <p><strong>${translations[currentLang].services}:</strong> ${hospital.services.map(service => translations[currentLang][service] || service).join(', ')}</p>
            <p><strong>${translations[currentLang].parking}:</strong> ${hospital.details.parking}</p>
            <p><strong>${translations[currentLang].visitingHours}:</strong> ${hospital.details.visiting_hours}</p>
            <p><strong>${translations[currentLang].emergencyCapacity}:</strong> ${hospital.details.emergency_capacity}</p>
            <p><strong>${translations[currentLang].lastUpdated}:</strong> ${hospital.lastUpdate}</p>
        `;

        modal.style.display = 'block';
    }
}

// Check emergency status and update UI
function checkEmergencyStatus() {
    const highWaitTimeHospitals = hospitals.filter(hospital => {
        const waitTime = parseInt(hospital.waitTime) || 0;
        return waitTime >= 180; // 3 hours or more
    });

    const banner = document.getElementById('emergency-banner');
    if (banner) {
        if (highWaitTimeHospitals.length > 0) {
            banner.style.display = 'flex';
            banner.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${translations[currentLang].highWaitTime}</span>
                <span>(${highWaitTimeHospitals.map(h => h.name).join(', ')})</span>
            `;
            
            highWaitTimeHospitals.forEach(hospital => {
                const card = document.querySelector(`[data-hospital="${hospital.name}"]`);
                if (card) {
                    card.classList.add('emergency-high');
                }
            });
        } else {
            banner.style.display = 'none';
        }
    }
}

// Search functionality
function searchHospitals(searchText, hospitals) {
    const searchLower = searchText.toLowerCase();
    hospitals.forEach(hospital => {
        const visible = hospital.name.toLowerCase().includes(searchLower) ||
                      (hospital.address && hospital.address.toLowerCase().includes(searchLower));
        if (hospital.marker) {
            hospital.marker.setMap(visible ? map : null);
        }
    });
}

function initServiceFilter() {
    const serviceFilter = document.getElementById('service-filter');
    if (serviceFilter) {
        // Get all unique services from hospitals
        const allServices = new Set();
        hospitals.forEach(hospital => {
            // Add common services that all hospitals should have
            allServices.add('emergency');
            allServices.add('surgery');
            allServices.add('cardiology');
            allServices.add('pediatric');
            allServices.add('oncology');
            allServices.add('maternity');
            allServices.add('neurology');
            // Add any additional services from the hospital data
            hospital.services.forEach(service => allServices.add(service));
        });

        // Clear existing options
        serviceFilter.innerHTML = `<option value="">${translations[currentLang].allServices}</option>`;
        
        // Add service options sorted alphabetically by their translated names
        Array.from(allServices)
            .sort((a, b) => {
                const transA = translations[currentLang][a] || a;
                const transB = translations[currentLang][b] || b;
                return transA.localeCompare(transB, [currentLang]);
            })
            .forEach(service => {
                const option = document.createElement('option');
                option.value = service;
                option.textContent = translations[currentLang][service] || service;
                serviceFilter.appendChild(option);
            });

        // Add or update event listener
        serviceFilter.addEventListener('change', (e) => {
            filterByService(e.target.value, hospitals);
        });
    }
}

// Filter hospitals by service
function filterByService(selectedService, hospitals) {
    hospitals.forEach(hospital => {
        const visible = selectedService === '' || 
                      hospital.services.includes(selectedService);
        if (hospital.marker) {
            hospital.marker.setMap(visible ? map : null);
        }
    });
}

// Update distances from user location
function updateDistances() {
    if (!userLocation) return;

    hospitals.forEach(hospital => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation),
            new google.maps.LatLng(hospital.position)
        );
        hospital.distance = (distance / 1000).toFixed(1); // Convert to kilometers
    });

    populateWaitTimes(hospitals);
}

// Populate wait times grid
function populateWaitTimes(hospitals) {
    const waitTimesContainer = document.getElementById('wait-times');
    if (!waitTimesContainer) return;

    // Format wait time
    const formatWaitTime = (waitTime) => {
        const minutes = parseInt(waitTime);
        if (!isNaN(minutes)) {
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                if (remainingMinutes === 0) {
                    return `${hours}h`;
                }
                return `${hours}h ${remainingMinutes}min`;
            }
            return `${minutes}min`;
        }
        return waitTime;
    };

    // Sort hospitals by wait time
    const sortedHospitals = [...hospitals].sort((a, b) => {
        const timeA = parseInt(a.waitTime) || 0;
        const timeB = parseInt(b.waitTime) || 0;
        return timeA - timeB;
    });

    waitTimesContainer.innerHTML = sortedHospitals.map(hospital => {
        const distance = hospital.distance ? 
            `<span class="distance">${hospital.distance} ${translations[currentLang].kmAway}</span>` : '';
            
        return `
            <div class="hospital-card" data-hospital="${hospital.name}" onclick="showHospitalDetails('${hospital.name}')">
                <h3>${hospital.name}</h3>
                <p class="wait-time">
                    <strong>${translations[currentLang].waitTime}:</strong> 
                    ${formatWaitTime(hospital.waitTime)}
                </p>
                ${distance}
                <div class="hospital-card-actions">
                    <button onclick="event.stopPropagation(); getDirections('${hospital.name}')" class="direction-button">
                        ${translations[currentLang].getDirections}
                    </button>
                    <button onclick="event.stopPropagation(); showHospitalDetails('${hospital.name}')" class="details-button">
                        ${translations[currentLang].moreInfo}
                    </button>
                </div>
                <div class="services-list">
                    <strong>${translations[currentLang].services}:</strong>
                    ${hospital.services.map(service => translations[currentLang][service] || service).join(', ')}
                </div>
            </div>
        `;
    }).join('');
}

// Initialize modal listeners
function initModalListeners() {
    const closeButton = document.querySelector('.close-button');
    const modal = document.getElementById('hospital-details');
    
    if (closeButton && modal) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Loading and error handling
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = `<div class="spinner"></div><p>${translations[currentLang].loading}</p>`;
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

function showError(message) {
    const error = document.createElement('div');
    error.id = 'error-message';
    error.innerHTML = `
        <p>${message}</p>
        <button onclick="location.reload()">${translations[currentLang].tryAgain}</button>
    `;
    document.body.appendChild(error);
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initModalListeners();
});