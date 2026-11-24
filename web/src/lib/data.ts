export interface Plan {
  name: string;
  price: number;
  unit: string;
  sessions: string;
  freq: string;
  note?: string;
}

export interface ClassTemplate {
  day: number;
  time: string;
  service: 'Group Strength' | 'Tropical Jump';
  coach: string;
  capacity: number;
}

function personalPlan(frequency: number, price: number, prefix = ''): Plan {
  return {
    name: `${prefix}${frequency}x / week`,
    price,
    unit: 'per 4 weeks',
    sessions: `${frequency * 4} sessions`,
    freq: `${frequency} sessions per week`,
  };
}

export const personalOneOnOne = [
  personalPlan(2, 800),
  personalPlan(3, 1080),
  personalPlan(4, 1280),
];
export const personalPartner = [
  personalPlan(2, 1127, 'Partner '),
  personalPlan(3, 1447, 'Partner '),
  personalPlan(4, 1597, 'Partner '),
];

export const groupPlans: Plan[] = [
  {
    name: '8-Class Pack',
    price: 260,
    unit: 'per 4 weeks',
    sessions: '8 classes',
    freq: '2 classes per week',
  },
  {
    name: '16-Week Commitment',
    price: 200,
    unit: 'per 4-week period',
    sessions: '8 classes / period',
    freq: '4 billing periods',
    note: 'Requires a 16-week commitment (4 billing periods).',
  },
];

export const jumpPlans: Plan[] = [
  {
    name: 'Single Class',
    price: 15,
    unit: 'per class',
    sessions: '1 class',
    freq: 'Drop in anytime',
  },
  {
    name: 'First Class',
    price: 0,
    unit: 'first visit',
    sessions: '1 class',
    freq: 'New clients only',
    note: 'One per client account.',
  },
];

function jumpClass(day: number, time: string): ClassTemplate {
  return {
    day,
    time,
    service: 'Tropical Jump',
    coach: 'Coach JQ',
    capacity: 12,
  };
}

function strengthClasses(day: number): ClassTemplate[] {
  return ['9:00 AM', '5:30 PM', '7:00 PM'].map((time) => ({
    day,
    time,
    service: 'Group Strength',
    coach: 'Coach JQ',
    capacity: 6,
  }));
}

export const classTemplates = [
  jumpClass(1, '7:30 PM'),
  ...strengthClasses(2),
  jumpClass(3, '7:30 PM'),
  ...strengthClasses(4),
  jumpClass(6, '9:00 AM'),
];

export function availability(
  spotsLeft: number,
): 'full' | 'almost' | 'available' {
  if (spotsLeft <= 0) return 'full';
  if (spotsLeft <= 2) return 'almost';
  return 'available';
}

export function formatPrice(price: number): string {
  if (price === 0) return 'FREE';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2 })}`;
}
