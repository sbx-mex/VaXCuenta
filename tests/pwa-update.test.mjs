import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPWA} from '../pwa.mjs';

async function environment(controller=true){
  const buttons=new Map(),serviceEvents={},registrationEvents={},messages=[],toasts=[];let reloads=0;
  const element=id=>{if(!buttons.has(id))buttons.set(id,{hidden:true,disabled:false,listeners:{},classList:{toggle(){}},addEventListener(type,fn){this.listeners[type]=fn;}});return buttons.get(id);};
  const worker={postMessage:message=>messages.push(message)};
  const registration={waiting:worker,addEventListener:(type,fn)=>registrationEvents[type]=fn};
  globalThis.document={querySelector:element,addEventListener(){}};
  globalThis.window={isSecureContext:true,addEventListener(){},matchMedia:()=>({matches:false}),location:{reload:()=>reloads++}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,serviceWorker:{controller:controller?{}:null,register:async()=>registration,addEventListener:(type,fn)=>serviceEvents[type]=fn}}});
  setupPWA({showModal(){},toast:message=>toasts.push(message),refresh(){}});
  await Promise.resolve();
  return {buttons,serviceEvents,messages,toasts,registration,get reloads(){return reloads;}};
}
test('pending PWA update waits for a deliberate click and reloads only the requesting tab',async()=>{
  const env=await environment(),button=env.buttons.get('#update-app');assert.equal(button.hidden,false);assert.equal(env.messages.length,0);
  env.serviceEvents.controllerchange();assert.equal(env.reloads,0);
  button.listeners.click();button.listeners.click();assert.deepEqual(env.messages,[{type:'APPLY_UPDATE'}]);assert.equal(button.disabled,true);
  env.serviceEvents.controllerchange();assert.equal(env.reloads,1);assert.match(env.toasts[0],/Usar versión nueva/);
});
test('first PWA install never prompts an update or reloads the current consultation',async()=>{
  const env=await environment(false);assert.equal(env.buttons.get('#update-app').hidden,true);assert.equal(env.toasts.length,0);
  env.serviceEvents.controllerchange();assert.equal(env.reloads,0);
});
