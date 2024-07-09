
<template>
    <router-view />
</template>

<script setup>
import env from "@/env.js"
import { onMounted } from 'vue'

import { useWebsockets } from '@/composables/useWebsockets.js'
const { websocketConnection } = useWebsockets()


onMounted(()=>{
    console.log("App Booted with .env", env);
    websocketConnection();

})

</script>

<style scoped></style>
