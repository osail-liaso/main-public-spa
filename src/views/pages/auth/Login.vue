<script setup>
import { ref, computed, onMounted } from 'vue';
import AppConfig from '@/layout/AppConfig.vue';

import { useLayout } from '@/layout/composables/layout';
const { layoutConfig } = useLayout();

import { useTokens } from '@/composables/useTokens.js';
const {  setTokens, unsetTokens } = useTokens();

import { useAccounts } from '@/composables/useAccounts.js';
const {  login } = useAccounts();

import { useRouter } from 'vue-router';
const router = useRouter();


import Message from 'primevue/inlinemessage';

let loginError = ref(false)
const username = ref();
const password = ref();
const checked = ref(false);
const logoUrl = computed(() => {
    return `/layout/images/${layoutConfig.darkTheme.value ? 'logo-white' : 'logo-dark'}.svg`;
});

onMounted(()=>{
    unsetTokens();
})

function doLogin()
{
    login(username.value, password.value).then((success)=>{
        loginError.value = false;
        setTokens(success.token, success.tokenDecoded);
        router.push('/dashboard');
    }).catch((error)=>{
        loginError.value = true;
        console.log('Login error:', error)
    })
}
</script>

<template>
        <Toast />

    <div class="surface-ground flex align-items-center justify-content-center min-h-screen min-w-screen overflow-hidden">
        <div class="flex flex-column align-items-center justify-content-center">
            <img :src="logoUrl" alt="OSAIL-LIASO logo" class="mb-5 w-6rem flex-shrink-0" />
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full surface-card py-8 px-5 sm:px-8" style="border-radius: 53px">
                    <div class="text-center mb-5">
                        <img src="/demo/images/login/avatar.png" alt="Image" height="50" class="mb-3" />
                        <div class="text-900 text-3xl font-medium mb-3">Welcome</div>
                        <span class="text-600 font-medium">Sign in to continue</span>
                    </div>

                    <div>
                        <form>
                        <label for="username1" class="block text-900 text-xl font-medium mb-2">Username</label>
                        <InputText id="username1" type="text" placeholder="Username" class="w-full md:w-30rem mb-5" style="padding: 1rem" v-model="username" />

                        <label for="password1" class="block text-900 font-medium text-xl mb-2">Password</label>
                        <Password id="password1" v-model="password" placeholder="Password" :toggleMask="true" class="w-full mb-3" inputClass="w-full" :inputStyle="{ padding: '1rem' }"></Password>
                    </form>
                        <div class="flex align-items-center justify-content-between mb-5 gap-5">
                            <!-- <div class="flex align-items-center">
                                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                                <label for="rememberme1">Remember me</label>
                            </div> -->
                            <!-- <a class="font-medium no-underline ml-2 text-right cursor-pointer" style="color: var(--primary-color)">Forgot password?</a> -->
                        </div>
                        <Button @click = "doLogin" label="Sign In" class="w-full p-3 text-xl"></Button>
                        <Message v-if = "loginError" severity = "error" :closable="false"  class = "w-full mt-2">Login failed. Please try again.</Message>

                    </div>
                </div>
            </div>
        </div>
    </div>
    <AppConfig simple />
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
