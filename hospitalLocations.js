const hospitalLocations = {
    "Hôpital général de Montréal": { lat: 45.4973, lng: -73.5873 },
    "Hôpital Royal Victoria": { lat: 45.5088, lng: -73.5821 },
    "Hôpital général juif Sir Mortimer B. Davis": { lat: 45.4986, lng: -73.6298 },
    "Hôpital de Montréal pour enfants": { lat: 45.4661, lng: -73.5594 },
    "Hôpital Saint-Luc": { lat: 45.5124, lng: -73.5578 },
    "Hôpital Notre-Dame": { lat: 45.5254, lng: -73.5631 },
    "Hôpital Maisonneuve-Rosemont": { lat: 45.5762, lng: -73.5549 },
    "Hôpital Jean-Talon": { lat: 45.5445, lng: -73.6142 },
    "Hôpital du Sacré-Cœur de Montréal": { lat: 45.5332, lng: -73.7139 },
    "Hôpital Santa Cabrini": { lat: 45.5786, lng: -73.5671 }
};

export function getHospitalPosition(hospitalName) {
    return hospitalLocations[hospitalName] || { lat: 45.5017, lng: -73.5673 }; // Default to Montreal center
}