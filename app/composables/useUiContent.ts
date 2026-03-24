export function useUiContent() {
  return useAsyncData('ui-content', () => queryCollection('ui').first(), {
    dedupe: 'defer'
  });
}
