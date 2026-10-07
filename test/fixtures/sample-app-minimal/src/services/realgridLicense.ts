import { LocalDataProvider, GridView } from 'realgrid';

export function createAuditGrid(container: HTMLElement) {
  const provider = new LocalDataProvider(false);
  const gridView = new GridView(container);

  provider.setFields([
    { fieldName: 'name', dataType: 'text' },
    { fieldName: 'status', dataType: 'text' },
    { fieldName: 'joinedAt', dataType: 'datetime' },
  ]);

  gridView.setDataSource(provider);
  gridView.setColumns([
    { name: 'name', fieldName: 'name', header: { text: 'Name' }, width: 160 },
    { name: 'status', fieldName: 'status', header: { text: 'Status' }, width: 120 },
    { name: 'joinedAt', fieldName: 'joinedAt', header: { text: 'Joined' }, width: 160 },
  ]);

  return { provider, gridView };
}