import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Join from '@/pages/Join.vue'
import Login from '@/pages/Login.vue'

import PromptPainter from '@/components/PromptPainter.vue'

const routerHistory = createWebHistory()

const router = createRouter({
  scrollBehavior(to) {
    if (to.hash) {
      window.scroll({ top: 0 })
    } else {
      document.querySelector('html').style.scrollBehavior = 'auto'
      window.scroll({ top: 0 })
      document.querySelector('html').style.scrollBehavior = ''
    }
  },
  history: routerHistory,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/tools/promptPainter',
      name: 'promptPainter',
      component: PromptPainter
    },
    {
 
      path: '/join',
      name: 'join',
      component: Join
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    
    {
      path: '/:pathMatch(.*)*',
      component: Home
    }
  ]
})

export default router
