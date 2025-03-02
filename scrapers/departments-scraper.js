const puppeteer = require('puppeteer');

const hospitalUrls = {
    "Centre hospitalier de l'Université de Montréal": {
        url: "https://www.chumontreal.qc.ca/patients/soins-et-services",
        selector: '.field-items .field-item'
    },
    "Hôpital de Montréal pour enfants": {
        url: "https://www.thechildren.com/departments-and-staff/departments",
        selector: '.field-content'
    },
    "Hôpital Royal Victoria": {
        url: "https://muhc.ca/clinical-departments",
        selector: '.field-content a'
    },
    "Institut universitaire en santé mentale de Montréal": {
        url: "https://ciusss-estmtl.gouv.qc.ca/soins-et-services/soins-et-services-offerts",
        selector: '.field-content'
    },
    "Hôpital du Sacré-Cœur de Montréal": {
        url: "https://www.ciusssnim.ca/soins-et-services/soins-et-services-generaux",
        selector: '.field-content'
    },
    "Institut de Cardiologie de Montréal": {
        url: "https://www.icm-mhi.org/fr/soins-et-services/services-soins-cardiologiques",
        selector: '.content-text ul li'
    }
};

async function scrapeDepartments(config, hospitalName) {
    const browser = await puppeteer.launch({ 
        headless: "new",
        timeout: 30000,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        console.log(`Fetching ${config.url}`);
        await page.goto(config.url, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for content to load
        await page.waitForSelector(config.selector, { timeout: 5000 });

        // Scrape departments
        const departments = await page.evaluate((selector) => {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements)
                .map(el => el.textContent.trim())
                .filter(text => text.length > 0);
        }, config.selector);

        // Add some default departments based on hospital type
        let allDepartments = new Set(departments);
        
        // Add emergency to all hospitals
        allDepartments.add('Urgence');
        
        // Add specific departments based on hospital name
        if (hospitalName.includes('Cardiologie')) {
            allDepartments.add('Cardiologie');
            allDepartments.add('Soins intensifs cardiologiques');
        }
        if (hospitalName.includes('santé mentale')) {
            allDepartments.add('Psychiatrie');
            allDepartments.add('Santé mentale');
        }
        if (hospitalName.includes('enfants')) {
            allDepartments.add('Pédiatrie');
        }

        console.log(`Found ${allDepartments.size} departments for ${hospitalName}`);
        return Array.from(allDepartments);

    } catch (error) {
        console.error(`Error scraping ${hospitalName}:`, error);
        // Return default departments if scraping fails
        return ['Urgence', 'Médecine générale'];
    } finally {
        await browser.close();
    }
}

async function scrapeAllHospitals() {
    const results = {};
    
    for (const [hospital, config] of Object.entries(hospitalUrls)) {
        console.log(`\nScraping departments for ${hospital}...`);
        results[hospital] = await scrapeDepartments(config, hospital);
        // Add a delay between requests to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save results to a JSON file
    const fs = require('fs');
    fs.writeFileSync(
        'hospital-departments.json', 
        JSON.stringify(results, null, 2),
        'utf8'
    );
    
    return results;
}

// Run the scraper
scrapeAllHospitals().then(() => {
    console.log('\nScraping completed! Check hospital-departments.json for results.');
}).catch(error => {
    console.error('Scraping failed:', error);
});