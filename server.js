const path = require('path');
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const QUEBEC_HEALTH_URL = 'https://www.indexsante.ca/urgences/';

async function scrapeHospitalData() {
    try {
        const { data } = await axios.get(QUEBEC_HEALTH_URL);
        const $ = cheerio.load(data);
        
        const hospitals = [];
        
        // Modified selector to match the actual website structure
        $('table tr').each((i, elem) => {
            if (i === 0) return; // Skip header row
            
            const $row = $(elem);
            const columns = $row.find('td');
            
            if (columns.length >= 5) {
                const hospital = {
                    name: $(columns[0]).text().trim(),
                    waitTime: $(columns[1]).text().trim(),
                    occupancy: $(columns[2]).text().trim(),
                    ambulanceStatus: $(columns[3]).text().trim(),
                    lastUpdate: $(columns[4]).text().trim()
                };
                
                // Only add Montreal hospitals
                if (hospital.name.toLowerCase().includes('montréal') || 
                    hospital.name.toLowerCase().includes('montreal') ||
                    hospital.name.toLowerCase().includes('mcgill')) {
                    hospitals.push(hospital);
                }
            }
        });
        
        console.log('Scraped hospitals:', hospitals); // Add this line
        return hospitals;
    } catch (error) {
        console.error('Error scraping hospital data:', error);
        return [];
    }
}

app.get('/api/hospitals', async (req, res) => {
    try {
        const hospitals = await scrapeHospitalData();
        res.json(hospitals);
    } catch (error) {
        console.error('Error in /api/hospitals:', error);
        res.status(500).json({ error: 'Failed to fetch hospital data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});