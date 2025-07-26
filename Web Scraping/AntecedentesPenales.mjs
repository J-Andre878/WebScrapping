import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';

(async () => {
  const cedula = '1102961867';
  const mongoUri = 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('webScraping');
  const collection = db.collection('antecedentes_penales');

  const browserVisible = await chromium.launch({ headless: false });
  const contextVisible = await browserVisible.newContext();
  const pageVisible = await contextVisible.newPage();

  await pageVisible.goto('https://certificados.ministeriodelinterior.gob.ec/gestorcertificados/antecedentes/', {
    waitUntil: 'domcontentloaded'
  });
  await pageVisible.waitForSelector('.cc-btn.cc-dismiss', { timeout: 0 });

  await pageVisible.click('.cc-btn.cc-dismiss');

  const storage = await contextVisible.storageState();
  await browserVisible.close();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storage });
  const page = await context.newPage();

  await page.goto('https://certificados.ministeriodelinterior.gob.ec/gestorcertificados/antecedentes/', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForSelector('button.ui-button-text-only >> text=Aceptar', { timeout: 10000 });
  await page.click('button.ui-button-text-only >> text=Aceptar');

  await page.waitForSelector('#txtCi', { visible: false });
  await page.fill('#txtCi', cedula);
  await page.click('#btnSig1');

  await page.waitForSelector('#txtMotivo', { timeout: 30000 });
  await page.fill('#txtMotivo', 'Consulta Personal');
  await page.waitForSelector('#btnSig2', { timeout: 20000 });
  await page.click('#btnSig2');

  await page.waitForSelector('#dvAntecedent1', { timeout: 20000 });

  const resultado = await page.textContent('#dvAntecedent1');
  const nombre = await page.textContent('#dvName1');

  const resultadoFormateado = resultado.trim().toUpperCase() === 'NO'
    ? 'No tiene antecedentes penales'
    : 'Tiene antecedentes penales';

  console.log(resultadoFormateado);
  console.log(`Nombre: ${nombre.trim()}`);
  console.log(`Número documento: ${cedula}`);

  const resultadoDB = await collection.updateOne(
    { cedula: cedula },
    {
      $set: {
        nombre: nombre.trim(),
        resultado: resultadoFormateado
      }
    },
    { upsert: true }
  );

  if (resultadoDB.upsertedCount > 0) {
    console.log('Persona insertada en la base de datos.');
  } else if (resultadoDB.modifiedCount > 0) {
    console.log('Datos actualizados en la base de datos.');
  } 

  await browser.close();
  await client.close(); 
})();
