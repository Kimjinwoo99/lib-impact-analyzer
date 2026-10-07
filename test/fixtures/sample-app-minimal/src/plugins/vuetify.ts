import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import { VDatePicker, VExpansionPanel, VExpansionPanels, VExpansionPanelTitle, VOverlay, VProgressLinear } from 'vuetify/components';
import { VDataTable, VDateInput, VNumberInput } from 'vuetify/labs/components';

export default createVuetify({
  aliases: {
    VDataTable,
    VDateInput,
    VNumberInput,
  },
  defaults: {
    VBtn: { rounded: 'sm', density: 'comfortable' },
    VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VDatePicker: { color: 'primary', showAdjacentMonths: true },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#2563eb',
          secondary: '#0f766e',
          error: '#dc2626',
        },
      },
    },
  },
});