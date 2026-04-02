const fs = require('fs');
const cheerio = require('cheerio');
const gis = require('g-i-s');

function searchImage(query) {
    return new Promise((resolve, reject) => {
        gis(query, (error, results) => {
            if (error) {
                resolve(null);
            } else if (results && results.length > 0) {
                // Find first image that is not too small and preferably https
                const goodImg = results.find(r => r.url.startsWith('http') && r.width >= 200) || results[0];
                resolve(goodImg.url);
            } else {
                resolve(null);
            }
        });
    });
}

async function run() {
    console.log('Reading index.html...');
    let html = fs.readFileSync('index.html', 'utf-8');
    const $ = cheerio.load(html);

    // Translate texts to Portuguese
    console.log('Translating text to Portuguese...');
    $('title').text('Gorila Fitness | Catálogo de Vendas Premium');
    $('.tagline').text('SUPLEMENTOS DE ALTA PERFORMANCE / CATÁLOGO DE ELITE');
    
    // Section 1
    $('h2:contains("THE IGNITION")').text('A IGNIÇÃO');
    $('p:contains("PRE-WORKOUTS & THERMOGENICS")').text('PRÉ-TREINOS E TERMOGÊNICOS');
    
    // Section 2
    $('h2:contains("THE BUILD")').text('A CONSTRUÇÃO');
    $('p:contains("PROTEINS & CREATINES")').text('PROTEÍNAS E CREATINAS');
    
    // Section 3
    $('h2:contains("THE OPTIMIZER")').text('O OTIMIZADOR');
    $('p:contains("HEALTH & PERFORMANCE")').text('SAÚDE E PERFORMANCE');
    
    // Section 4
    $('h2:contains("THE REWARD")').text('A RECOMPENSA');
    $('p:contains("GOURMET PEANUT BUTTERS")').text('PASTAS DE AMENDOIM GOURMET');
    
    // Buttons
    $('.btn-primary').text('COMPRE AGORA');
    $('.btn-secondary').text('SAIBA MAIS');

    // Make img-placeholder styling fit images in css too
    // We will do that in styles.css later if needed, we'll assign class="product-image" to img

    const products = $('.product-card').toArray();
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const title = $(p).find('h3').text().trim();
        const brand = $(p).find('.brand').text().trim();
        
        const query = `${title} ${brand} suplemento`;
        console.log(`Searching image for: ${query}`);
        
        let url = await searchImage(query);
        // Fallback or retry
        if (!url) {
            console.log(`Failed. Retrying simpler query for: ${title}`);
            url = await searchImage(title);
        }

        if (url) {
            console.log(`Found: ${url}`);
            $(p).find('.img-placeholder').replaceWith(`<div class="img-wrapper"><img src="${url}" alt="${title}" class="product-img" loading="lazy"></div>`);
        } else {
            console.log(`No image found. Keeping placeholder.`);
        }
        
        // Anti-rate-limit delay
        await new Promise(r => setTimeout(r, 1000));
    }

    fs.writeFileSync('index.html', $.html());
    console.log('Done! Updated index.html');
}

run().catch(console.error);
