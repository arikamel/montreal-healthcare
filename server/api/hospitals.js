const express = require('express');
const router = express.Router();
const fs = require('fs');

// Load departments data
const departmentsData = JSON.parse(
    fs.readFileSync('hospital-departments.json')
);

router.get('/hospitals', async (req, res) => {
    try {
        // Your existing hospital data fetch
        const hospitals = await fetchHospitalData();
        
        // Merge with departments data
        const hospitalsWithDepartments = hospitals.map(hospital => {
            const departments = departmentsData[hospital.name] || [];
            return {
                ...hospital,
                services: departments
            };
        });
        
        res.json(hospitalsWithDepartments);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch hospital data' });
    }
});

module.exports = router;