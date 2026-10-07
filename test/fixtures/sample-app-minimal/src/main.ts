import { createApp } from 'vue';
import { createPinia } from 'pinia';
import axios from 'axios';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import './styles/main.css';

axios.defaults.baseURL = '/api/mock';
axios.defaults.headers.common['X-Client'] = 'sample-app-minimal';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount('#app');