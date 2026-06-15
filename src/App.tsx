import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Car, 
  Clock, 
  Search, 
  User, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  ListTodo,
  Info,
  Layers,
  CheckSquare,
  Square,
  BookmarkCheck,
  Fuel,
  FileSpreadsheet,
  Copy,
  Check,
  Settings,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RegistroConsulta, ResultadoTempario } from "./types";

export default function App() {
  // Inputs
  const [usuario, setUsuario] = useState(() => {
    return localStorage.getItem("tempario_usuario") || "";
  });
  const [vehiculo, setVehiculo] = useState("");
  const [consulta, setConsulta] = useState("");
  const [precioHora, setPrecioHora] = useState(() => {
    const saved = localStorage.getItem("tempario_precio_hora");
    return saved ? parseFloat(saved) : 45.0;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeAdminPass, setActiveAdminPass] = useState("");

  // Server config protection states
  const [isServerConfigured, setIsServerConfigured] = useState<boolean | null>(null);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [configUrl, setConfigUrl] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Data States
  const [historial, setHistorial] = useState<RegistroConsulta[]>([]);
  const [activeSearch, setActiveSearch] = useState<RegistroConsulta | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // UI States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"estimator" | "stats" | "sheets">("estimator");
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch configuration status and database history on load
  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setIsServerConfigured(data.configured);
        if (data.url) {
          setConfigUrl(data.url);
        }
      } else {
        setIsServerConfigured(false);
      }
    } catch (err) {
      console.error("Error al obtener estado de configuración:", err);
      setIsServerConfigured(false);
    }
  };

  useEffect(() => {
    fetchConfigStatus();
    fetchHistory();
  }, []);

  // Save persistent fields to localStorage
  useEffect(() => {
    localStorage.setItem("tempario_usuario", usuario);
  }, [usuario]);

  useEffect(() => {
    localStorage.setItem("tempario_precio_hora", precioHora.toString());
  }, [precioHora]);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/searches");
      if (!response.ok) {
        if (response.status === 403) {
          setIsServerConfigured(false);
        }
        throw new Error("No se pudo conectar con el servidor.");
      }
      const data = await response.json();
      setHistorial(data);
      // Automatically set the latest query as the active calculation on start so it doesn't look empty!
      if (data && data.length > 0 && !activeSearch) {
        setActiveSearch(data[0]);
        // Reset checklist
        setCheckedSteps({});
      }
    } catch (err: any) {
      console.error("Error cargando historial de la hoja centralizada:", err);
    }
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Está seguro de que desea eliminar esta cotización del historial local?")) return;
    try {
      const response = await fetch(`/api/searches/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        const updated = historial.filter(item => item.id !== id);
        setHistorial(updated);
        if (activeSearch?.id === id) {
          setActiveSearch(updated.length > 0 ? updated[0] : null);
        }
      } else {
        alert("Error al eliminar la cotización.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al eliminar.");
    }
  };

  const handleClearAllRecords = async () => {
    if (!confirm("⚠️ ADVERTENCIA: ¿Está seguro de que desea BORRAR TODO el historial de cotizaciones? Esta acción eliminará permanentemente la base de datos local del taller. No afectará a las filas reales registradas previamente en Google Sheets.")) return;
    try {
      const response = await fetch("/api/searches/clear", {
        method: "POST"
      });
      if (response.ok) {
        setHistorial([]);
        setActiveSearch(null);
        alert("¡Historial borrado por completo!");
      } else {
        alert("Error al borrar el historial.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al borrar historial.");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const pass = adminPasscode.trim().toLowerCase();
    if (pass === "saaraguaca2" || pass === "saaraguaca" || pass === "saaraguaca2@gmail.com") {
      setIsAdminLoggedIn(true);
      setActiveAdminPass(pass);
      setAdminPasscode("");
      setConfigError(null);
    } else {
      setConfigError("Contraseña de administrador incorrecta.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setActiveAdminPass("");
    setAdminPasscode("");
    setConfigError(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSuccessMsg(null);
    setLoadingConfig(true);

    if (!activeAdminPass.trim()) {
      setConfigError("La sesión de administrador no es válida. Vuelva a ingresar la contraseña.");
      setLoadingConfig(false);
      return;
    }
    if (!configUrl.trim() || !configUrl.trim().startsWith("http")) {
      setConfigError("Por favor, introduce una URL de Google Apps Script Web App válida.");
      setLoadingConfig(false);
      return;
    }

    try {
      const res = await fetch("/api/config-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: activeAdminPass, appsScriptUrl: configUrl })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSuccessMsg("¡Conexión y enrutamiento configurados perfectamente!");
        setIsServerConfigured(true);
        setAdminPasscode("");
      } else {
        setConfigError(data.error || "Código o contraseña no autorizados.");
      }
    } catch (err: any) {
      setConfigError("Error al guardar la configuración: " + (err.message || "Error de red"));
    } finally {
      setLoadingConfig(false);
    }
  };

  const handlePresetSelect = (presetVehiculo: string, presetConsulta: string) => {
    setVehiculo(presetVehiculo);
    setConsulta(presetConsulta);
    // Smooth scroll to form if needed
    const formElement = document.getElementById("search-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim()) {
      setError("Por favor ingresa tu nombre o identificación de mecánico.");
      return;
    }
    if (!vehiculo.trim()) {
      setError("Ingresa la marca, modelo y año del coche.");
      return;
    }
    if (!consulta.trim()) {
      setError("Escribe qué reparación automotriz deseas cotizar.");
      return;
    }

    setLoading(true);
    setError(null);

    // Dynamic progressive loading messages for the technician
    const steps = [
      "Extrayendo especificaciones del motor...",
      "Consultando base de datos técnica automotriz...",
      "Cotizando tiempos de mano de obra (baremos oficiales)...",
      "Modelando desglose de pasos secuenciales...",
      "Compilando advertencias y consejos de seguridad..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
      }
    }, 1500);

    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, vehiculo, consulta })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocurrió un error al estimar (¿Vínculo roto a Google Sheets?).");
      }

      const newRecord: RegistroConsulta = await response.json();
      
      // Add to local state (at top) ONLY if authorized and saved in database
      if (!newRecord._notSavedInHistory) {
        setHistorial(prev => [newRecord, ...prev]);
      } else {
        // We notify or indicate gracefully that it was processed as public/guest query
        // but we still let them view details
      }
      setActiveSearch(newRecord);
      setCheckedSteps({});
      setConsulta(""); // Clear query field
      
      // Force change tab to estimator to view active result
      setActiveTab("estimator");
      
      // Auto scroll to active results calculations
      setTimeout(() => {
        const statsHeader = document.getElementById("calculation-summary");
        if (statsHeader) {
          statsHeader.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);

    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || "No se pudo obtener el tempario de la IA.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("¿Deseas restablecer las búsquedas a los ejemplos por defecto del taller? Esto restaurará los registros originales.")) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/searches/reset", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setHistorial(data);
        if (data && data.length > 0) {
          setActiveSearch(data[0]);
        } else {
          setActiveSearch(null);
        }
        setCheckedSteps({});
        setError(null);
      }
    } catch (err) {
      setError("Error restableciendo registros base.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle step complete state
  const toggleStep = (stepText: string) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepText]: !prev[stepText]
    }));
  };

  // Calculate dynamic stats for "reparaciones más solicitadas"
  const getMostRequestedStats = () => {
    const categories: Record<string, number> = {
      "Sistema de Frenos": 0,
      "Distribución y Motor": 0,
      "Embrague y Tracción": 0,
      "Mantenimiento General / Fluidos": 0,
      "Sistema Eléctrico y Carga": 0,
      "Suspensión y Dirección": 0,
      "Otros Mecánicos": 0
    };

    historial.forEach(item => {
      const query = (item.consulta + " " + (item.resultado?.reparacion || "")).toLowerCase();
      
      if (query.includes("freno") || query.includes("balata") || query.includes("pastilla") || query.includes("disco")) {
        categories["Sistema de Frenos"]++;
      } else if (query.includes("distribucion") || query.includes("banda") || query.includes("tiempo") || query.includes("cadena") || query.includes("biela") || query.includes("pist") || query.includes("motor")) {
        categories["Distribución y Motor"]++;
      } else if (query.includes("clutch") || query.includes("embrague") || query.includes("caja") || query.includes("transmision") || query.includes("semieje") || query.includes("flecha")) {
        categories["Embrague y Tracción"]++;
      } else if (query.includes("aceite") || query.includes("afina") || query.includes("filtro") || query.includes("bujia") || query.includes("refrigerante") || query.includes("anticongelante")) {
        categories["Mantenimiento General / Fluidos"]++;
      } else if (query.includes("bomba") || query.includes("agua") || query.includes("radiador") || query.includes("enfria") || query.includes("termostato")) {
        // Enfriamiento fits neatly in Mantenimiento or Motor depending on keyword, but we'll prioritize
        categories["Distribución y Motor"]++;
      } else if (query.includes("alternador") || query.includes("marcha") || query.includes("arranque") || query.includes("bateria") || query.includes("corto") || query.includes("sens") || query.includes("bobina")) {
        categories["Sistema Eléctrico y Carga"]++;
      } else if (query.includes("amortiguador") || query.includes("suspension") || query.includes("direccion") || query.includes("rotula") || query.includes("brazo") || query.includes("buje")) {
        categories["Suspensión y Dirección"]++;
      } else {
        categories["Otros Mecánicos"]++;
      }
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);

    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        categoria: name,
        cantidad: count,
        porcentaje: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  };

  const stats = getMostRequestedStats();

  // Price calculations according to precioHora
  const activeResultado: ResultadoTempario | null = activeSearch ? activeSearch.resultado : null;
  const totalMinTime = activeResultado ? activeResultado.tiempoMinimo : 0;
  const totalMaxTime = activeResultado ? activeResultado.tiempoMaximo : 0;

  // Calculate accumulated values for price
  const costMin = totalMinTime * precioHora;
  const costMax = totalMaxTime * precioHora;

  // Preset quick vehicle ideas
  const presetRepairs = [
    { label: "Pastillas de Freno", v: "Toyota Corolla 2018", q: "Cambio de pastillas de freno delanteras" },
    { label: "Banda de Tiempo", v: "Chevrolet Aveo 2016 1.6L", q: "Reemplazo de banda de distribución" },
    { label: "Bomba de Agua", v: "Ford Ranger 2015 2.5L", q: "Cambio de bomba de agua y anticongelante" },
    { label: "Amortiguadores", v: "Honda Civic 2014", q: "Reemplazo de amortiguadores delanteros" },
    { label: "Clutch Completo", v: "Nissan Versa 2019", q: "Cambio de kit de clutch manual" }
  ];

  return (
    <div id="app-workspace" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between antialiased font-sans">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-800 border-b border-slate-700/80 sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Wrench className="w-5 h-5 text-slate-900 stroke-[2.5]" id="app-logo-wrench" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white leading-tight tracking-tight">TEMPARIO PRO</h1>
              <p className="text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">Tiempos Inteligentes IA</p>
            </div>
          </div>

          <div className="flex space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700/40">
            <button
              onClick={() => setActiveTab("estimator")}
              className={`text-[11.5px] px-2 py-1 rounded-md font-medium transition-all ${
                activeTab === "estimator"
                  ? "bg-amber-500 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-calculator"
            >
              Calculador
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`text-[11.5px] px-2 py-1 rounded-md font-medium transition-all ${
                activeTab === "stats"
                  ? "bg-amber-500 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-stats"
            >
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab("sheets")}
              className={`text-[11.5px] px-2 py-1 rounded-md font-medium transition-all ${
                activeTab === "sheets"
                  ? "bg-amber-500 text-slate-900 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-sheets"
            >
              Administrador ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* CORE CONTAINER: STYLED TO RESPOND TO SMARTPHONES BUT CENTERED BEAUTIFULLY */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4 pb-24">
            {/* SUMATORIA Y DESTAQUES ACCUMULATIVE HEADER ABOVE THE APP CARD ON ACTIVE ESTIMATE */}
            <AnimatePresence mode="popLayout">
              {activeResultado && activeTab === "estimator" && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-850 p-4 rounded-2xl shadow-xl border border-amber-500/30 space-y-4"
                  id="calculation-summary"
                >
                  {/* Resumen de tiempos acumulados */}
                  <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <div>
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">Vehículo de Trabajo</span>
                      <span className="text-sm font-semibold text-white flex items-center space-x-1.5 mt-0.5">
                        <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{activeResultado.vehiculo}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10.5px] font-mono tracking-wider text-amber-400 uppercase block font-semibold">Tiempos Acumulados</span>
                      <div className="text-white font-mono font-bold text-lg mt-0.5 flex items-center justify-end space-x-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>{totalMinTime.toFixed(1)} - {totalMaxTime.toFixed(1)} hs</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de costos y Entrada precio hora */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="hourly-rate" className="text-xs text-slate-300 flex items-center space-x-1.5 font-medium">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>Valor Hora de Mano de Obra:</span>
                      </label>
                      <div className="flex items-center bg-slate-900 rounded-lg px-2 border border-slate-700 w-28">
                        <span className="text-emerald-400 text-xs">$</span>
                        <input
                          id="hourly-rate"
                          type="number"
                          value={precioHora}
                          step="5"
                          min="1"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPrecioHora(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-transparent border-none text-right py-1 text-sm font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick select de tarifas por hora */}
                    <div className="flex justify-between space-x-1">
                      {[25, 35, 45, 60, 80].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPrecioHora(rate)}
                          className={`flex-1 text-[10.5px] py-1 font-semibold rounded-md border transition-all ${
                            precioHora === rate
                              ? "bg-emerald-500/20 text-emerald-350 border-emerald-500/40"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                          }`}
                        >
                          ${rate}/h
                        </button>
                      ))}
                    </div>

                    {/* Calculador interactivo - Fiel a la solicitud del usuario */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                      <div className="text-center p-1 border-r border-slate-800">
                        <span className="text-[9.5px] font-mono tracking-widest text-slate-400 uppercase block">Costo Mínimo Estimado</span>
                        <span className="text-base text-white font-mono font-extrabold mt-0.5 block">
                          ${costMin.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[9.5px] text-slate-500 block">Basado en {totalMinTime.toFixed(1)} hs</span>
                      </div>
                      <div className="text-center p-1">
                        <span className="text-[9.5px] font-mono tracking-widest text-emerald-400 uppercase block font-semibold">Costo Máximo Estimado</span>
                        <span className="text-lg text-emerald-300 font-mono font-extrabold mt-0.5 block animate-pulse">
                          ${costMax.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[9.5px] text-slate-500 block">Basado en {totalMaxTime.toFixed(1)} hs</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RECUADRO DE ERROR */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-xl text-xs flex items-start space-x-2 shadow-inner"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Atención</span>
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === "estimator" && (
              <>
            {/* CARD 1: FORMULARIO DE CONSULTA CON IA */}
            <div className="bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-700/80 space-y-4" id="search-form">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <h2 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
                  <span>Consultar Tiempos con la IA</span>
                </h2>
                <span className="bg-slate-900 border border-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  Gemini AI
                </span>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-3.5">
                {/* Operador / Mecánico */}
                <div>
                  <label htmlFor="usuario-input" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Tu Nombre (Usuario consultor):
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="usuario-input"
                      type="text"
                      placeholder="Ej: Mecánico González, Taller Pro"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Vehículo */}
                <div>
                  <label htmlFor="vehiculo-input" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Vehículo (Marca, Modelo, Año):
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="vehiculo-input"
                      type="text"
                      placeholder="Ej: Toyota Hilux 2020 2.4 Turbo"
                      value={vehiculo}
                      onChange={(e) => setVehiculo(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Consulta Reparación */}
                <div>
                  <label htmlFor="consulta-input" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Reparación / Trabajo a Cotizar:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="consulta-input"
                      type="text"
                      placeholder="Ej: Cambio de kit de distribución"
                      value={consulta}
                      onChange={(e) => setConsulta(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Botón de Ejecución */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-semibold rounded-xl text-sm py-2.5 flex items-center justify-center space-x-2 shadow-lg transition-all ${
                    loading
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 hover:shadow-amber-500/10 cursor-pointer"
                  }`}
                  id="submit-query-btn"
                >
                  {loading ? (
                    <>
                      <div className="w-4.5 h-4.5 border-2 border-slate-400 border-t-transparent animate-spin rounded-full shrink-0" />
                      <span className="animate-pulse">{loadingStep || "Consultando Tempario..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950 animate-bounce" />
                      <span>Calcular Tiempos con IA</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sugerencias Rápidas de Prueba */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">Preguntas frecuentes rápida:</span>
                <div className="flex flex-wrap gap-1">
                  {presetRepairs.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(item.v, item.q)}
                      className="bg-slate-900 hover:bg-slate-750 text-[10px] px-2 py-1 rounded-md border border-slate-700 text-slate-300 transition-colors flex items-center space-x-1"
                    >
                      <Fuel className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DETALLES DE LA REPARACIÓN SELECCIONADA */}
            <AnimatePresence mode="popLayout">
              {activeResultado ? (
                <motion.div
                  key={activeSearch?.id || "empty-result"}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Bloque: Desglose de Pasos Técnicos para el Taller */}
                  <div className="bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                      <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
                        <ListTodo className="w-4 h-4 text-amber-500" />
                        <span>Desglose de Pasos e Inspecciones</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activeResultado.pasos.length} tareas
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/20">
                      &quot;{activeResultado.explicacionSencilla}&quot;
                    </p>

                    {/* Pasos Interactivos Checklist */}
                    <div className="space-y-2.5">
                      {activeResultado.pasos.map((paso, idx) => {
                        const isDone = !!checkedSteps[paso.paso];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleStep(paso.paso)}
                            className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isDone
                                ? "bg-slate-900/30 border-slate-800 text-slate-500"
                                : "bg-slate-900/80 border-slate-700 hover:border-slate-600 text-slate-200"
                            }`}
                          >
                            <button className="shrink-0 mt-0.5" aria-label="Marcar paso completo">
                              {isDone ? (
                                <CheckSquare className="w-4.5 h-4.5 text-emerald-500 fill-emerald-500/10" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-500" />
                              )}
                            </button>
                            <div className="flex-1 text-xs">
                              <span className={isDone ? "line-through text-slate-500" : "text-white font-medium"}>
                                {paso.paso}
                              </span>
                              <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Estimado: {paso.duracionMin.toFixed(1)} - {paso.duracionMax.toFixed(1)} hs</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloque: Consejos Técnicos de Servicio */}
                  <div className="bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700 space-y-3">
                    <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
                      <BookmarkCheck className="w-4.5 h-4.5 text-emerald-400" />
                      <span>Consejos de Taller y Seguridad</span>
                    </h3>
                    <ul className="space-y-2">
                      {activeResultado.consejos.map((consejo, idx) => (
                        <li key={idx} className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/30 text-xs text-slate-300 flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{consejo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700 space-y-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-500">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="text-white text-sm font-semibold">Taller Limpio</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Por favor escribe una consulta o selecciona un ejemplo de arriba para iniciar la estimación de tiempos y costos automotrices.
                  </p>
                </div>
              )}
            </AnimatePresence>

            {/* BOTÓN RESTABLECER DB */}
            <div className="flex justify-center p-1">
              <button
                onClick={handleResetDatabase}
                className="text-slate-500 hover:text-slate-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                title="Restablecer base de datos local a valores por defecto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Historial del Taller</span>
              </button>
            </div>
          </>
        )}

        {activeTab === "stats" && (
          /* PESTAÑA: DETALLES DE ESTADÍSTICAS Y HISTORIAL COMPLETO */
          <div className="space-y-4">
            {/* TENDENCIAS DE REPARACIONES MÁS SOLICITADAS */}
            <div className="bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2">
                  <TrendingUp className="w-4.5 h-4.5 text-amber-500" />
                  <span>Reparaciones más Solicitadas</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Baremos de Demanda</span>
              </div>
              <p className="text-xs text-slate-400 bg-slate-900/30 p-2.5 rounded-xl">
                Trazado dinámico de categorización basado en todos los registros archivados en la base de datos de consultas del taller.
              </p>

              <div className="space-y-3 pt-1">
                {stats.length > 0 && stats.some(s => s.cantidad > 0) ? (
                  stats.map((stat, idx) => {
                    if (idx > 5) return null; // limit view space on mobile to first 6 active categories
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-100">{stat.categoria}</span>
                          <span className="text-amber-500 text-[10px] font-mono">
                            {stat.cantidad} {stat.cantidad === 1 ? "búsqueda" : "búsquedas"} ({stat.porcentaje}%)
                          </span>
                        </div>
                        {/* Custom Bar progress indicator */}
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, stat.porcentaje)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No hay suficientes búsquedas para generar estadísticas.
                  </div>
                )}
              </div>
            </div>

            {/* HISTORIAL COMPLETO DE ARCHIVOS */}
            <div className="bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-700 space-y-3">
              <h3 className="font-display font-semibold text-sm text-white flex items-center space-x-2 border-b border-slate-700 pb-2">
                <Layers className="w-4.5 h-4.5 text-amber-500" />
                <span>Historial de Cotizaciones Archivadas</span>
              </h3>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {historial.length > 0 ? (
                  historial.map((item) => {
                    const isActive = activeSearch?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveSearch(item);
                          setCheckedSteps({});
                          setActiveTab("estimator");
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber-500/10 border-amber-500"
                            : "bg-slate-900 hover:bg-slate-750 border-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono border border-slate-700/60 font-semibold truncate">
                              Mec: {item.usuario}
                            </span>
                            {item.sincronizadoSheets ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-350 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold font-mono shrink-0">
                                ✓ Sheets
                              </span>
                            ) : item.errorSincronizacion ? (
                              <span 
                                title={item.errorSincronizacion}
                                className="text-[9px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/15 font-semibold font-mono shrink-0"
                              >
                                {item.errorSincronizacion.includes("No autorizado") ? "No Autorizado ⚠️" : "Local"}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(item.fecha).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            {isAdminLoggedIn && (
                              <button
                                onClick={(e) => handleDeleteRecord(item.id, e)}
                                className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-800 transition-colors shrink-0"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-white mt-1.5 truncate">
                          {item.resultado?.reparacion || item.consulta}
                        </h4>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-400 flex items-center space-x-1 truncate max-w-[170px]">
                            <Car className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{item.vehiculo}</span>
                          </span>
                          <span className="text-[10.5px] font-mono text-amber-400 flex items-center space-x-0.5 font-bold shrink-0">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{item.resultado?.tiempoMinimo ? `${item.resultado.tiempoMinimo}-${item.resultado.tiempoMaximo} hs` : "Generando"}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No hay búsquedas archivadas aún.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "sheets" && (
          <div className="space-y-4">
            {!isAdminLoggedIn ? (
              <div className="bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3">
                  <Settings className="w-5 h-5 text-amber-500 font-bold" />
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">Acceso de Administrador</h3>
                    <p className="text-[10px] text-slate-400">Ingrese la contraseña del taller para desbloquear ajustes avanzados</p>
                  </div>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold font-mono block">Contraseña del Sistema:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {configError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10.5px] text-red-400 font-medium font-mono">
                      {configError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg py-2.5 text-xs font-bold font-mono transition-colors"
                  >
                    Acceder al Panel
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="font-display font-semibold text-sm text-white">Panel de Control Administrador</h3>
                        <p className="text-[10px] text-slate-400">Sesión autorizada activa del taller</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAdminLogout}
                      className="text-[10px] bg-slate-900 hover:bg-slate-950 text-slate-400 hover:text-red-400 px-2 py-1 rounded border border-slate-750 transition-colors font-mono font-medium"
                    >
                      Cerrar Sesión
                    </button>
                  </div>

                  {/* Status Indicator */}
                  {isServerConfigured ? (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                      <div className="flex items-start space-x-2 text-emerald-400">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white">¡Enlace de Google Sheets Activado!</span>
                          <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                            El enrutamiento está activo. Las búsquedas de mecánicos que se encuentren en la pestaña <strong className="text-amber-400">"Autorizados"</strong> se guardarán automáticamente en <strong className="text-amber-400">"Registro"</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                      <div className="flex items-start space-x-2 text-amber-300">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white font-mono">Modo de Operación Local</span>
                          <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                            No hay un enlace de Google Sheets configurado. El sistema guarda las cotizaciones localmente en la base de datos de este navegador. Configúralo usando el formulario de abajo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DE RECONFIGURACIÓN DEL ENLACE DE GOOGLE SHEETS */}
                  <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-750 p-4 rounded-xl space-y-3">
                    <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center">
                      <h4 className="font-mono text-[9px] text-amber-400 uppercase tracking-wider font-bold">Puente de Sincronización Directa</h4>
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold font-mono block font-bold text-amber-500">URL de Aplicación Web (Google Apps Script):</label>
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={configUrl}
                        onChange={(e) => setConfigUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    {configError && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10.5px] text-red-400 font-mono">
                        {configError}
                      </div>
                    )}

                    {configSuccessMsg && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] text-emerald-400 font-mono">
                        {configSuccessMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingConfig}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-lg py-2.5 text-xs font-bold font-mono transition-colors"
                    >
                      {loadingConfig ? "Guardando y Validando enlace..." : "Guardar Ajustes y Activar Sincronización"}
                    </button>
                  </form>

                  <div className="space-y-2 bg-slate-900/40 p-3 rounded-xl border border-slate-700/30 text-xs text-slate-350">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-amber-500 font-bold">Resumen de Integridad:</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                      <li>Las estadísticas de búsqueda se alimentan del tempario de cotizaciones centralizado.</li>
                      <li>Si configuras el enlace, las consultas hechas por mecánicos autorizados en Google Sheets se guardarán en tiempo real.</li>
                      <li>Los botones de eliminación individual en el historial ahora están visibles y desbloqueados.</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-700/50 space-y-2">
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">Acciones de Emergencia:</p>
                    <button
                      type="button"
                      onClick={handleClearAllRecords}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors font-mono"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Vaciar Historial Local de Cotizaciones</span>
                    </button>
                  </div>
                </div>

                {/* GUÍA DE INSTALACIÓN PASO A PASO */}
                <div className="bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="font-display font-semibold text-sm text-white">Guía de Conexión de Google Sheets</h3>
                      <p className="text-[10px] text-slate-400">Cómo configurar tu base de datos centralizada de forma segura</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">1</div>
                      <p>Crea una <strong>Hoja de cálculo de Google (Spreadsheet)</strong> en blanco en tu Google Drive.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">2</div>
                      <div>
                        <p className="font-bold text-white text-[11px]">Nombra las Pestañas de la Siguiente Manera:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-400 text-[10.5px]">
                          <li>Crea una pestaña llamada <strong className="text-amber-400">"Registro"</strong> (aquí se registrarán las cotizaciones).</li>
                          <li>Crea una pestaña llamada <strong className="text-amber-400">"Autorizados"</strong> (aquí colocarás los mecánicos autorizados).</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">3</div>
                      <div>
                        <p className="font-bold text-white text-[11px]">¿Dónde coloco los mecánicos autorizados?</p>
                        <p className="text-slate-400 text-[10.5px] mt-0.5 leading-relaxed">
                          En la pestaña <strong className="text-emerald-400">"Autorizados"</strong>, escribe los nombres de los mecánicos autorizados en la <strong>Columna A</strong> (uno por fila, empezando por la fila 1 o después de un encabezado). Por ejemplo: <strong className="text-white">Carlos Mendoza</strong>, <strong className="text-white">Mariana Rojas</strong>, etc. ¡No importa si usas mayúsculas o minúsculas!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">4</div>
                      <p>En el menú superior de la hoja, ve a <strong>Extensiones</strong> ➔ <strong>Apps Script</strong>.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">5</div>
                      <p>Borra todo el código que aparezca por defecto en el editor de Apps Script, copia el código de abajo con el botón, y pégalo allí.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">6</div>
                      <p>Haz clic en <strong>Implementar (Deploy)</strong> ➔ <strong>Nueva implementación</strong>.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">7</div>
                      <p>Selecciona tipo <strong>Aplicación web</strong>. Configura: Ejecutar como: <strong>Yo (tu correo)</strong> y Quién tiene acceso: <strong>Cualquiera (Anyone)</strong>. Haz clic en implementar y concede los permisos de tu cuenta Google.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">8</div>
                      <p>Copia la <strong>URL de la Aplicación web</strong> larga generada, pégala arriba y haz clic en Guardar Ajustes.</p>
                    </div>
                  </div>

                  {/* CÓDIGO DE GOOGLE APPS SCRIPT COPIABLE */}
                  <div className="space-y-2 pt-2 border-t border-slate-700/60 font-mono">
                    <div className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-t-xl border border-b-0 border-slate-700">
                      <span className="text-[10px] font-bold text-amber-400 font-mono">codigo_apps_script.js</span>
                      <button
                        onClick={() => {
                          const codeText = `// ==========================================
// CÓDIGO DE GOOGLE APPS SCRIPT PARA TU GOOGLE SHEET
// ==========================================

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Registro") || ss.getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  var data = [];
  
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      fecha: rows[i][0],
      usuario: rows[i][1],
      vehiculo: rows[i][2],
      consulta: rows[i][3],
      reparacion: rows[i][4],
      tiempoMinimo: rows[i][5],
      tiempoMaximo: rows[i][6],
      explicacion: rows[i][7]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtiene u organiza la pestaña "Registro"
    var logSheet = ss.getSheetByName("Registro");
    if (!logSheet) {
      logSheet = ss.getSheets()[0];
      if (logSheet.getName() === "Autorizados") {
        logSheet = ss.insertSheet("Registro");
      } else {
        logSheet.setName("Registro");
      }
    }
    
    // 2. Busca mecánicos autorizados en la pestaña "Autorizados"
    var authSheet = ss.getSheetByName("Autorizados");
    var isAuthorized = false;
    
    if (authSheet) {
      var authValues = authSheet.getDataRange().getValues();
      var senderUser = (payload.usuario || "").trim().toLowerCase();
      
      for (var r = 0; r < authValues.length; r++) {
        var nameInCell = String(authValues[r][0]).trim().toLowerCase();
        if (nameInCell && nameInCell === senderUser) {
          isAuthorized = true;
          break;
        }
      }
    } else {
      // Auto-crear la pestaña "Autorizados" si el usuario no la creó para que no falle inicialmente
      authSheet = ss.insertSheet("Autorizados");
      authSheet.appendRow(["Mecánicos Autorizados (Nombre Exacto en cada fila)"]);
      authSheet.appendRow(["Carlos Mendoza"]);
      authSheet.appendRow(["Mariana Rojas"]);
      authSheet.getRange(1, 1).setFontWeight("bold").setBackground("#fee2e2");
      isAuthorized = true; 
    }
    
    // Si NO está autorizado, retornamos éxito pero sin guardar en Google Sheets
    if (!isAuthorized) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        saved: false, 
        message: "El usuario '" + payload.usuario + "' no está registrado en la pestaña Autorizados. Sincronización evitada convenientemente." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. Crear encabezados si la hoja de registro está vacía
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow([
        "Fecha", "Usuario/Mecánico", "Vehículo", "Consulta", 
        "Reparación", "Tiempo Mínimo (hs)", "Tiempo Máximo (hs)", "Explicación"
      ]);
      logSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    // 4. Registrar fila de cotización realizada
    logSheet.appendRow([
      payload.fecha || new Date().toISOString(),
      payload.usuario || "",
      payload.vehiculo || "",
      payload.consulta || "",
      payload.resultado?.reparacion || "",
      payload.resultado?.tiempoMinimo || 0,
      payload.resultado?.tiempoMaximo || 0,
      payload.resultado?.explicacionSencilla || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      saved: true, 
      message: "¡Guardado perfectamente!" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                          navigator.clipboard.writeText(codeText);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2500);
                        }}
                        className="text-[10px] bg-slate-800 text-slate-350 hover:text-white px-2.5 py-1 rounded-md border border-slate-750 flex items-center space-x-1 font-medium transition-all"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400 font-semibold font-sans">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-sans">Copiar Código</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="w-full bg-slate-950 p-3 rounded-b-xl border border-slate-700 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-56 leading-relaxed">
                      <pre>{`// Copia y pega esto en Extensiones > Apps Script
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Registro") || ss.getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      fecha: rows[i][0], usuario: rows[i][1], vehiculo: rows[i][2],
      consulta: rows[i][3], reparacion: rows[i][4],
      tiempoMinimo: rows[i][5], tiempoMaximo: rows[i][6],
      explicacion: rows[i][7]
    });
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("Registro") || ss.getSheets()[0];
    var authSheet = ss.getSheetByName("Autorizados");
    var isAuthorized = false;
    if (authSheet) {
      var authValues = authSheet.getDataRange().getValues();
      var senderUser = (payload.usuario || "").trim().toLowerCase();
      for (var r = 0; r < authValues.length; r++) {
        var nameInCell = String(authValues[r][0]).trim().toLowerCase();
        if (nameInCell && nameInCell === senderUser) {
          isAuthorized = true; break;
        }
      }
    } else {
      isAuthorized = true; // Permisivo inicial
    }
    if (!isAuthorized) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", saved: false }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(["Fecha", "Usuario", "Vehículo", "Consulta", "Reparación", "Mínimo", "Máximo", "Explicación"]);
    }
    logSheet.appendRow([
      payload.fecha || new Date().toISOString(),
      payload.usuario || "",
      payload.vehiculo || "",
      payload.consulta || "",
      payload.resultado?.reparacion || "",
      payload.resultado?.tiempoMinimo || 0,
      payload.resultado?.tiempoMaximo || 0,
      payload.resultado?.explicacionSencilla || ""
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", saved: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STICKY FOOTER NAVIGATION / MOBILE ACTION CARDS */}
      <footer className="bg-slate-950 text-slate-400 text-[10px] text-center py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-md mx-auto px-4 space-y-1.5">
          <p className="font-mono">TEMPARIO PRO &copy; {new Date().getFullYear()} - Conexión de Taller</p>
          <p className="text-slate-600">
            Desarrollado para celulares modernos. Análisis inteligente de tiempos basado en IA server-side.
          </p>
        </div>
      </footer>
    </div>
  );
}
