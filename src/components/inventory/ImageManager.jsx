import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, Star, StarOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PLACEHOLDER = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop";

export default function ImageManager({ images = [], mainImage = null, onChange }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newUrls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
    }
    const updated = [...images, ...newUrls];
    onChange({ images: updated, main_image: mainImage || updated[0] });
    setUploading(false);
    toast({ title: `${newUrls.length} imagen(es) subida(s)` });
  };

  const handleRemove = (url) => {
    const updated = images.filter(i => i !== url);
    const newMain = mainImage === url ? (updated[0] || null) : mainImage;
    onChange({ images: updated, main_image: newMain });
  };

  const handleSetMain = (url) => {
    onChange({ images, main_image: url });
  };

  const displayImage = (url) => url || PLACEHOLDER;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url) => (
          <div key={url} className="relative group w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
            <img
              src={displayImage(url)}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { e.target.src = PLACEHOLDER; }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handleSetMain(url)}
                className="p-1 rounded text-white hover:text-yellow-400"
                title="Establecer como principal"
              >
                {mainImage === url ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="p-1 rounded text-white hover:text-red-400"
                title="Eliminar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {mainImage === url && (
              <div className="absolute top-1 left-1 bg-yellow-400 text-black text-xs px-1 rounded font-bold">Principal</div>
            )}
          </div>
        ))}

        <label className={`w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground mt-1">Subir</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </label>
      </div>
      {images.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin imágenes. Sube una para mostrar en catálogo.</p>
      )}
    </div>
  );
}