
export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CROPPING = 'CROPPING'
}

export enum Language {
  PT = 'PT',
  EN = 'EN'
}

export interface ImagePreview {
  url: string;
  base64: string;
  mimeType: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Detectar automaticamente', nameEn: 'Auto Detect' },
  { code: 'pt', name: 'Português', nameEn: 'Portuguese' },
  { code: 'en', name: 'Inglês', nameEn: 'English' },
  { code: 'es', name: 'Espanhol', nameEn: 'Spanish' },
  { code: 'fr', name: 'Francês', nameEn: 'French' },
  { code: 'de', name: 'Alemão', nameEn: 'German' },
  { code: 'it', name: 'Italiano', nameEn: 'Italian' },
  { code: 'ja', name: 'Japonês', nameEn: 'Japanese' },
  { code: 'zh', name: 'Chinês', nameEn: 'Chinese' }
];

export interface TranslationSchema {
  title: string;
  subtitle: string;
  inputHeader: string;
  outputHeader: string;
  dropzoneMain: string;
  dropzoneSub: string;
  pasteHint: string;
  urlPlaceholder: string;
  btnLoad: string;
  btnExtract: string;
  btnChange: string;
  btnCopy: string;
  btnCopied: string;
  loadingTitle: string;
  loadingSub: string;
  emptyOutput: string;
  emptyOutputSub: string;
  footerNote: string;
  errorTitle: string;
  errorDefault: string;
  zoomIn: string;
  zoomOut: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  translateToggle: string;
  noTranslation: string;
  keyRequiredTitle: string;
  keyRequiredDesc: string;
  btnSelectKey: string;
  keyInfo: string;
  btnCrop: string;
  btnCropConfirm: string;
  donationTitle: string;
  donationDesc: string;
  btnDonate: string;
}
