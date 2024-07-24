//Now deprecated - replaced by the useRealTime.js composable using Socket.io as WebSockets are commonly blocked by VPNs and Proxies

import env from "@/env.js"

import { ref, computed } from 'vue';
import { extractData } from '@/utils/extractJsonAndCode.js';
import { v4 as uuidv4 } from 'uuid';

import { useTokens } from '@/composables/useTokens.js';
const { token, tokenDecoded } = useTokens();

let ws = null;
let wsUuid = ref(null);

let pingInterval;
let pongTimeout;
let sessions = ref({}); //Sessions - Does not need a rework, would work across all


// sessions is assumed to be defined elsewhere and is a ref object
// This function will extract data from the session messages
function getExtracts(sessionKey) {
    return extractData(sessions.value[sessionKey]?.completedMessage || sessions.value[sessionKey]?.partialMessage || "");
}

// This computed property will create a content array from the session keys
let sessionsContent = computed(() => {
    // Create an array to hold the session content
    const content = Object.keys(sessions.value).map((key) => {
        // Create an object for each session with the desired properties
        return {
            content: sessions.value[key].completedMessage || sessions.value[key].partialMessage || "",
            label: 'Socket',
            sessionId: key,
            // Call getExtracts directly instead of creating a new computed property
            extracts: getExtracts(key)
        };
    });

    // Return the array of session content
    return content;
});
 
export function useWebsockets() {

    async function websocketConnection() {
        clearInterval(pingInterval);
        clearTimeout(pongTimeout);

        if (!ws) {
            ws = new WebSocket(env.WEBSOCKET_URL);
            ws.addEventListener('open', handleOpen);
            ws.addEventListener('message', handleMessage);
            ws.addEventListener('close', handleClose);
            ws.addEventListener('error', handleError);
        }
    }

    function handleOpen(event) {
        console.log('WebSocket connection opened:', event);
        pingInterval = setInterval(() => {
            ws.send(JSON.stringify({ type: 'ping' }));
        }, 5000);
    }

    //Reactively handle inbound messages
    function handleMessage(event) {
        try {
            const data = JSON.parse(event.data);

            // If the message contains a uuid, store it in the ref variable
            if (data.uuid) {
                wsUuid.value = data.uuid;
                console.log("Received a Websocket UUID", wsUuid.value)
            }

            if (data.session && sessions.value[data.session]) {
                // Check if the partialMessage ref exists for the session, if not create it
                if (!sessions.value[data.session].partialMessage) {
                    sessions.value[data.session].partialMessage = ref('');
                }

                if (data.type === 'EOM') {
                    sessions.value[data.session].completedMessage = sessions.value[data.session].messages.join('');

                    // Reset the partial message
                    sessions.value[data.session].messages = []; // Reset messages for the session
                    sessions.value[data.session].partialMessage = '';
                    sessions.value[data.session].status = 'complete'
                }
                else if (data.type === 'ERROR') {
                    console.log("Error in LLM response:", data)

                    var errorMessage = "Error: ";
 
                    sessions.value[data.session].status = 'waiting'; //Set a waiting status, to retry once available.
                    sessions.value[data.session].errorMessage = errorMessage + data.message;

                    // Clean up messages to avoid memory bloat
                    sessions.value[data.session].messages = []; // Reset messages for the session
                    sessions.value[data.session].partialMessage = '';
                    sessions.value[data.session].completedMessage = '';
  
                }

                else {
                    // Update the partial message with the new fragment
                    sessions.value[data.session].messages.push(data.message);
                    sessions.value[data.session].partialMessage += data.message;
                    sessions.value[data.session].status = 'inProgress';

                }
            }
            // Handle other messages
        } catch (error) {
            console.log("Error with websocket message", error);
        }
    }

    function handleClose(event) {
        console.log('WebSocket connection closed:', event);
        wsUuid.value = null;

        clearInterval(pingInterval);
        clearTimeout(pongTimeout);



        // Remove event listeners when the WebSocket closes
        if (ws) {
            ws.removeEventListener('open', handleOpen);
            ws.removeEventListener('message', handleMessage);
            ws.removeEventListener('close', handleClose);
            ws.removeEventListener('error', handleError);
            ws = null;
        }

        setTimeout(() => {
            console.log('Attempting to reconnect...');
            ws = null;
            websocketConnection();
        }, 5000);
    }

    function handleError(event) {
        console.log('WebSocket error:', event);
    }

    function sendToServer(uuid, session, provider, model, temperature, systemPrompt, userPrompt, messageHistory, type) {
        if (ws) {
            let wsSendVars = { token:token?.value, uuid, session, provider, model, temperature, systemPrompt, userPrompt, messageHistory,  type }
            ws.send(JSON.stringify(wsSendVars));
        }
    }

    function registerSession(session,  persona, callback) {
        sessions.value[session] = { callback, messages: [], status: 'idle', partialMessage: "", completedMessage: "", persona: persona };
    }

    function unregisterSession(session) {
        console.log("Deleted session", session)
        clearSessionData(session)
        delete sessions.value[session];
    }

    function clearSessionData(sessionId) {
        if (sessions.value[sessionId]) {
            sessions.value[sessionId].messages = [];
            sessions.value[sessionId].partialMessage = '';
            sessions.value[sessionId].completedMessage = '';
            // Any other cleanup that is needed for a session
        }
    }

    return {
        wsUuid,
        sessions,
        sessionsContent,
 
        websocketConnection,
        sendToServer,
        registerSession,
        unregisterSession,
    };
}

