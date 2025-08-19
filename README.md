# Web-Scrapping - Node.js + Plauywright + React + MongoDB
Proyecto que realiza Web scrapping de paginas como la senecyt, SUPA, Sercop, etc.

## Requisitos
-Node.js (version +20.16.0)
-npm
-MongoDB

## Instalación
1. Clonar el repositorio de github: https://github.com/J-Andre878/webScrapping.git

2. Intalar dependecias desde el Backend

ruta: webScraping/Backend
npm install

3. Levantar servicios docker del frontend

ruta: raiz del proyecto (Web Scraping)
docker-compose build
docker-compose up -d

## Configuracion de variable de entorno
En la carpeta Backend editar el archivo `.env` si es necesario
Contenido actual:
MONGODB_URI=mongodb://localhost:27017
DB_NAME=webScraping
PORT=3000

##Scraper disponibles sin ventana emergente
  -Citaciones ANT
  -Citacion juficial
  -Consejo de la Judicatura
  -Impedimentos cargos públicos
  -Pensión Alimenticia
  -Senescyt
  -Superintendencias de Compañias (superCias)

##Scraper disponibles con ventana emergente
  -Certificados IESS
  -Consulta SRI
  -Procesos Judiciales
  -Antecedentes Penales
  -Interpol
  -Deudas SRI
