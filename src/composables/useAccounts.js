import env from "@/env.js"
import { ref, computed } from 'vue'
// import axios from "axios";
import configuredAxios from "@/utils/axios.js"

let newUser = ref({
    username: null,
    password: null,
    password2: null,
    email: null,
    useCase: null,
    notes: null,
})

let responseMessage = ref(null);

let resetPassword = ref({
    resetToken: null,
    password: null,
    password2: null,
})

let accountInfo = ref({});
let downloadInfo = ref({});
let uploadInfo = ref({});

// by convention, composable function names start with "use"
export function useAccounts() {

    function clearToken() {
        tokenSet.value = false;
        localStorage.removeItem('token')
        localStorage.removeItem('tokenDecoded')
    }


    function resetNewUser() {
        newUser.value =
        {
            username: null,
            password: null,
            password2: null,
            email: null,
            useCase: null,
            notes: null,
        }
    }


    function resetResetPassword() {
        resetPassword.value =
        {
            resetToken: null,
            password: null,
            password2: null,
        }
    }


    


    function mailingList(emailAddress) {

        return new Promise(async (resolve, reject) => {

            try {
                var params = {emailAddress};
                await configuredAxios.post('/accounts/mailingList', params);
            }
            catch (error) {
                console.log("Error", error)
                reject(error);

            }
        })
    }


    function newAccount() {

        return new Promise(async (resolve, reject) => {

            try {
                var params = newUser.value;
                // console.log("Params", params)
                var response = await configuredAxios.post('/accounts', params);
                responseMessage.value = response.data.payload;
                resolve(responseMessage.value);
                //TODO enhance to receive the code as well
                // console.log("Loaded Personas", personas.value)
            }
            catch (error) {
                console.log("Error", error)
                reject(error);

            }
        })
    }


    function login(username, password) {
        return new Promise(async (resolve, reject) => {
            try {
                var response = await configuredAxios.post('/accounts/login', { username, password });
                resolve(response.data.payload);
            }
            catch (error) {
                reject(error);
            }
        })
    }
   
    async function ownAccountInfo() {   
        return new Promise(async (resolve, reject) => {
        try {
            let results = await configuredAxios.get('/accounts/own');
            accountInfo.value = results.data.payload;
            resolve(true);
        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }

    
    async function ownAccountUpdate(account) {   
        return new Promise(async (resolve, reject) => {
        try {
            let results = await configuredAxios.post('/accounts/own/update',{account});
            accountInfo.value = results.data.payload;
            resolve(true);
        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }
    
    async function ownDataDownload() {   
        return new Promise(async (resolve, reject) => {
        try {
             let response = await configuredAxios.post('/accounts/own/data/download', {}, {
                responseType: 'blob', // Important: Set the response type to 'blob' for binary data
              });
          
              // Create a Blob from the response data and create a URL for it
              const url = window.URL.createObjectURL(new Blob([response.data]));
              
              // Create a link element and set the URL as the href
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'data.zip'); // Set the default file name for the download
          
              // Append the link to the body, trigger the click, then remove the link
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          
              // Optionally, revoke the blob URL to free up memory
              window.URL.revokeObjectURL(url);


        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }

    async function ownDataUpload(file) {   

        return new Promise(async (resolve, reject) => {
        try {
            const formData = new FormData();
            formData.append('data', file); // 'data' is the field name that multer expects on the server side
            let results = await configuredAxios.post('/accounts/own/data/upload', formData, {headers:{'Content-Type': 'multipart/form-data'}});
            uploadInfo.value = results.data.payload;
            console.log('File upload rejections', uploadInfo.value)
            resolve(true);
        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }

    async function ownDataDelete() {   
        return new Promise(async (resolve, reject) => {
        try {
            let results = await configuredAxios.post('/accounts/own/data/delete');
            accountInfo.value = results.data.payload;
            resolve(true);
        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }

    async function ownAccountDelete() {   
        return new Promise(async (resolve, reject) => {
        try {
            let results = await configuredAxios.post('/accounts/own/delete');
            accountInfo.value = results.data.payload;
            resolve(true);
        }
        catch (error) {
            console.log("Error", error);
            reject(error);
        }
    });
    }

    function sendPasswordResetRequest(email) {
        //Create a password reset token
        //Send it to the email address
    }

    function attemptPasswordReset(token) {
        //Submit the new passwords
    }

    // expose managed state as return value
    return {
        newUser,
        resetPassword,
        accountInfo,
        clearToken,
        
        mailingList,
        resetNewUser,
        resetResetPassword,
        newAccount,
        login,
        sendPasswordResetRequest,
        attemptPasswordReset,


        ownAccountInfo,
        ownAccountUpdate,
        
        ownDataDownload,
        ownDataUpload,
        ownDataDelete,
        
        ownAccountDelete

    }
}