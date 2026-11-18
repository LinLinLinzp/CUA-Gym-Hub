import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {stateApi} from '../../templates/state-api.js'
import {createInitialData} from './src/data/seed.js'
export default defineConfig({ plugins: [react(),stateApi(createInitialData)], server: {host:'0.0.0.0',port:5305,strictPort:true}, preview:{host:'0.0.0.0',port:5305,strictPort:true} })
