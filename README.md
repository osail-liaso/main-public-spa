
# OSAIL-LAISO 
OSAIL is a Cloud-based and downloadable tool to build and interact with Large Language Models (LLMs).
It facilitates much better interaction with Large Language Model services like Open AI's GPT, Anthropic's Claude, Mistral's Mixtral models, etc.

## About
OSAIL is built in 2 parts, a Vue.js web interface (this package) and a Node.js server side application.

## Configuration

- VITE_APP_VERSION=$npm_package_version
- VITE_SELF=http://localhost:5173
- VITE_API_URL=http://localhost:3000 
- VITE_WEBSOCKET_URL=ws://localhost:3000
- VITE_STORAGE_URL=https://[my-storage-account].blob.core.windows.net

# Application Logic (UI) License
The MIT License (MIT)

Copyright (c) 2023-current OSAIL-LIASO

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

