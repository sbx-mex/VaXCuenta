import {cp, mkdir, readFile, writeFile, rm, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
const publicFiles=['index.html','styles.css','app.mjs','model.mjs','export.mjs','pwa.mjs','manifest.webmanifest','data/dashboard.json'];
const inputs=[...publicFiles,'scripts/sw.template.js'];
async function listAssets(directory='assets'){
  const results=[];
  for(const item of (await readdir(path.join(root,directory),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(directory,item.name);
    if(item.isDirectory())results.push(...await listAssets(relative));
    else if(item.isFile())results.push(relative);
    else throw new Error(`Recurso no válido: ${relative}`);
  }
  return results;
}
const assets=await listAssets();
const hash=createHash('sha256');
for(const relative of [...inputs,...assets].sort()){hash.update(relative);hash.update(await readFile(path.join(root,relative)));}
const revision=hash.digest('hex').slice(0,16);
const sw=(await readFile(path.join(root,'scripts/sw.template.js'),'utf8')).replace('__BUILD_REVISION__',revision);
await writeFile(path.join(root,'sw.js'),sw);
await writeFile(path.join(root,'version.json'),JSON.stringify({revision}));
await writeFile(path.join(root,'.nojekyll'),'');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const relative of [...publicFiles,...assets,'sw.js','version.json','.nojekyll']){
  const target=path.join(dist,relative);
  await mkdir(path.dirname(target),{recursive:true});
  await cp(path.join(root,relative),target);
}
console.log(`VaXCuenta preparada en raíz y dist/ · versión ${revision}.`);
