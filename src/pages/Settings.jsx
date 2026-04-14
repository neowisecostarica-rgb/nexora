import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, CreditCard, Calculator, Save, Upload, CheckCircle, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { REQUIRED_FIELDS_FOR_OPERATION, validateProfileForOperation } from "@/lib/orgProfileSnapshot";

const EMPTY_PROFILE = {
  legal_name: "", commercial_name: "", brand_name: "", legal_id: "",
  logo_url: "", phone_main: "", phone_secondary: "", email_main: "",
  website: "", address_line: "", city: "", country: "",
  payment_instructions: "", bank_details: "", sinpe_details: "",
  default_quote_notes: "", default_sale_notes: "", default_terms_conditions: "",
  quote_validity_days: 7, document_prefix_quote: "COT", document_prefix_sale: "VTA",
  show_logo_on_documents: false, show_bank_details_on_quotes: false, show_terms_on_quotes: false,
  invoice_external_system_note: "", active: true,
};

export default function SettingsPage() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [profileId, setProfileId] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["orgProfile"],
    queryFn: () => base44.entities.OrganizationProfile.filter({ active: true }),
  });

  useEffect(() => {
    if (profiles.length > 0) {
      setForm({ ...EMPTY_PROFILE, ...profiles[0] });
      setProfileId(profiles[0].id);
    }
  }, [profiles]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profileId) {
        return base44.entities.OrganizationProfile.update(profileId, data);
      } else {
        return base44.entities.OrganizationProfile.create({ ...data, active: true });
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["orgProfile"] });
      if (!profileId && result?.id) setProfileId(result.id);
      toast({ title: "Guardado", description: "Perfil de organización actualizado correctamente." });
    },
  });

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    sf("logo_url", file_url);
    setUploadingLogo(false);
    toast({ title: "Logo subido", description: "El logo se ha cargado correctamente." });
  };

  const { valid, missing } = validateProfileForOperation(form);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Perfil de empresa y ajustes del sistema">
        <div className="flex items-center gap-2">
          {valid ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" />Perfil completo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-yellow-600 font-medium">
              <AlertTriangle className="w-4 h-4" />Faltan {missing.length} campo(s)
            </span>
          )}
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />{saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </PageHeader>

      {!valid && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800">Campos requeridos para operar:</p>
            <p className="text-yellow-700">{missing.join(", ")}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="empresa">
        <TabsList className="mb-6">
          <TabsTrigger value="empresa"><Building2 className="w-3.5 h-3.5 mr-1.5" />Empresa</TabsTrigger>
          <TabsTrigger value="documentos"><FileText className="w-3.5 h-3.5 mr-1.5" />Documentos</TabsTrigger>
          <TabsTrigger value="pagos"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Pagos</TabsTrigger>
          <TabsTrigger value="formulas"><Calculator className="w-3.5 h-3.5 mr-1.5" />Fórmulas</TabsTrigger>
        </TabsList>

        {/* TAB: EMPRESA */}
        <TabsContent value="empresa">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Identidad Legal</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre Legal *</Label>
                  <Input value={form.legal_name} onChange={e => sf("legal_name", e.target.value)} placeholder="Razón social" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre Comercial *</Label>
                  <Input value={form.commercial_name} onChange={e => sf("commercial_name", e.target.value)} placeholder="Nombre de marca" />
                </div>
                <div className="space-y-1.5">
                  <Label>Marca / Brand</Label>
                  <Input value={form.brand_name} onChange={e => sf("brand_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cédula Jurídica / RUC</Label>
                  <Input value={form.legal_id} onChange={e => sf("legal_id", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Contacto</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Teléfono Principal</Label>
                  <Input value={form.phone_main} onChange={e => sf("phone_main", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono Secundario</Label>
                  <Input value={form.phone_secondary} onChange={e => sf("phone_secondary", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Email Principal *</Label>
                  <Input type="email" value={form.email_main} onChange={e => sf("email_main", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Sitio Web</Label>
                  <Input value={form.website} onChange={e => sf("website", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Dirección</Label>
                  <Input value={form.address_line} onChange={e => sf("address_line", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad</Label>
                  <Input value={form.city} onChange={e => sf("city", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Input value={form.country} onChange={e => sf("country", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Logo</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-6">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-16 w-auto object-contain rounded border" />
                ) : (
                  <div className="h-16 w-32 rounded border border-dashed border-muted-foreground/40 flex items-center justify-center text-xs text-muted-foreground">Sin logo</div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" asChild disabled={uploadingLogo}>
                      <span><Upload className="w-4 h-4 mr-2" />{uploadingLogo ? "Subiendo…" : "Subir Logo"}</span>
                    </Button>
                  </label>
                  {form.logo_url && (
                    <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => sf("logo_url", "")}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: DOCUMENTOS */}
        <TabsContent value="documentos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Numeración de Documentos</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Prefijo Cotizaciones *</Label>
                  <Input value={form.document_prefix_quote} onChange={e => sf("document_prefix_quote", e.target.value)} placeholder="COT" />
                  <p className="text-xs text-muted-foreground">Ejemplo: COT-00001</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Prefijo Ventas *</Label>
                  <Input value={form.document_prefix_sale} onChange={e => sf("document_prefix_sale", e.target.value)} placeholder="VTA" />
                  <p className="text-xs text-muted-foreground">Ejemplo: VTA-00001</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Días de Validez Cotización *</Label>
                  <Input type="number" min={1} value={form.quote_validity_days} onChange={e => sf("quote_validity_days", parseInt(e.target.value) || 7)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Opciones de Visualización</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mostrar logo en documentos</p>
                    <p className="text-xs text-muted-foreground">Aparece en cotizaciones y facturas</p>
                  </div>
                  <Switch checked={!!form.show_logo_on_documents} onCheckedChange={v => sf("show_logo_on_documents", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mostrar datos bancarios en cotizaciones</p>
                    <p className="text-xs text-muted-foreground">SINPE, transferencia, etc.</p>
                  </div>
                  <Switch checked={!!form.show_bank_details_on_quotes} onCheckedChange={v => sf("show_bank_details_on_quotes", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mostrar términos y condiciones</p>
                    <p className="text-xs text-muted-foreground">Al pie de cotizaciones</p>
                  </div>
                  <Switch checked={!!form.show_terms_on_quotes} onCheckedChange={v => sf("show_terms_on_quotes", v)} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Notas y Términos por Defecto</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Notas por defecto — Cotizaciones</Label>
                  <Textarea rows={4} value={form.default_quote_notes} onChange={e => sf("default_quote_notes", e.target.value)} placeholder="Ej. Precios sujetos a disponibilidad…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notas por defecto — Ventas</Label>
                  <Textarea rows={4} value={form.default_sale_notes} onChange={e => sf("default_sale_notes", e.target.value)} placeholder="Ej. Equipos vendidos sin garantía de fábrica…" />
                </div>
                <div className="col-span-1 lg:col-span-2 space-y-1.5">
                  <Label>Términos y Condiciones</Label>
                  <Textarea rows={5} value={form.default_terms_conditions} onChange={e => sf("default_terms_conditions", e.target.value)} placeholder="Términos y condiciones generales de venta…" />
                </div>
                <div className="col-span-1 lg:col-span-2 space-y-1.5">
                  <Label>Nota sistema facturación externa</Label>
                  <Input value={form.invoice_external_system_note} onChange={e => sf("invoice_external_system_note", e.target.value)} placeholder="Ej. Facturas electrónicas emitidas via Sistema X" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: PAGOS */}
        <TabsContent value="pagos">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-sm">Instrucciones de Pago</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Instrucciones Generales</Label>
                <Textarea rows={3} value={form.payment_instructions} onChange={e => sf("payment_instructions", e.target.value)} placeholder="Ej. Transferencia bancaria o SINPE móvil…" />
              </div>
              <div className="space-y-1.5">
                <Label>Datos Bancarios</Label>
                <Textarea rows={4} value={form.bank_details} onChange={e => sf("bank_details", e.target.value)} placeholder="Banco, cuenta, IBAN, beneficiario…" />
              </div>
              <div className="space-y-1.5">
                <Label>SINPE Móvil</Label>
                <Input value={form.sinpe_details} onChange={e => sf("sinpe_details", e.target.value)} placeholder="Número SINPE y nombre del beneficiario" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: FÓRMULAS (informativo) */}
        <TabsContent value="formulas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Fórmulas de Costo</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Costo de Compra por Unidad</p>
                  <code className="text-xs text-muted-foreground">order_total_paid / total_units</code>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Costo de Importación por Unidad</p>
                  <code className="text-xs text-muted-foreground">(aduana + flete + transporte + extras) / total_units</code>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Costo Real Total</p>
                  <code className="text-xs text-muted-foreground">compra + importación + reparación + costos_locales</code>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Fórmulas de Precio</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Precio Retail</p>
                  <code className="text-xs text-muted-foreground">costo_real / (1 − margen_retail%)</code>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Precio Mayoreo</p>
                  <code className="text-xs text-muted-foreground">costo_real / (1 − margen_mayoreo%)</code>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Precios son calculados automáticamente</p>
                  <code className="text-xs text-muted-foreground">Solo editar perfil de precios → recálculo automático</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}