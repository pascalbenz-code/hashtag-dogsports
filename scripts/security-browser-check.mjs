import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const repository = path.resolve(import.meta.dirname, '..');
const root = await mkdtemp(path.join(tmpdir(), 'dogsports-security-'));
// Build with a dummy key. Every non-loopback request is intercepted below.
execFileSync('npm', ['run', 'build', '--', '--outDir', root], {
 cwd: repository, stdio: 'inherit', env: { ...process.env,
 VITE_SUPABASE_URL: 'https://eeuugnoccfdkgslvphql.supabase.co',
 VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_security_test' },
});
const config=JSON.parse(await readFile(path.join(repository, 'vercel.json'),'utf8'));
const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/')name='/index.html';
  const target=path.resolve(root,'.'+name);
  if(!target.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  await stat(target);
  res.writeHead(200,{...headers,'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
  res.end(await readFile(target));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,headless:true});
const errors=[];const violations=[];
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.hostname==='eeuugnoccfdkgslvphql.supabase.co'){
   if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,body:''});
  }
  errors.push('Unexpected external request: '+url.origin+url.pathname);
  await route.abort();
 });
 await context.addInitScript(()=>{
  window.__cspViolations=[];
  document.addEventListener('securitypolicyviolation',e=>window.__cspViolations.push(e.violatedDirective+': '+e.blockedURI));
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);
 await page.getByRole('button',{name:'Anmelden',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'THS',exact:true}).count(),0);
 // Synthetic cached session tests the UI gate, not Supabase token verification.
 const user={id:'11111111-1111-4111-8111-111111111111',email:'local@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 await page.evaluate(user=>localStorage.setItem('sb-eeuugnoccfdkgslvphql-auth-token',JSON.stringify({access_token:'local-test-token',refresh_token:'local-test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),user);
 await page.reload();
 await page.getByText('THS',{exact:true}).first().waitFor();
 console.log('AUTH_GATE_AND_SESSION_OK');

 await page.getByText('THS',{exact:true}).first().click();
 await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
 const stamp='2026-05-10T10:00:00Z';
 const result={id:'local-result',date:'2026-05-10',competitionType:'Vereinsprüfung',event:'=1+1',handlerId:'h',dogId:'d',dog:'Local Dog',handler:'Local Handler',className:'FCI-VK3',obedience:55,hurdles:{time:12.03,faults:0},slalom:{time:14.01,faults:4},obstacle:{time:9.44,faults:2},notes:'',createdAt:stamp,updatedAt:stamp};
 const backup={app:'#Dogsports',version:3,results:[result],handlers:[{id:'h',name:'Local Handler',birthDate:'1990-01-01',gender:'male',club:'Local',membershipNumber:'',createdAt:stamp,updatedAt:stamp}],dogs:[{id:'d',callName:'Local Dog',kennelName:'',breed:'Mixed',birthDate:'2021-01-01',gender:'male',performanceRecordId:'',chipNumber:'',studbookNumber:'',createdAt:stamp,updatedAt:stamp}]};
 const dialogs=[];
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
 await page.locator('input[type=file]').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.getByText('1 Datensätze',{exact:true}).waitFor();
 assert(dialogs.some(x=>x.includes('3 neu')));
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/CSV/}).click();
 const download=await downloadPromise;
 const csv=await readFile(await download.path(),'utf8');
 assert(csv.includes('"\'=1+1"'));
 await page.getByRole('button',{name:'Statistik',exact:true}).click();
 await page.waitForTimeout(250);
 await page.getByRole('button',{name:'Leistungsrichter',exact:true}).click();
 await page.getByText('DIGITALER LEISTUNGSRICHTER',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Zur Startseite',exact:true}).click();
 await page.getByText('IBGH',{exact:true}).first().click();
 await page.getByRole('button',{name:'Leistungsrichter',exact:true}).click();
 await page.getByText('DIGITALER LEISTUNGSRICHTER',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Hundeführer und Hunde verwalten',exact:true}).click();
 await page.getByRole('heading',{name:'Local Handler',exact:true}).waitFor();
 console.log('IMPORT_CSV_STATS_THS_IBGH_PROFILES_OK');

 violations.push(...await page.evaluate(()=>window.__cspViolations));
 console.log('CSP',JSON.stringify(violations));
 console.log('ERRORS',JSON.stringify(errors));
 assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();await rm(root,{recursive:true,force:true});}
