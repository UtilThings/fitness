import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Aura con el color primario esmeralda. */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: Object.fromEntries(
      shades.map((s) => [s, `{emerald.${s}}`]),
    ) as Record<(typeof shades)[number], string>,
  },
});
