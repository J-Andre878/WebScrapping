import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb://localhost:27017';

(async () => {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('webScraping');
  const coleccion = db.collection('sri_deudas');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://srienlinea.sri.gob.ec/sri-en-linea/SriPagosWeb/ConsultaDeudasFirmesImpugnadas/Consultas/consultaDeudasFirmesImpugnadas', {
    waitUntil: 'domcontentloaded'
  });

  const ruc = '1713449831001';
  await page.waitForSelector('#busquedaRucId', { timeout: 0 });
  await page.fill('#busquedaRucId', ruc);
  await page.click('.ui-button-secondary');

  await page.waitForSelector('span.titulo-consultas-1.tamano-defecto-campos', { timeout: 0 });

  const rucObtenida = await page.textContent('text=RUC / cédula >> xpath=../../..//span');
  const fechaCorte = await page.textContent('text=Fecha de corte >> xpath=../../..//span');
  const razonSocial = await page.textContent('text=Razón social / Apellidos y nombres >> xpath=../../..//span');

  let estadoDeuda = 'NO DETERMINADO';
  const mensajeDeuda = await page.locator('.tamano-ya-pago span').first();
  if (await mensajeDeuda.count()) {
    estadoDeuda = await mensajeDeuda.textContent();
  }

  console.log('\n RESULTADOS:');
  console.log(`RUC: ${ruc.trim()}`);
  console.log(`Fecha de corte: ${fechaCorte.trim()}`);
  console.log(`Razón social: ${razonSocial.trim()}`);
  console.log(`Estado de deuda: ${estadoDeuda.trim()}`);

  const resultado = await coleccion.updateOne(
    { ruc: ruc.trim() },
    { $set: {
        rucObtenida: rucObtenida.trim(),
        fechaCorte: fechaCorte.trim(),
        razonSocial: razonSocial.trim(),
        estadoDeuda: estadoDeuda.trim(),
        fechaConsulta: new Date()
      }
    },
    { upsert: true }
  );

  if (resultado.upsertedId) {
    console.log('Documento insertado con _id:', resultado.upsertedId._id);
  } else if (resultado.matchedCount > 0) {
    console.log('Documento actualizado');
  } else {
    console.log('No se insertó ni actualizó ningún documento');
  }

  await browser.close();
  await client.close();
})();

