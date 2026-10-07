import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardPage from '../pages/DashboardPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: DashboardPage },
  { path: '/users', name: 'users', component: () => import('../pages/UserSearchPage.vue') },
  { path: '/grid', name: 'grid', component: () => import('../pages/GridExportPage.vue') },
  { path: '/settings', name: 'settings', component: () => import('../pages/SettingsPage.vue') },
  { path: '/calendar', name: 'calendar', component: () => import('../pages/CalendarOpsPage.vue') },
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
];

export default createRouter({
  history: createWebHistory('/mock/'),
  routes,
});