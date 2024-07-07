
<template>
    <router-view />
</template>

<script setup>
import env from "@/env.js"
import { onMounted } from 'vue'

onMounted(()=>{
    console.log("App Booted with .env", env)
})

</script>

<style scoped></style>
