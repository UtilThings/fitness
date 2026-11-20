export type Lang = 'en' | 'es';
export const STORAGE_KEY = 'jq-lang';
export const LANG_EVENT = 'jq-lang-change';

const en = {
  home: 'Home',
  personal: 'Personal Training',
  group: 'Group Strength',
  jump: 'Tropical Jump',
  online: 'Online Coaching',
  schedule: 'Schedule',
  pricing: 'Pricing',
  about: 'About',
  contact: 'Contact',
  login: 'Client Login',
  heroTitle: 'Stronger every day.',
  heroSub:
    'Personal training, strength classes, and high-energy workouts designed to help you become your strongest self.',
  book: 'Book your class',
  explore: 'Explore memberships',
  programs: 'Our programs',
  learnMore: 'Learn more',
  viewSchedule: 'View schedule',
  ctaTitle: 'Your first class is on us.',
  ctaSub:
    'Try Tropical Jump or a Group Strength intro class free. No pressure — just energy.',
  inquire: 'Inquire now',
  spots: 'spots left',
  full: 'Full',
  almost: 'Almost full',
  available: 'Available',
  reserve: 'Reserve',
  waitlist: 'Join waitlist',
};

export type Key = keyof typeof en;

const es: Record<Key, string> = {
  home: 'Inicio',
  personal: 'Entrenamiento Personal',
  group: 'Fuerza en Grupo',
  jump: 'Tropical Jump',
  online: 'Coaching Online',
  schedule: 'Horario',
  pricing: 'Precios',
  about: 'Nosotros',
  contact: 'Contacto',
  login: 'Acceso Clientes',
  heroTitle: 'Más fuerte cada día.',
  heroSub:
    'Entrenamiento personal, clases de fuerza y entrenamientos de alta energía para ayudarte a ser tu versión más fuerte.',
  book: 'Reserva tu clase',
  explore: 'Ver membresías',
  programs: 'Nuestros programas',
  learnMore: 'Ver más',
  viewSchedule: 'Ver horario',
  ctaTitle: 'Tu primera clase es gratis.',
  ctaSub:
    'Prueba Tropical Jump o una clase introductoria de Fuerza en Grupo. Sin presión — solo energía.',
  inquire: 'Consultar',
  spots: 'cupos',
  full: 'Lleno',
  almost: 'Casi lleno',
  available: 'Disponible',
  reserve: 'Reservar',
  waitlist: 'Lista de espera',
};

export const dictionary = { en, es };

export function translate(lang: Lang, key: Key): string {
  return dictionary[lang][key];
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es';
}

export function readStoredLang(storage: Pick<Storage, 'getItem'>): Lang {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return isLang(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

export function storeLang(storage: Pick<Storage, 'setItem'>, lang: Lang): void {
  try {
    storage.setItem(STORAGE_KEY, lang);
  } catch {
    // The active language still works when the browser blocks storage.
  }
}
