import { ref } from 'vue';

export const attach = ref<string | HTMLElement | null>('#mock-overlay-root');
export const teleport = ref(true);
export const shadowRoot = ref<ShadowRoot | null>(null);

export function resolveAttachTarget(host: HTMLElement | null) {
  const root = host?.getRootNode();
  shadowRoot.value = root instanceof ShadowRoot ? root : null;
  return shadowRoot.value ?? attach.value;
}

export function updateLocation(location?: string) {
  return location ?? 'bottom start';
}

export function makeOverlayProps(host: HTMLElement | null) {
  return {
    attach: resolveAttachTarget(host),
    teleport: teleport.value,
    'onUpdate:location': updateLocation,
  };
}