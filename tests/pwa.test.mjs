import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function environment(online=true){
  const listeners={},store=new Map(),deleted=[],cache={
    addAll:async urls=>urls.forEach(url=>store.set(url,new Response(url))),
    match:async request=>store.get(typeof request==='string'?request:request.url)?.clone(),
    put:async(request,response)=>store.set(typeof request==='string'?request:request.url,response),
  };
  const context={self:{registration:{scope:'https://sbx-mex.github.io/VaXCuenta/'},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners[type]=fn},URL,Headers,Response,
    caches:{open:async()=>cache,keys:async()=>['vaxcuenta-/OtherApp/-old','vaxcuenta-/VaXCuenta/-old'],delete:async key=>deleted.push(key)},
    fetch:async request=>{if(!online)throw new Error('offline');return new Response('{"cutoff":"2026-10-11"}',{headers:{'Content-Type':'application/json'}})}};
  vm.runInNewContext(sw,context);return {listeners,store,deleted};
}
test('manifest start, scope and app id stay relative to a GitHub repository subpath',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url)));
  assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
});
test('service worker precaches all assets within the project path',async()=>{
  const env=environment();let promise;env.listeners.install({waitUntil:p=>promise=p});await promise;
  assert.ok(env.store.has('https://sbx-mex.github.io/VaXCuenta/data/dashboard.json'));
  for(const path of ['report.mjs','xlsx-export.mjs','pdf-export.mjs','vendor/pdf-lib.min.js','vendor/pdf-fonts.mjs'])assert.ok(env.store.has('https://sbx-mex.github.io/VaXCuenta/'+path));
  assert.ok([...env.store.keys()].every(key=>key.startsWith('https://sbx-mex.github.io/VaXCuenta/')));
});
test('service worker removes old versions of this project only',async()=>{
  const env=environment();let promise;env.listeners.activate({waitUntil:p=>promise=p});await promise;
  assert.deepEqual(env.deleted,['vaxcuenta-/VaXCuenta/-old']);
});
test('offline cached data carries an explicit offline indicator',async()=>{
  const env=environment(false);env.store.set('https://sbx-mex.github.io/VaXCuenta/data/dashboard.json',new Response('{"cutoff":"2026-10-11"}'));
  let promise;env.listeners.fetch({request:{url:'https://sbx-mex.github.io/VaXCuenta/data/dashboard.json',method:'GET',mode:'cors'},respondWith:p=>promise=p});
  const response=await promise;assert.equal(response.status,200);assert.equal(response.headers.get('X-VaXCuenta-Offline'),'true');assert.equal((await response.json()).cutoff,'2026-10-11');
});
test('online data updates the previously cached cutoff',async()=>{
  const env=environment();env.store.set('https://sbx-mex.github.io/VaXCuenta/data/dashboard.json',new Response('{"cutoff":"2026-10-04"}'));
  let promise;env.listeners.fetch({request:{url:'https://sbx-mex.github.io/VaXCuenta/data/dashboard.json',method:'GET',mode:'cors'},respondWith:p=>promise=p});await promise;
  assert.equal((await env.store.get('https://sbx-mex.github.io/VaXCuenta/data/dashboard.json').json()).cutoff,'2026-10-11');
});
test('offline navigation with query filters opens the cached application shell',async()=>{
  const env=environment(false);env.store.set('https://sbx-mex.github.io/VaXCuenta/index.html',new Response('<html>VaXCuenta</html>'));
  let promise;env.listeners.fetch({request:{url:'https://sbx-mex.github.io/VaXCuenta/?region=Centro+Norte',method:'GET',mode:'navigate'},respondWith:p=>promise=p});
  assert.equal(await (await promise).text(),'<html>VaXCuenta</html>');
});
test('requests to another project or external origin are not intercepted',()=>{
  const env=environment();let intercepted=false;
  for(const url of ['https://sbx-mex.github.io/OtherApp/','https://other.test/VaXCuenta/'])env.listeners.fetch({request:{url,method:'GET'},respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
});
