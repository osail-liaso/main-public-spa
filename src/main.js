
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

import Notifications from 'notiwind'

import PrimeVue from 'primevue/config';
import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

import 'aos/dist/aos.css';
// import './css/style.css'

const app = createApp(App)
app.use(PrimeVue);
app.use(router)
app.use(Notifications)
app.mount('#app')

