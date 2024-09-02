
<template>
    <router-view />
</template>

<script setup>
import env from "@/env.js"
import { onMounted } from 'vue'

import { useRealTime } from '@/composables/useRealTime.js'
const { websocketConnection, socketIoConnection } = useRealTime()

import { useModels } from '@/composables/useModels.js'
const { getModels, adminModels, selectedModel } = useModels();


onMounted(()=>{
    console.log("App Booted with .env", env);

    //One protocol or the other is recommended
    // websocketConnection();
    socketIoConnection();
    getModels();    

})

</script>

<style scoped></style>
