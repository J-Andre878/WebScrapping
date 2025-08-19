import express from 'express'
import { validateCedula, validateRuc, validateCedulaOrRuc, validateSearchParams } from '../Middleware/validation.js'

// Importar controllers
import { consultarCertificadoIESS } from '../Controllers/certificadosIESS.js'
import { consultarCitacionesANT } from '../Controllers/citacionesANT.js'
import { consultarCitacionesJudiciales } from '../Controllers/citacionJudicial.js'
import { consultarConsejoJudicatura } from '../Controllers/consejoJudicatura.js'
import { consultarSRI } from '../Controllers/consultaSRI.js'
import { consultarImpedimentos } from '../Controllers/impedimentosCargosPublicos.js'
import { consultarPensionAlimenticia } from '../Controllers/pensionAlimenticia.js'
import { consultarProcesosJudiciales } from '../Controllers/procesosJudiciales.js'
import { consultarSenescyt } from '../Controllers/senescyt.js'
import { consultarSRIDeudas } from '../Controllers/sriDeudas.js'
import { consultarSuperciasEmpresas } from '../Controllers/superCias.js'
import { consultarInterpol } from "../Controllers/interpol.js"
import { consultarAntecedentesPenales } from '../Controllers/antecedentesPenales.js'


const router = express.Router()

// Rutas con validación y controllers
router.post('/certificado-iess', validateCedula, consultarCertificadoIESS)
router.post('/citaciones-ant', validateCedula, consultarCitacionesANT)
router.post('/citaciones-judiciales', validateCedula, consultarCitacionesJudiciales)
router.post('/consejo-judicatura', validateSearchParams, consultarConsejoJudicatura)
router.post('/consulta-sri', validateRuc, consultarSRI)
router.post('/impedimentos-cargos-publicos', consultarImpedimentos)
router.post('/pension-alimenticia', validateCedula, consultarPensionAlimenticia)
router.post('/procesos-judiciales', validateCedula, consultarProcesosJudiciales)
router.post('/senescyt', validateCedula, consultarSenescyt)
router.post('/sri-deudas', validateCedulaOrRuc, consultarSRIDeudas)
router.post('/supercias-empresas', validateCedulaOrRuc, consultarSuperciasEmpresas)
router.post('/antecedentes-penales', validateCedula, consultarAntecedentesPenales)
router.post('/interpol', consultarInterpol)

// Ruta de estado de la API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API de Web Scraping funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

// Ruta para obtener todas las colecciones disponibles
router.get('/collections', (req, res) => {
  res.json({
    success: true,
    collections: [
      'certificados-iess',
      'citaciones-ant',
      'citaciones-judiciales',
      'consejo-judicatura',
      'consulta-sri',
      'sri-deudas',
      'supercias-empresas',
      'impedimentos-cargos-publicos',
      'pension-alimenticia',
      'procesos-judiciales',
      'senescyt',
      'interpol',
      'antecedentes-penales'
    ]
  })
})

export default router