/**
 * NEXORA — Onboarding guiado de empresas
 * Propósito: recorrido visual de bienvenida, identidad, documentos, cobro y revisión.
 * Lectura/escritura: OrganizationProfile de la empresa autorizada mediante SDK tenant bridge; solo update sobre perfil existente.
 * Dependencias: React Query, AuthContext, orgProfileSnapshot y rutas operativas.
 * Reglas: no invita usuarios, no crea membresías, no activa empresa ni certifica entrega; no guarda cambios sin acción explícita.
 * Límites: las verificaciones de acceso, financiera y beta siguen siendo QA externo; sin perfil autorizado se bloquea guardado.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { validateProfileForOperation } from "@/lib/orgProfileSnapshot";
import { dismissOnboarding } from "@/lib/onboardingPreference";
import { ArrowRight, ArrowLeft, Check, CheckCircle2, Building2, FileText, Wallet, ShieldCheck, Sparkles, LockKeyhole, ExternalLink, RotateCcw } from "lucide-react";

const STEPS = [
  { id: "welcome", label: "Bienvenida", eyebrow: "TU NUEVO ESPACIO", title: "Tu operación, en una nueva dimensión.", description: "Construyamos la base de tu empresa antes de mover la primera compra." , icon: Sparkles },
  { id: "identity", label: "Tu empresa", eyebrow: "01 / IDENTIDAD", title: "Primero, lo que te hace único.", description: "La información que aparecerá en tu espacio de trabajo y documentos comerciales.", icon: Building2 },
  { id: "documents", label: "Documentos", eyebrow: "02 / DOCUMENTOS", title: "Cada detalle habla de tu marca.", description: "Definí la numeración y las condiciones de tus cotizaciones y ventas.", icon: FileText },
  { id: "payments", label: "Cobros", eyebrow: "03 / COBROS", title: "Prepará el siguiente movimiento.", description: "Dejá listas tus instrucciones de pago. Podés completarlas después.", icon: Wallet },
  { id: "review", label: "Revisión", eyebrow: "04 / LISTO PARA REVISIÓN", title: "Una gran operación empieza bien.", description: "Revisá lo guardado y descubrí los siguientes pasos de tu equipo.", icon: ShieldCheck },
];
const FIELDS = {
  identity: ["legal_name", "commercial_name", "email_main", "phone_main", "legal_id", "country", "city"],
  documents: ["document_prefix_quote", "document_prefix_sale", "quote_validity_days", "default_terms_conditions"],
  payments: ["payment_instructions", "sinpe_details", "bank_details"],
};
const INITIAL = { legal_name: "", commercial_name: "", email_main: "", phone_main: "", legal_id: "", country: "", city: "", document_prefix_quote: "COT", document_prefix_sale: "VTA", quote_validity_days: 7, default_terms_conditions: "", payment_instructions: "", sinpe_details: "", bank_details: "" };
const requiredIdentity = ["legal_name", "commercial_name", "email_main"];
const requiredDocs = ["document_prefix_quote", "document_prefix_sale", "quote_validity_days"];
const hasValues = (data, fields) => fields.every(key => String(data?.[key] ?? "").trim().length > 0);
const classes = "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
function Field({ label, value, onChange, placeholder, type = "text", required = false, full = false }) {
  return <label className={`block space-y-2 ${full ? "sm:col-span-2" : ""}`}><span className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-indigo-500"> *</span>}</span><input className={classes} type={type} value={value ?? ""} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(INITIAL);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const query = useQuery({ queryKey: ["orgProfile"], queryFn: () => base44.entities.OrganizationProfile.filter({ active: true }), retry: 1 });
  const profile = query.data?.[0] ?? null;
  useEffect(() => {
    if (!dirty && profile) setDraft({ ...INITIAL, ...Object.fromEntries(Object.keys(INITIAL).map(key => [key, profile[key] ?? INITIAL[key]])) });
  }, [profile, dirty]);
  const update = (key, value) => { setDraft(prev => ({ ...prev, [key]: value })); setDirty(true); setNotice(""); };
  const save = useMutation({
    mutationFn: async stage => {
      if (!profile?.id) throw new Error("No hay una empresa autorizada para actualizar.");
      const payload = Object.fromEntries(FIELDS[stage].map(key => [key, draft[key]]));
      return base44.entities.OrganizationProfile.update(profile.id, payload);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["orgProfile"] }); setDirty(false); setNotice("Cambios guardados en tu empresa."); setStep(previous => Math.min(previous + 1, STEPS.length - 1)); },
  });
  const readiness = validateProfileForOperation(profile);
  const savedIdentity = hasValues(profile, requiredIdentity);
  const savedDocs = hasValues(profile, requiredDocs);
  const savedPayments = !!(profile?.payment_instructions || profile?.sinpe_details || profile?.bank_details);
  const completed = [true, savedIdentity, savedDocs, savedPayments, false];
  const validStage = step === 1 ? hasValues(draft, requiredIdentity) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email_main) : step === 2 ? hasValues(draft, requiredDocs) && Number(draft.quote_validity_days) > 0 : true;
  const selected = STEPS[step];
  const progress = Math.round((step / (STEPS.length - 1)) * 100);
  const reset = () => { if (profile) setDraft({ ...INITIAL, ...Object.fromEntries(Object.keys(INITIAL).map(key => [key, profile[key] ?? INITIAL[key]])) }); setDirty(false); setNotice(""); };
  const advance = async () => {
    if (step === 0) { setStep(1); return; }
    if (step === 4) {
      if (!readiness.valid) { setNotice("Completá primero los datos obligatorios de identidad y documentos."); return; }
      if (!dismissOnboarding(user?.id)) { setNotice("Para finalizar, seleccioná tu empresa de trabajo en el menú lateral."); return; }
      navigate("/"); return;
    }
    if (!dirty && (step === 3 || completed[step])) { setNotice(""); setStep(value => value + 1); return; }
    if (!validStage) { setNotice("Revisá los campos obligatorios antes de continuar."); return; }
    save.mutate(selected.id);
  };
  const goTo = index => { if (dirty) { setNotice("Guardá o descartá los cambios antes de cambiar de paso."); return; } setStep(index); setNotice(""); };
  return <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-[28px] bg-[#080f27] text-white shadow-2xl shadow-slate-900/15">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 -right-48 h-[600px] w-[600px] rounded-full bg-indigo-600/25 blur-[100px]" />
      <div className="absolute left-[-120px] bottom-[-230px] h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[95px]" />
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, black, transparent 80%)" }} />
    </div>
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-6 sm:px-9 sm:py-9 lg:px-12">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10"><span className="text-xl font-black tracking-tighter">N</span></div><div><p className="text-sm font-bold tracking-[0.28em]">NEXORA</p><p className="text-[10px] uppercase tracking-[0.22em] text-indigo-200/70">Set up your space</p></div></div>
        <Link to="/" className="text-xs font-medium text-slate-300 transition hover:text-white">Ir al panel <ExternalLink className="ml-1 inline h-3.5 w-3.5" /></Link>
      </div>
      <div className="grid gap-9 py-9 lg:grid-cols-[260px_1fr] lg:gap-14 lg:py-14">
        <aside className="space-y-8">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Tu recorrido</p><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }}/></div><p className="mt-3 text-xs text-slate-400">Paso {step + 1} de {STEPS.length}</p></div>
          <ol className="space-y-2">{STEPS.map((item, index) => { const Icon = item.icon; return <li key={item.id}><button type="button" onClick={() => goTo(index)} aria-current={step === index ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${step === index ? "border border-indigo-400/30 bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${completed[index] && index !== 0 ? "bg-emerald-400/15 text-emerald-300" : step === index ? "bg-indigo-400 text-slate-950" : "bg-white/5"}`}>{completed[index] && index !== 0 ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span><span className="block text-sm font-medium">{item.label}</span><span className="text-[11px] opacity-60">{index === 0 ? "Empecemos" : completed[index] ? "Guardado" : "Por configurar"}</span></span></button></li> })}</ol>
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 lg:block"><LockKeyhole className="mb-3 h-5 w-5 text-cyan-300"/><p className="text-sm font-semibold">Un espacio para tu empresa</p><p className="mt-2 text-xs leading-relaxed text-slate-400">La configuración se guarda únicamente en la organización a la que tenés acceso.</p></div>
        </aside>
        <section className="min-w-0">
          <div key={selected.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
            <p className="mb-4 text-xs font-bold tracking-[0.27em] text-cyan-300">{selected.eyebrow}</p>
            <h1 className="max-w-[700px] text-4xl font-semibold leading-[1.09] tracking-[-0.045em] sm:text-5xl lg:text-[3.7rem]">{selected.title}</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{selected.description}</p>
            {step === 0 && <div className="mt-10 grid gap-4 sm:grid-cols-3">{[{ number: "01", title: "Identidad", desc: "Tu marca y tus datos" }, { number: "02", title: "Operación", desc: "Documentos y cobros" }, { number: "03", title: "Despegue", desc: "Revisión acompañada" }].map(item => <div key={item.number} className="group rounded-3xl border border-white/10 bg-white/[0.055] p-6 transition hover:border-cyan-300/30 hover:bg-white/10"><p className="text-xs font-bold text-cyan-300">{item.number}</p><p className="mt-8 text-xl font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.desc}</p></div>)}</div>}
            {step > 0 && step < 4 && <div className="mt-9 rounded-[26px] bg-[#f8fafc] p-5 text-slate-900 shadow-xl shadow-black/15 sm:p-8">
              {query.isLoading ? <p role="status" className="text-sm text-slate-500">Cargando empresa autorizada…</p> : query.isError || !profile ? <div role="alert" className="space-y-3"><p className="font-semibold">Todavía no hay un perfil de empresa disponible.</p><p className="text-sm text-slate-600">El administrador debe asociar tu cuenta a una organización. No se creó ningún registro ni membresía.</p><Link className="text-sm font-semibold text-indigo-600 underline" to="/settings">Ver configuración</Link></div> : <>
              {step === 1 && <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre comercial" value={draft.commercial_name} required full placeholder="Como te conocen tus clientes" onChange={value => update("commercial_name", value)}/>
                <Field label="Razón social" value={draft.legal_name} required full placeholder="Nombre legal de tu empresa" onChange={value => update("legal_name", value)}/>
                <Field label="Correo corporativo" type="email" value={draft.email_main} required full placeholder="hola@tuempresa.com" onChange={value => update("email_main", value)}/>
                <Field label="Teléfono" value={draft.phone_main} placeholder="+506 0000 0000" onChange={value => update("phone_main", value)}/>
                <Field label="Identificación fiscal" value={draft.legal_id} placeholder="Cédula jurídica / RUC" onChange={value => update("legal_id", value)}/>
                <Field label="País" value={draft.country} placeholder="Costa Rica" onChange={value => update("country", value)}/>
                <Field label="Ciudad" value={draft.city} placeholder="San José" onChange={value => update("city", value)}/>
              </div>}
              {step === 2 && <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Prefijo de cotizaciones" value={draft.document_prefix_quote} required placeholder="COT" onChange={value => update("document_prefix_quote", value)}/>
                <Field label="Prefijo de ventas" value={draft.document_prefix_sale} required placeholder="VTA" onChange={value => update("document_prefix_sale", value)}/>
                <Field label="Validez de cotización (días)" type="number" required value={draft.quote_validity_days} onChange={value => update("quote_validity_days", Math.max(0, Number(value)))} />
                <label className="block space-y-2 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Términos y condiciones</span><textarea rows={4} className={classes} value={draft.default_terms_conditions ?? ""} placeholder="Condiciones que aparecerán en tus documentos…" onChange={event => update("default_terms_conditions", event.target.value)}/></label>
              </div>}
              {step === 3 && <div className="grid gap-5">
                <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Instrucciones de pago</span><textarea rows={3} className={classes} value={draft.payment_instructions ?? ""} placeholder="Cómo y cuándo pueden pagarte tus clientes…" onChange={event => update("payment_instructions", event.target.value)}/></label>
                <Field label="SINPE Móvil" value={draft.sinpe_details} placeholder="Número y beneficiario" onChange={value => update("sinpe_details", value)}/>
                <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Información bancaria</span><textarea rows={3} className={classes} value={draft.bank_details ?? ""} placeholder="Banco, IBAN y beneficiario…" onChange={event => update("bank_details", event.target.value)}/></label>
                <p className="text-xs leading-relaxed text-slate-500">Opcional. Revisá estos datos cuidadosamente antes de empezar a cobrar.</p>
              </div>}
              </>}
            </div>}
            {step === 4 && <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {[{title:"Identidad empresarial",ready:savedIdentity,desc:profile?.commercial_name || "Pendiente de guardar",to:1},{title:"Documentos comerciales",ready:savedDocs,desc:savedDocs?"Numeración configurada":"Faltan campos requeridos",to:2},{title:"Cobros",ready:savedPayments,desc:savedPayments?"Instrucciones guardadas":"Opcional, podés volver luego",to:3},{title:"Revisión operativa",ready:false,desc:"Acceso, permisos y primera operación pendientes de validar con Nexora",to:null}].map(item=><div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5"><div className="flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.ready?"bg-emerald-400/15 text-emerald-300":"bg-amber-400/15 text-amber-200"}`}>{item.ready?<CheckCircle2 className="h-5 w-5"/>:<ShieldCheck className="h-5 w-5"/>}</span>{item.to && <button className="text-xs font-semibold text-cyan-300 hover:underline" onClick={()=>goTo(item.to)}>Editar</button>}</div><h2 className="mt-5 font-semibold">{item.title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{item.desc}</p></div>)}
              <div className="sm:col-span-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">Estado del perfil: {readiness.valid ? "datos mínimos guardados" : `faltan ${readiness.missing.join(", ")}`}. Al finalizar, «Inicio guiado» se ocultará del menú de esta empresa en este navegador. Podés reabrirlo desde Configuración. Esto no habilita automáticamente pagos, accesos ni operación real.</div>
            </div>}
            {notice && <p role="status" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">{notice}</p>}
            {save.isError && <p role="alert" className="mt-5 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron guardar los cambios. Revisá tu acceso y volvé a intentar.</p>}
            <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
              <button type="button" disabled={step === 0 || save.isPending} onClick={() => goTo(step - 1)} className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white disabled:opacity-30"><ArrowLeft className="h-4 w-4"/> Atrás</button>
              <div className="flex flex-wrap items-center gap-3">{dirty && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs text-slate-300 hover:bg-white/10"><RotateCcw className="h-4 w-4"/> Descartar cambios</button>}
                <button type="button" onClick={advance} disabled={save.isPending || (step > 0 && step < 4 && (!profile || query.isError || query.isLoading))} className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-300 to-indigo-300 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-indigo-500/20 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50">{save.isPending?"Guardando…":step===0?"Comenzar experiencia":step===4?"Finalizar y entrar al panel":step===3&&!dirty?"Continuar sin datos de cobro":"Guardar y continuar"}<ArrowRight className="h-4 w-4"/></button>
              </div>
            </div>
            <p className="mt-6 text-xs text-slate-500">Sesión: {user?.email || "usuario autenticado"} · Configuración privada de Nexora</p>
          </div>
        </section>
      </div>
    </div>
  </div>;
}
