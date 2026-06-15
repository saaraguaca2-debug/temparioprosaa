import express from "express";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const SEARCHES_FILE = path.join(process.cwd(), "reparaciones_solicitadas.json");

// In-memory store to prevent crashes on stateless, read-only filesystems like Vercel
let memorySearches: any[] | null = null;
let memoryConfig: any = null;

// Helper to seed search history with professional entries if it doesn't exist
async function initDatabase() {
  if (memorySearches) {
    return;
  }
  try {
    const data = await fs.readFile(SEARCHES_FILE, "utf-8");
    memorySearches = JSON.parse(data);
  } catch {
    const seedData = [
      {
        id: "seed-1",
        fecha: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        usuario: "Carlos Mendoza",
        vehiculo: "Toyota Hilux 2020 2.4 TD",
        consulta: "Cambio de pastillas de freno delanteras y rectificación de discos",
        resultado: {
          vehiculo: "Toyota Hilux 2020 2.4 TD",
          reparacion: "Cambio de pastillas de freno delanteras y rectificación de discos",
          tiempoMinimo: 1.5,
          tiempoMaximo: 2.2,
          pasos: [
            { paso: "Elevación del vehículo, desmontaje de ruedas delanteras e inspección visual", duracionMin: 0.2, duracionMax: 0.3 },
            { paso: "Desmontaje de mordazas (calipers) de freno y extracción de pastillas desgastadas", duracionMin: 0.3, duracionMax: 0.4 },
            { paso: "Remoción de discos de freno delanteros para su montaje en torno rectificador", duracionMin: 0.5, duracionMax: 0.7 },
            { paso: "Rectificación de discos de freno (garantizar superficie plana y sin vicios)", duracionMin: 0.3, duracionMax: 0.4 },
            { paso: "Montaje de discos rectificados, instalación de pastillas nuevas con grasa cerámica antiruido", duracionMin: 0.2, duracionMax: 0.4 },
            { paso: "Retracción de pistón, ensamble final, purga preventiva, montaje de ruedas y prueba rodada", duracionMin: 0.2, duracionMax: 0.3 }
          ],
          consejos: [
            "Use grasa lubricante de silicona o cerámica en los puntos de contacto metal-metal de las pastillas.",
            "Compruebe el nivel del líquido de frenos en el depósito tras empujar el pistón de la mordaza.",
            "Asiente las pastillas nuevas frenando suavemente durante los primeros 100-200 km."
          ],
          explicacionSencilla: "Servicio preventivo y correctivo directo en el eje delantero. La rectificación de discos elimina vibración al frenar a altas velocidades y restaura la potencia de frenado original del vehículo."
        }
      },
      {
        id: "seed-2",
        fecha: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        usuario: "Mariana Rojas",
        vehiculo: "Hyundai Accent 2017 1.6L",
        consulta: "Reemplazo de kit de distribución / banda de tiempo",
        resultado: {
          vehiculo: "Hyundai Accent 2017 1.6L",
          reparacion: "Reemplazo de correa/banda de distribución y poleas tensoras",
          tiempoMinimo: 3.0,
          tiempoMaximo: 4.5,
          pasos: [
            { paso: "Drenado parcial de refrigerante y desmontaje de accesorios delanteros (bandas, soportes del motor)", duracionMin: 0.6, duracionMax: 0.9 },
            { paso: "Remoción de cubiertas plásticas de distribución para acceder a poleas y engranajes", duracionMin: 0.4, duracionMax: 0.6 },
            { paso: "Sincronización del motor (alineación estricta de marcas de tiempo PMS en cigüeñal y árbol de levas)", duracionMin: 0.5, duracionMax: 0.8 },
            { paso: "Aflojado de tensor, desmontaje de correa vieja, rodillos guía and tensor", duracionMin: 0.4, duracionMax: 0.6 },
            { paso: "Instalación de kit nuevo (correa, poleas y tensor) ajustando a par de torque especificado", duracionMin: 0.6, duracionMax: 0.8 },
            { paso: "Giros manuales preventivos del cigüeñal (2 vueltas completas) para asegurar sincronía libre de colisión", duracionMin: 0.2, duracionMax: 0.3 },
            { paso: "Ensamblaje final de cubiertas, soportes de motor, bandas externas y recarga de refrigerante", duracionMin: 0.3, duracionMax: 0.5 }
          ],
          consejos: [
            "Se recomienda enérgicamente cambiar la bomba de agua simultáneamente si es accionada por la misma correa.",
            "La tensión incorrecta puede provocar fallas catastróficas en válvulas si se salta un diente de tiempo.",
            "Use herramientas de bloqueo de engranajes de árbol de levas dedicadas."
          ],
          explicacionSencilla: "Intervención de mediana a alta complejidad técnica. La banda de tiempo evita que los pistones y las válvulas del motor colisionen. Un reemplazo a tiempo previene daños graves al motor."
        }
      },
      {
        id: "seed-3",
        fecha: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        usuario: "Edgar Ramírez",
        vehiculo: "Chevrolet Spark 2015 1.2L",
        consulta: "Cambio de embrague manual / kit de clutch",
        resultado: {
          vehiculo: "Chevrolet Spark 2015 1.2L",
          reparacion: "Cambio de Kit de Embrague Completo (Disco, Prensa y Balero de Empuje)",
          tiempoMinimo: 4.0,
          tiempoMaximo: 5.5,
          pasos: [
            { paso: "Desconexión de batería, retiro de caja de aire, cables selectores y sensores superiores de la caja de cambios", duracionMin: 0.5, duracionMax: 0.8 },
            { paso: "Elevación segura, desmontaje de ruedas delanteras, desconexión de rótulas, flechas homocinéticas (semiejes) y drenado de aceite de transmisión", duracionMin: 1.0, duracionMax: 1.3 },
            { paso: "Soporte preventivo del motor e instalación de puente de motor, retiro de soportes de caja de transmisión", duracionMin: 0.5, duracionMax: 0.7 },
            { paso: "Aflojado de tornillería periférica y desmontaje físico de la caja de velocidades de la campana del motor", duracionMin: 0.8, duracionMax: 1.0 },
            { paso: "Retirar embrague dañado, inspeccionar/limpiar volante inercial y montar kit nuevo centrándolo estrictamente", duracionMin: 0.4, duracionMax: 0.6 },
            { paso: "Reemplazo de collarín/balero de empuje e inspección de horquilla en campana de caja", duracionMin: 0.2, duracionMax: 0.3 },
            { paso: "Alineación de caja de cambios, ensamble al bloque motor, instalación de soportes, flechas y llenado con aceite nuevo", duracionMin: 0.6, duracionMax: 0.8 }
          ],
          consejos: [
            "No toque la cara de fricción del disco nuevo con las manos grasas durante la manipulación.",
            "Asegúrese de engrasar ligeramente el estriado de la flecha de mando pero sin excederse.",
            "Es altamente recomendable rectificar el volante inercial si muestra huellas de sobrecalentamiento o surcos profundos."
          ],
          explicacionSencilla: "Servicio mayor que requiere separar la transmisión del motor. Es indispensable para recuperar la tracción y cambios de velocidad suaves."
        }
      }
    ];
    try {
      await fs.writeFile(SEARCHES_FILE, JSON.stringify(seedData, null, 2), "utf-8");
    } catch {
      console.warn("No se pudo escribir reparaciones_solicitadas.json (solo lectura en Vercel). Usando en memoria.");
    }
    memorySearches = seedData;
  }
}

// Lazy initialization of Gemini client
let _ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY no configurado. Asegúrate de añadirlo en el panel de Secrets.");
    }
    _ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _ai;
}

// Get repair searches
const CONFIG_FILE = path.join(process.cwd(), "config_taller.json");

async function loadConfig() {
  if (memoryConfig) {
    return memoryConfig;
  }
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    memoryConfig = JSON.parse(data);
    return memoryConfig;
  } catch {
    const defaultConfig = {
      appsScriptUrl: "",
      adminPasscode: "saaraguaca2"
    };
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
    } catch {
      console.warn("No se pudo escribir config_taller.json (solo lectura en Vercel). Usando en memoria.");
    }
    memoryConfig = defaultConfig;
    return memoryConfig;
  }
}

// Get Apps Script URL from env or saved configuration file
async function getAppsScriptUrl(): Promise<string> {
  const envUrl = process.env.APPS_SCRIPT_URL;
  if (envUrl && envUrl.trim().startsWith("http")) {
    return envUrl.trim();
  }
  try {
    const config = await loadConfig();
    return (config.appsScriptUrl || "").trim();
  } catch {
    return "";
  }
}

// 1. Endpoint to retrieve configuration status securely
app.get("/api/config-status", async (req, res) => {
  try {
    const url = await getAppsScriptUrl();
    const isConfigured = !!(url && url.startsWith("http"));
    return res.json({ configured: isConfigured, url: url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Endpoint to save the Google Apps Script URL with password protection
app.post("/api/config-save", async (req, res) => {
  const { passcode, appsScriptUrl } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: "Falta la contraseña de administrador." });
  }

  const normalizedPass = passcode.trim().toLowerCase();
  if (normalizedPass !== "saaraguaca2" && normalizedPass !== "saaraguaca2@gmail.com" && normalizedPass !== "saaraguaca") {
    return res.status(401).json({ error: "La contraseña ingresada no es válida. Acceso denegado." });
  }

  try {
    const config = await loadConfig();
    config.appsScriptUrl = (appsScriptUrl || "").trim();
    memoryConfig = config;
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    } catch {
      console.warn("No se pudo escribir CONFIG_FILE (solo lectura en Vercel). Configuración persistida en memoria.");
    }
    return res.json({ success: true, message: "¡Configuración guardada y enrutada de forma segura!" });
  } catch (err: any) {
    return res.status(500).json({ error: "No se pudo guardar la configuración: " + err.message });
  }
});

app.get("/api/searches", async (req, res) => {
  try {
    await initDatabase();
    const appsScriptUrl = await getAppsScriptUrl();

    // 1. Load local JSON searches first as baseline/fallback from memory
    let searches = memorySearches || [];

    // 2. If an Apps Script Web App URL is provided, fetch live rows directly from Google Sheets
    if (appsScriptUrl && appsScriptUrl.trim().startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5 seconds timeout

        const response = await fetch(appsScriptUrl.trim(), {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const sheetRows: any = await response.json();
          if (Array.isArray(sheetRows)) {
            // Convert google sheet rows back into standard UI records
            const mappedRows = sheetRows.map((row: any, idx: number) => {
              const minTime = parseFloat(row.tiempoMinimo) || 1.0;
              const maxTime = parseFloat(row.tiempoMaximo) || 2.0;
              return {
                id: `sheet-${idx}-${Date.now()}`,
                fecha: row.fecha || new Date().toISOString(),
                usuario: row.usuario || "Mecánico",
                vehiculo: row.vehiculo || "Vehículo no especificado",
                consulta: row.consulta || "Servicio requerido",
                resultado: {
                  vehiculo: row.vehiculo || "Vehículo no especificado",
                  reparacion: row.reparacion || row.consulta || "Reparación General",
                  tiempoMinimo: minTime,
                  tiempoMaximo: maxTime,
                  pasos: [
                    { paso: "Preparación del puesto de trabajo, desmontaje e inspección preventiva", duracionMin: Math.max(0.2, Number((minTime * 0.2).toFixed(1))), duracionMax: Math.max(0.3, Number((maxTime * 0.2).toFixed(1))) },
                    { paso: "Ejecución principal de la reparación mecánica especializada", duracionMin: Math.max(0.5, Number((minTime * 0.6).toFixed(1))), duracionMax: Math.max(0.8, Number((maxTime * 0.6).toFixed(1))) },
                    { paso: "Reensamblado, pruebas de rodaje activo y control de calidad", duracionMin: Math.max(0.3, Number((minTime * 0.2).toFixed(1))), duracionMax: Math.max(0.4, Number((maxTime * 0.2).toFixed(1))) }
                  ],
                  consejos: [
                    "Evite usar herramientas neumáticas de impacto excesivo en cuerdas de aleación.",
                    "Verifique el estado físico de los retenes o juntas adyacentes al desarmar.",
                    "Siga los coeficientes de torque de fábrica indicados por el manual oficial."
                  ],
                  explicacionSencilla: row.explicacion || "Estimación técnica sincronizada de forma segura en tiempo real con Google Sheets."
                },
                sincronizadoSheets: true
              };
            });

            // We reverse the array so the latest entries added to the Google Sheet show first
            return res.json(mappedRows.reverse());
          }
        }
      } catch (sheetsErr) {
        console.error("No se pudo obtener datos en tiempo real de Google Sheets, usando base de datos local:", sheetsErr);
      }
    }

    // Return local database safely if Sheets configuration is omitted or fails (No Blocking 403!)
    return res.json(searches);
  } catch (error: any) {
    return res.status(500).json({ error: "No se pudieron recuperar las búsquedas: " + error.message });
  }
});

// Clear searches (reset, if desired)
app.post("/api/searches/reset", async (req, res) => {
  try {
    await fs.unlink(SEARCHES_FILE).catch(() => {});
    memorySearches = null;
    await initDatabase();
    return res.json(memorySearches || []);
  } catch (error: any) {
    return res.status(500).json({ error: "Error restableciendo: " + error.message });
  }
});

// Clear ALL searches completely (writes empty array)
app.post("/api/searches/clear", async (req, res) => {
  try {
    memorySearches = [];
    try {
      await fs.writeFile(SEARCHES_FILE, "[]", "utf-8");
    } catch {
      console.warn("No se pudo escribir el vaciado en disco (solo lectura). Reseteado en memoria.");
    }
    return res.json([]);
  } catch (error: any) {
    return res.status(500).json({ error: "Error al borrar el historial: " + error.message });
  }
});

// Delete a single search from local history
app.delete("/api/searches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await initDatabase();
    memorySearches = (memorySearches || []).filter((s: any) => s.id !== id);
    try {
      await fs.writeFile(SEARCHES_FILE, JSON.stringify(memorySearches, null, 2), "utf-8");
    } catch {
      console.warn("No se pudo eliminar en disco (solo lectura). Eliminado de memoria.");
    }
    return res.json({ success: true, filteredCount: (memorySearches || []).length });
  } catch (error: any) {
    return res.status(500).json({ error: "Error al eliminar registro: " + error.message });
  }
});

// Query Gemini and archive search
app.post("/api/searches", async (req, res) => {
  const { usuario, vehiculo, consulta } = req.body;

  if (!usuario || !vehiculo || !consulta) {
    return res.status(400).json({ error: "Faltan datos requeridos (usuario, vehiculo o consulta)." });
  }

  try {
    await initDatabase();
    const appsScriptUrl = await getAppsScriptUrl();

    const ai = getGeminiClient();

    const systemInstruction = `Eres un experto cotizador de mano de obra y tempario automotriz profesional con décadas de experiencia en talleres mecánicos oficiales y multimarca.
    Tu objetivo es brindar estimaciones precisas y realistas de tiempos de reparación (flat rates o baremos de tiempo) expresados estrictamente en horas.
    Debes retornar un objeto JSON estructurado que detalle el tiempo mínimo total, tiempo máximo total, un desglose paso a paso lógico de la reparación con sus duraciones parciales estimadas, consejos técnicos específicos y una explicación sencilla.
    Sé realista considerando el vehículo especificado en la consulta. Los nombres de pasos técnicos deben ser técnicos pero inteligibles en español.`;

    const userPrompt = `Vehículo especificado: ${vehiculo}
    Reparación o servicio a consultar: ${consulta}
    Usuario solicitante: ${usuario}

    Por favor, proporciona el tempario de tiempos estimados detallado de la reparación para este vehículo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vehiculo: { type: Type.STRING, description: "Vehículo analizado con marca, modelo y año normalizados" },
            reparacion: { type: Type.STRING, description: "Nombre formal de la reparación consultada" },
            tiempoMinimo: { type: Type.NUMBER, description: "Tiempo total mínimo sugerido en horas (ej: 1.5)" },
            tiempoMaximo: { type: Type.NUMBER, description: "Tiempo total máximo sugerido en horas (ej: 2.2)" },
            pasos: {
              type: Type.ARRAY,
              description: "Lista ordenada de pasos necesarios para realizar la reparación",
              items: {
                type: Type.OBJECT,
                properties: {
                  paso: { type: Type.STRING, description: "Nombre y descripción del paso" },
                  duracionMin: { type: Type.NUMBER, description: "Tiempo mínimo estimado para el paso en horas (decimales válidos)" },
                  duracionMax: { type: Type.NUMBER, description: "Tiempo máximo estimado para el paso en horas (decimales válidos)" }
                },
                required: ["paso", "duracionMin", "duracionMax"]
              }
            },
            consejos: {
              type: Type.ARRAY,
              description: "Tres o cuatro consejos técnicos oficiales específicos de este coche o reparación",
              items: { type: Type.STRING }
            },
            explicacionSencilla: { type: Type.STRING, description: "Explicación breve y amigable sobre por qué requiere esta cantidad de tiempo y grado de dificultad" }
          },
          required: ["vehiculo", "reparacion", "tiempoMinimo", "tiempoMaximo", "pasos", "consejos", "explicacionSencilla"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No se recibió respuesta válida del modelo de IA.");
    }

    const geminiResult = JSON.parse(textOutput.trim());

    // Load existing searches from cache
    const searches = memorySearches || [];

    // Create new search record
    interface SearchRecord {
      id: string;
      fecha: string;
      usuario: string;
      vehiculo: string;
      consulta: string;
      resultado: any;
      sincronizadoSheets?: boolean;
      errorSincronizacion?: string;
      _notSavedInHistory?: boolean;
    }

    const newSearch: SearchRecord = {
      id: "search-" + Date.now(),
      fecha: new Date().toISOString(),
      usuario,
      vehiculo,
      consulta,
      resultado: geminiResult
    };

    let shouldSaveLocal = true;

    // Forward to Google Apps Script Web App optionally
    if (appsScriptUrl && appsScriptUrl.trim().startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const forwardResp = await fetch(appsScriptUrl.trim(), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script handles text/plain best for CORS postData
          body: JSON.stringify(newSearch),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (forwardResp.ok) {
          const respData: any = await forwardResp.json().catch(() => ({}));
          if (respData.saved === false) {
            newSearch.sincronizadoSheets = false;
            newSearch.errorSincronizacion = "No guardado: Usuario no autorizado";
            newSearch._notSavedInHistory = true;
            shouldSaveLocal = false;
          } else {
            newSearch.sincronizadoSheets = true;
          }
        } else {
          newSearch.sincronizadoSheets = false;
          newSearch.errorSincronizacion = `Status code: ${forwardResp.status}`;
        }
      } catch (err: any) {
        console.error("Apps Script synchronization failed:", err);
        newSearch.sincronizadoSheets = false;
        newSearch.errorSincronizacion = err.message || "Timeout de conexión externa";
      }
    } else {
      newSearch.sincronizadoSheets = false;
      newSearch.errorSincronizacion = "Uso libre: No conectado a Google Sheet";
    }

    // Prepend to show latest first ONLY if authorized/shouldSaveLocal is true
    if (shouldSaveLocal) {
      searches.unshift(newSearch);
      memorySearches = searches;
      try {
        await fs.writeFile(SEARCHES_FILE, JSON.stringify(searches, null, 2), "utf-8");
      } catch {
        console.warn("No se pudo escribir reparaciones_solicitadas.json (solo lectura en Vercel). Conservando en memoria.");
      }
    }

    return res.json(newSearch);
  } catch (error: any) {
    console.error("Error en estimación:", error);
    return res.status(500).json({ error: error.message || "Error interno llamando a la IA." });
  }
});


// Start server and handle Vite middleware
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app as default for Vercel Serverless environment
export default app;

// Only start the local server if we are not running under Vercel Serverless
if (!process.env.VERCEL) {
  startServer();
}

