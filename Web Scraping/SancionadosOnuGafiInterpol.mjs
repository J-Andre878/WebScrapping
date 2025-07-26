import axios from 'axios';
import xml2js from 'xml2js';
import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'webScraping';
const COLLECTION_NAME = 'sancionados';

async function fetchONUData() {
  const url = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';
  const response = await axios.get(url);
  return response.data;
}

async function parseXML(xmlData) {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);
  return result;
}

async function saveToMongo(docs) {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  await collection.deleteMany({ fuente: 'ONU' });

  const res = await collection.insertMany(docs);
  console.log(`Insertados ${res.insertedCount} documentos de ONU.`);

  await client.close();
}

function transformEntry(individual) {
  return {
    fuente: 'ONU',
    dataId: individual.DATAID?.[0] || null,
    versionNum: individual.VERSIONNUM?.[0] || null,
    nombre: `${individual.FIRST_NAME?.[0] || ''} ${individual.SECOND_NAME?.[0] || ''}`.trim(),
    unListType: individual.UN_LIST_TYPE?.[0] || null,
    referencia: individual.REFERENCE_NUMBER?.[0] || null,
    listadoEl: individual.LISTED_ON?.[0] || null,
    genero: individual.GENDER?.[0] || null,
    comentarios: individual.COMMENTS1?.[0] || null,
    nacionalidad: individual.NATIONALITY?.[0]?.VALUE?.[0] || null,
    listType: individual.LIST_TYPE?.[0]?.VALUE?.[0] || null,
    fechaActualizacion: individual.LAST_DAY_UPDATED?.[0]?.VALUE?.[0] || null,
    alias: individual.INDIVIDUAL_ALIAS
      ? individual.INDIVIDUAL_ALIAS.map(a => a.ALIAS_NAME?.[0]).filter(Boolean)
      : [],
    direccion: individual.INDIVIDUAL_ADDRESS
      ? individual.INDIVIDUAL_ADDRESS.map(addr => ({
          ciudad: addr.CITY?.[0] || null,
          estadoProvincia: addr.STATE_PROVINCE?.[0] || null,
          pais: addr.COUNTRY?.[0] || null,
          nota: addr.NOTE?.[0] || null,
        }))
      : [],
    fechaNacimiento: individual.INDIVIDUAL_DATE_OF_BIRTH
      ? individual.INDIVIDUAL_DATE_OF_BIRTH.map(dob => ({
          tipoFecha: dob.TYPE_OF_DATE?.[0] || null,
          año: dob.YEAR?.[0] || null,
        }))
      : [],
    lugarNacimiento: individual.INDIVIDUAL_PLACE_OF_BIRTH
      ? individual.INDIVIDUAL_PLACE_OF_BIRTH.map(pob => ({
          ciudad: pob.CITY?.[0] || null,
          estadoProvincia: pob.STATE_PROVINCE?.[0] || null,
          pais: pob.COUNTRY?.[0] || null,
        }))
      : [],
  };
}

async function main() {
  try {
    const xmlData = await fetchONUData();
    const parsed = await parseXML(xmlData);

    const individuals = parsed.CONSOLIDATED_LIST.INDIVIDUALS?.[0]?.INDIVIDUAL || [];

    const docs = individuals.map(transformEntry);

    await saveToMongo(docs);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();


(async () => {
  const cliente = new MongoClient(MONGO_URI);
  await cliente.connect();
  const db = cliente.db(DB_NAME);
  const coleccion = db.collection(COLLECTION_NAME);

  const browser = await chromium.launch({ headless: false }); 
  const page = await browser.newPage();

  const urlNegra = 'https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions/Call-for-action-june-2025.html';
  await page.goto(urlNegra, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const h3s = Array.from(document.querySelectorAll('h3'));
    return h3s.some(h3 => h3.textContent.includes('Democratic'));
  }, { timeout: 15000 });

  const dataNegra = await page.evaluate(() => {
    const h3Elements = Array.from(document.querySelectorAll('h3'));
    const results = [];

    for (let h3 of h3Elements) {
      const country = h3.textContent.trim();
      if (country.toLowerCase().includes('related')) continue;
      let description = '';
      let next = h3.nextElementSibling;

      while (next && next.tagName !== 'H3') {
        description += next.innerText.trim() + '\n';
        next = next.nextElementSibling;
      }

      results.push({ titulo: country, parrafo: description.trim(), fuente: 'gafi', lista: 'negra' });
    }

    return results;
  });

  await coleccion.deleteMany({ fuente: 'gafi', lista: 'negra' });
  const resNegra = await coleccion.insertMany(dataNegra);
  console.log(`Insertados ${resNegra.insertedCount} documentos de lista negra GAFI.`);

  await browser.close();

  const browser2 = await chromium.launch({ headless: false });
  const page2 = await browser2.newPage();

  const urlGris = 'https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions/increased-monitoring-june-2025.html';
  await page2.goto(urlGris, { waitUntil: 'domcontentloaded' });

  await page2.waitForSelector('h3:has-text("Bulgaria")', { timeout: 10000 });

  const dataGris = await page2.evaluate(() => {
    const data = [];
    const h3Elements = Array.from(document.querySelectorAll('h3'));

    for (let i = 0; i < h3Elements.length; i++) {
      const h3 = h3Elements[i];
      const name = h3.textContent.trim();

      if (name.toLowerCase() === 'related materials') break;

      const paragraphs = [];

      let el = h3.parentElement.parentElement.nextElementSibling;
      while (el && !el.querySelector('h3')) {
        const cmpTextDiv = el.querySelector('.cmp-text');
        if (cmpTextDiv) {
          const ps = cmpTextDiv.querySelectorAll('p');
          ps.forEach(p => {
            const txt = p.textContent.trim();
            if (txt && txt !== '\u00A0') paragraphs.push(txt);
          });
          break;
        }
        el = el.nextElementSibling;
      }

      data.push({
        titulo: name,
        parrafo: paragraphs.join('\n\n'),
        fuente: 'gafi',
        lista: 'gris'
      });
    }

    return data;
  });

  await coleccion.deleteMany({ fuente: 'gafi', lista: 'gris' });
  const resGris = await coleccion.insertMany(dataGris);
  console.log(`Insertados ${resGris.insertedCount} documentos de lista gris GAFI.`);

  await browser2.close();

  await cliente.close();
})();


(async () => {
  const cliente = new MongoClient(MONGO_URI);
  await cliente.connect();
  const db = cliente.db(DB_NAME);
  const coleccion = db.collection(COLLECTION_NAME);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.interpol.int/es/Como-trabajamos/Notificaciones/Notificaciones-rojas/Ver-las-notificaciones-rojas', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForSelector('.redNoticesList__item.notice_red');

  const maxPages = 8;
  const allNotices = [];

  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    const notices = await page.$$eval('.redNoticesList__item.notice_red', items =>
      items.map(item => ({
        nombre: item.querySelector('.redNoticeItem__labelLink')?.innerText.trim().replace(/\n/g, ' ') || null,
        edad: item.querySelector('.ageCount')?.innerText.trim() || null,
        nacionalidad: item.querySelector('.nationalities')?.innerText.trim() || null,
        fuente: 'interpol'
      }))
    );

    allNotices.push(...notices);

    if (currentPage === maxPages) break;

    const firstNoticeName = notices.length > 0 ? notices[0].nombre : null;

    await Promise.all([
      page.click('a.nextIndex.right-arrow'),
      page.waitForFunction(
        (name) => {
          const firstItem = document.querySelector('.redNoticesList__item.notice_red .redNoticeItem__labelLink');
          return firstItem && firstItem.innerText.trim() !== name;
        },
        firstNoticeName,
        { timeout: 10000 }
      ),
    ]);
  }

  await browser.close();

  const del = await coleccion.deleteMany({ fuente: 'interpol' });
  console.log(`Eliminados ${del.deletedCount} documentos antiguos de Interpol.`);

  const res = await coleccion.insertMany(allNotices);
  console.log(`Insertados ${res.insertedCount} documentos nuevos de Interpol.`);

  await cliente.close();
})();
