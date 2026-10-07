import {
  VBtn,
  VDatePicker,
  VExpansionPanel,
  VExpansionPanels,
  VExpansionPanelTitle,
  VIcon,
  VOverlay,
  VProgressLinear,
} from 'vuetify/components';
import { VDataTable, VDataTableFooter, VDateInput, VNumberInput } from 'vuetify/labs/components';

export const directVuetifyComponents = {
  VBtn,
  VDatePicker,
  VExpansionPanel,
  VExpansionPanels,
  VExpansionPanelTitle,
  VIcon,
  VOverlay,
  VProgressLinear,
  VDataTable,
  VDataTableFooter,
  VDateInput,
  VNumberInput,
};

export function resolveDirectVuetifyComponent(name: keyof typeof directVuetifyComponents) {
  return directVuetifyComponents[name];
}