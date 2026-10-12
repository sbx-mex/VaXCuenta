import {cp, mkdir, readFile, writeFile, rm, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const source = path.join(root,'site'), dist = path.join(root,'dist');
const hash = createHash('sha256');
async function inspect(folder) {
  const entries = await readdir(folder,{withFileTypes:true});
  for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = path.join(folder,entry.name);
    if (entry.isDirectory()) await inspect(file);
    else {hash.update(path.relative(source,file));hash.update(await readFile(file));}
  }
}
await inspect(source);
const revision = hash.digest('hex').slice(0,16);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(source,dist,{recursive:true});
await writeFile(path.join(dist,'sw.js'),(await readFile(path.join(source,'sw.js'),'utf8')).replace('__BUILD_REVISION__',revision));
await writeFile(path.join(dist,'.nojekyll'),'');
await writeFile(path.join(dist,'version.json'),JSON.stringify({revision}));
console.log(`Sitio listo en dist/ · versión ${revision}.`);
