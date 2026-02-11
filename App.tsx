import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { AppStatus, ImagePreview, Language, SUPPORTED_LANGUAGES, CropArea } from './types';
import { translations } from './translations';
import { extractTextFromImage } from './services/geminiService';
import { Button } from './components/Button';
import { 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  RefreshCw, 
  MousePointer2, 
  Maximize2, 
  X, 
  Scan, 
  Globe, 
  ArrowRightLeft, 
  Crop as CropIcon, 
  Coffee, 
  Github, 
  Instagram,
  Link,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('ocrlens_apikey') || '');
  const [tempKeyInput, setTempKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  
  const [image, setImage] = useState<ImagePreview | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<Language>(Language.PT);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // React Image Crop States
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  
  // OCR Settings
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('pt');
  const [enableTranslation, setEnableTranslation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const obfuscateKey = (key: string) => {
    if (!key) return "Nenhuma chave vinculada";
    if (key.length <= 12) return "••••••••••••";
    return `${key.substring(0, 6)}••••••••${key.substring(key.length - 4)}`;
  };

  const handleSaveKey = (e?: React.FormEvent) => {
    e?.preventDefault();
    const key = tempKeyInput.trim();
    if (key) {
      setUserApiKey(key);
      localStorage.setItem('ocrlens_apikey', key);
      setTempKeyInput('');
      setShowConfigModal(false);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const { width, height } = e.currentTarget;
  
  // Definimos o aspect explicitamente (ex: 1 ou 16/9) ou 
  // deixamos a lógica de fallback clara para o TS
  const aspect = 1; 

  const initialCrop = centerCrop(
    makeAspectCrop(
      { unit: '%', width: 80 },
        aspect,
        width,
        height
      ),
      width,
      height
    );
    
    setCrop(initialCrop);
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: PixelCrop): Promise<ImagePreview> => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';
    
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    const scaleX = image.naturalWidth / (imgRef.current?.width || image.naturalWidth);
    const scaleY = image.naturalHeight / (imgRef.current?.height || image.naturalHeight);

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve({
            url: URL.createObjectURL(blob),
            base64: (reader.result as string).split(',')[1],
            mimeType: blob.type
          });
        };
      }, 'image/png');
    });
  };

  const applyCrop = async () => {
    if (rawImageUrl && completedCrop) {
      setStatus(AppStatus.LOADING);
      try {
        const cropped = await getCroppedImg(rawImageUrl, completedCrop);
        setImage(cropped);
        setStatus(AppStatus.IDLE);
      } catch (e) {
        setError('Erro ao processar o recorte.');
        setStatus(AppStatus.IDLE);
      }
    }
  };

  const processFile = useCallback((file: File) => {
    setError('');
    setResult('');
    const url = URL.createObjectURL(file);
    setRawImageUrl(url);
    setStatus(AppStatus.CROPPING);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setStatus(AppStatus.LOADING);
    try {
      const response = await fetch(urlInput);
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error();
      const file = new File([blob], "img_url", { type: blob.type });
      processFile(file);
      setUrlInput('');
    } catch (err) {
      setError(t.errorDefault);
      setStatus(AppStatus.IDLE);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (status === AppStatus.CROPPING || showConfigModal) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) { processFile(file); break; }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile, status, showConfigModal]);

  const handleOCR = async () => {
    if (!image) return;
    setStatus(AppStatus.LOADING);
    setError('');
    try {
      const text = await extractTextFromImage(image.base64, image.mimeType, sourceLang, enableTranslation ? targetLang : null);
      setResult(text);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || t.errorDefault);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setImage(null);
    setRawImageUrl(null);
    setResult('');
    setStatus(AppStatus.IDLE);
    setError('');
    setCompletedCrop(undefined);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center selection:bg-[#1f6feb]/30">
      
      {/* Global Actions Bar - Sized & Unified */}
      <div className="fixed top-6 right-6 flex items-center gap-2 z-50">
        <button 
          onClick={() => setLang(l => l === Language.PT ? Language.EN : Language.PT)}
          className="h-10 px-4 bg-[#21262d] border border-[#30363d] rounded-lg text-sm font-bold text-[#c9d1d9] hover:bg-[#30363d] hover:border-[#8b949e] transition-all flex items-center justify-center min-w-[50px] shadow-sm"
        >
          {lang}
        </button>
        <button 
          onClick={() => setShowConfigModal(true)}
          className="h-10 w-10 bg-[#21262d] border border-[#30363d] rounded-lg flex items-center justify-center text-[#c9d1d9] hover:bg-[#30363d] hover:border-[#8b949e] transition-all shadow-sm"
          title="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="max-w-6xl w-full px-6 pt-16 pb-20">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-3 justify-center sm:justify-start">
            <div className="p-2.5 bg-[#21262d] border border-[#30363d] rounded-xl shadow-inner">
              <Scan size={28} className="text-[#58a6ff]" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-[#f0f6fc] tracking-tighter">OCRLens</h1>
          </div>
          <p className="text-[#8b949e] text-lg sm:text-xl max-w-2xl text-center sm:text-left leading-relaxed">
            {t.subtitle}
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          <div className="lg:col-span-7 space-y-8">
            
            {status === AppStatus.CROPPING && rawImageUrl && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="relative min-h-[400px] flex items-center justify-center bg-black p-4">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    style={{ maxHeight: '70vh' }}
                  >
                    <img
                      ref={imgRef}
                      alt="Crop selection"
                      src={rawImageUrl}
                      onLoad={onImageLoad}
                      style={{ maxHeight: '70vh', width: 'auto' }}
                    />
                  </ReactCrop>
                </div>
                <div className="p-5 border-t border-[#30363d] flex items-center justify-between bg-[#0d1117]/80 backdrop-blur-md">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#8b949e] max-w-[200px]">
                    Arraste os pontos para selecionar a área de texto livremente
                  </p>
                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
                    <Button variant="accent" size="sm" onClick={applyCrop}>{t.btnCropConfirm}</Button>
                  </div>
                </div>
              </div>
            )}

            {!image && status !== AppStatus.CROPPING && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg transition-all hover:border-[#30363d]/80">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-16 text-center hover:bg-[#21262d]/30 transition-all cursor-pointer group border-b border-[#30363d]/50"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <div className="w-16 h-16 bg-[#21262d] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#30363d] group-hover:scale-105 transition-transform">
                    <Upload size={24} className="text-[#30363d] group-hover:text-[#58a6ff] transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-[#f0f6fc] mb-2">{t.dropzoneMain}</h3>
                  <p className="text-[#8b949e] text-sm mb-6">{t.dropzoneSub}</p>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-full text-[9px] text-[#8b949e] uppercase font-bold tracking-[0.1em]">
                    <MousePointer2 size={10} /> {t.pasteHint}
                  </div>
                </div>
                
                <div className="p-6 bg-[#0d1117]/40">
                  <form onSubmit={handleUrlSubmit} className="flex gap-3">
                    <div className="relative flex-1">
                       <Link size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                       <input 
                        type="url"
                        placeholder={t.urlPlaceholder}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-3 text-xs outline-none focus:border-[#58a6ff] text-[#c9d1d9] transition-all"
                      />
                    </div>
                    <Button type="submit" variant="secondary" size="sm" className="px-5 font-bold" disabled={!urlInput.trim()}>{t.btnLoad}</Button>
                  </form>
                </div>
              </div>
            )}

            {(image || result) && status !== AppStatus.CROPPING && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {image && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#30363d] group">
                      <img src={image.url} className="w-full h-full object-contain" alt="Selected" />
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <Button variant="secondary" size="sm" onClick={() => setIsZoomed(true)} className="bg-[#161b22]/80 backdrop-blur-md border-[#30363d]"><Maximize2 size={16} /></Button>
                        <Button variant="danger" size="sm" onClick={reset} className="bg-[#161b22]/80 backdrop-blur-md border-[#30363d]"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-col sm:flex-row gap-4">
                      <Button className="flex-1 h-12 text-md font-bold" onClick={handleOCR} isLoading={status === AppStatus.LOADING} disabled={status === AppStatus.LOADING}>
                        {t.btnExtract}
                      </Button>
                      <Button variant="secondary" className="sm:px-8 h-12 border-[#30363d]" onClick={() => setStatus(AppStatus.CROPPING)} disabled={status === AppStatus.LOADING}>
                        <CropIcon size={20} className="mr-2" /> {t.btnCrop}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col min-h-[500px] shadow-lg overflow-hidden">
                  <div className="p-5 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${status === AppStatus.LOADING ? 'bg-[#58a6ff] animate-ping' : 'bg-[#3fb950]'}`} />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b949e]">{t.outputHeader}</h2>
                    </div>
                    {result && (
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="text-[#58a6ff] font-bold">
                        {copied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />}
                        {copied ? t.btnCopied : t.btnCopy}
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 p-8 font-mono text-sm leading-relaxed overflow-auto scroll-smooth">
                    {status === AppStatus.LOADING ? (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="relative mb-6">
                           <RefreshCw size={56} className="animate-spin text-[#58a6ff] opacity-20" />
                           <Scan size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#58a6ff]" />
                        </div>
                        <p className="font-bold text-[#f0f6fc] text-xl mb-1">{t.loadingTitle}</p>
                        <p className="text-sm text-[#8b949e]">{t.loadingSub}</p>
                      </div>
                    ) : result ? (
                      <pre className="whitespace-pre-wrap text-[#c9d1d9] selection:bg-[#1f6feb]/50">{result}</pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <FileText size={64} className="text-[#30363d] mb-6" />
                        <p className="text-[#8b949e] max-w-xs">{t.emptyOutputSub}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-5 space-y-8 sticky top-24">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden divide-y divide-[#30363d]/50">
              <div className="p-7">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b949e] mb-6 flex items-center gap-2">
                  <Globe size={16} /> {t.inputHeader}
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#8b949e] ml-1">{t.sourceLangLabel}</label>
                    <select 
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-3 text-sm outline-none focus:border-[#58a6ff] text-[#c9d1d9] font-semibold cursor-pointer transition-all hover:bg-[#21262d]"
                    >
                      {SUPPORTED_LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{lang === Language.PT ? l.name : l.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 space-y-5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-all ${enableTranslation ? 'bg-[#58a6ff]/10 text-[#58a6ff] shadow-[0_0_15px_rgba(88,166,255,0.1)]' : 'bg-[#21262d] text-[#8b949e]'}`}>
                          <ArrowRightLeft size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#f0f6fc]">{t.translateToggle}</p>
                          <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-tight">{enableTranslation ? 'Status: Ativado' : t.noTranslation}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEnableTranslation(!enableTranslation)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shadow-inner ${enableTranslation ? 'bg-[#238636]' : 'bg-[#30363d]'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${enableTranslation ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {enableTranslation && (
                      <div className="pt-4 border-t border-[#30363d] animate-in slide-in-from-top-4">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#8b949e] ml-1 mb-3 block">{t.targetLangLabel}</label>
                        <select 
                          value={targetLang}
                          onChange={(e) => setTargetLang(e.target.value)}
                          className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-3 text-sm outline-none focus:border-[#58a6ff] text-[#c9d1d9] font-semibold cursor-pointer transition-all hover:bg-[#0d1117]"
                        >
                          {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(l => (
                            <option key={l.code} value={l.code}>{lang === Language.PT ? l.name : l.nameEn}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-7 bg-[#0d1117]/20 relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-all group-hover:scale-110 duration-500 pointer-events-none">
                  <Coffee size={120} className="text-[#58a6ff]" />
                </div>
                <h3 className="font-bold text-[#f0f6fc] text-lg mb-2 flex items-center gap-2">
                  <Coffee size={20} className="text-[#58a6ff]" /> {t.donationTitle}
                </h3>
                <p className="text-[#8b949e] text-xs leading-relaxed mb-6 max-w-[240px]">
                  {t.donationDesc}
                </p>
                <Button 
                  variant="accent" 
                  className="w-full h-12 gap-3 shadow-lg shadow-[#1f6feb]/20 font-bold"
                  onClick={() => window.open('https://tipa.ai/valesthor', '_blank')}
                >
                  <Coffee size={18} /> {t.btnDonate}
                </Button>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <footer className="w-full max-w-6xl px-6 py-16 border-t border-[#30363d] flex flex-col md:flex-row items-center justify-between gap-10 text-[#8b949e] text-sm">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
             <p className="font-black text-[#f0f6fc] text-xl tracking-tight">OCRLens</p>
             <span className="text-[9px] font-bold px-2.5 py-1 bg-[#1f6feb]/15 text-[#58a6ff] border border-[#58a6ff]/20 rounded-full uppercase tracking-tighter">Open Source</span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
          <div className="flex items-center gap-6">
            <a href="https://github.com/valesthor/ocrlens" target="_blank" className="hover:text-[#f0f6fc] transition-all flex items-center gap-2 font-semibold group">
              <Github size={18} className="group-hover:scale-110 transition-transform" /> GitHub
            </a>
            <a href="https://www.instagram.com/valdmirdsvieira/" target="_blank" className="hover:text-[#f0f6fc] transition-all flex items-center gap-2 font-semibold group">
              <Instagram size={18} className="group-hover:scale-110 transition-transform" /> Instagram
            </a>
          </div>
          <div className="hidden md:block w-px h-6 bg-[#30363d]" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#30363d]">&copy; {new Date().getFullYear()} OCRLens Engine</p>
        </div>
      </footer>

      {showConfigModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowConfigModal(false)}>
           <div className="max-w-md w-full bg-[#161b22] p-8 rounded-2xl border border-[#30363d] shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <Settings size={18} className="text-[#58a6ff]" />
                  </div>
                  <h3 className="font-bold text-[#f0f6fc] uppercase tracking-widest text-[11px]">Configuração da Lente</h3>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-[#0d1117] p-5 rounded-2xl border border-[#30363d] shadow-inner">
                    <p className="text-[10px] text-[#8b949e] mb-3 uppercase font-black tracking-[0.2em]">Chave Atual</p>
                    <div className="flex items-center justify-between gap-3 bg-[#161b22] px-4 py-3 rounded-xl border border-[#30363d]">
                       <p className="text-xs font-mono text-[#58a6ff] truncate">{obfuscateKey(userApiKey)}</p>
                       {userApiKey && (
                         <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] uppercase font-bold text-red-400 hover:text-red-300" onClick={() => { setUserApiKey(''); localStorage.removeItem('ocrlens_apikey'); }}>Remover</Button>
                       )}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest">Colar Nova Chave API</p>
                    <div className="relative">
                       <input 
                        type={showKey ? "text" : "password"}
                        placeholder="Cole sua API key aqui..."
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs font-mono text-[#c9d1d9] outline-none focus:border-[#58a6ff] transition-all"
                        value={tempKeyInput}
                        onChange={(e) => setTempKeyInput(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#f0f6fc]">
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <Button className="flex-1 h-11 font-bold" onClick={handleSaveKey} disabled={!tempKeyInput.trim()}>
                       Salvar Chave
                    </Button>
                    <Button variant="secondary" className="h-11 px-6 border-[#30363d]" onClick={() => setShowConfigModal(false)}>
                       Fechar
                    </Button>
                 </div>

                 <p className="text-[10px] text-[#8b949e] leading-relaxed text-center px-4">
                    Obtenha uma chave gratuita em <a href="https://ai.google.dev/gemini-api/docs/quickstart?hl=pt-br" target="_blank" className="text-[#58a6ff] hover:underline font-bold">Google AI Studio</a>.
                 </p>
              </div>
           </div>
        </div>
      )}

      {isZoomed && image && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setIsZoomed(false)}>
          <button 
            onClick={() => setIsZoomed(false)} 
            className="absolute top-8 right-8 rounded-full w-14 h-14 flex items-center justify-center bg-[#21262d] text-white hover:bg-[#30363d] shadow-2xl border border-[#30363d] transition-all"
            aria-label="Fechar zoom"
          >
            <X size={28} />
          </button>
          <img src={image.url} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 select-none pointer-events-none" alt="Zoomed" />
        </div>
      )}
    </div>
  );
};

export default App;