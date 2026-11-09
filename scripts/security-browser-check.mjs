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
const communityUser='11111111-1111-4111-8111-111111111111';
const communityClub={id:'44444444-4444-4444-8444-444444444444',name:'Mobile Testverein',city:'Teststadt',description:'Gemeinsam trainieren',created_by:communityUser,created_at:new Date().toISOString()};
let testClubs=[], testMembers=[], testPosts=[];
try{
 const context=await browser.newContext({serviceWorkers:'block', viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1')return route.continue();
  if(url.hostname==='eeuugnoccfdkgslvphql.supabase.co'){
   const table=url.pathname.split('/').at(-1),method=route.request().method();
   const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   if(table==='dogsports_create_club') {testClubs=[communityClub];testMembers=[{club_id:communityClub.id,user_id:communityUser}];return json(communityClub.id);}
   if(table==='dogsports_clubs')return json(testClubs);
   if(table==='dogsports_club_members'){
    if(method==='POST')testMembers=[route.request().postDataJSON()];
    if(method==='DELETE'){testMembers=[];testPosts=[];}
    return json(method==='GET'?testMembers:[]);
   }
   if(table==='dogsports_club_posts'){
    if(method==='POST')testPosts=[{...route.request().postDataJSON(),id:'test-post',created_at:new Date().toISOString()}];
    if(method==='DELETE')testPosts=[];
    return json(method==='GET'?testPosts:[]);
   }
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
 await page.getByRole('button',{name:'Neuer Eintrag',exact:true}).click();
 await page.getByRole('heading',{name:'Ergebnis erfassen'}).waitFor();
 await page.waitForTimeout(300);
 const editorSize=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,form:document.querySelector('.result-entry-step').getBoundingClientRect().width}));
 assert(editorSize.scroll<=editorSize.width,`horizontal overflow: ${JSON.stringify(editorSize)}`);
 assert(editorSize.form<=editorSize.width && editorSize.form>editorSize.width*0.7,`invalid form width: ${JSON.stringify(editorSize)}`);
 await page.screenshot({path:'/tmp/dogsports-editor-mobile.png'});
 const swipe=async(selector,start,end)=>page.locator(selector).evaluate((el,{start,end})=>{
  const send=(type,x,y,ending=false)=>{const t=new Touch({identifier:1,target:el,clientX:x,clientY:y});el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:ending?[]:[t],changedTouches:[t]}));};
  send('touchstart',start,350);send('touchmove',(start+end)/2,350);send('touchmove',end,350);send('touchend',end,350,true);
 },{start,end});
 await swipe('.result-entry-step',300,110);
 await page.getByRole('heading',{name:/Schritt 2:/}).waitFor();
 await swipe('.result-entry-step',100,300);
 await page.getByRole('heading',{name:/Schritt 1:/}).waitFor();
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();
 await swipe('.app-swipe-surface',300,100);
 await page.getByRole('heading',{name:/Unterordnung VDH-VK1/}).waitFor();
 console.log('MOBILE_LAYOUT_AND_SWIPE_OK',JSON.stringify(editorSize));
 await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
 const stamp='2026-05-10T10:00:00Z';
 const result={id:'local-result',date:'2026-05-10',competitionType:'Vereinsprüfung',event:'=1+1',handlerId:'h',dogId:'d',dog:'Local Dog',handler:'Local Handler',className:'FCI-VK3',obedience:55,hurdles:{time:12.03,faults:0},slalom:{time:14.01,faults:4},obstacle:{time:9.44,faults:2},notes:'',createdAt:stamp,updatedAt:stamp};
 const backup={app:'#Dogsports',version:3,results:[result],handlers:[{id:'h',name:'Local Handler',birthDate:'1990-01-01',gender:'male',club:'Local',membershipNumber:'',createdAt:stamp,updatedAt:stamp}],dogs:[{id:'d',callName:'Local Dog',kennelName:'',breed:'Mixed',birthDate:'2021-01-01',gender:'male',performanceRecordId:'',chipNumber:'',studbookNumber:'',createdAt:stamp,updatedAt:stamp}]};
 const dialogs=[];
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
 await page.locator('input[type=file]').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.getByText('1 Datensätze',{exact:true}).waitFor();
 assert(dialogs.some(x=>x.includes('3 neu')));
 const resultCard=page.locator('button[data-swipe-card]').first();
 await resultCard.scrollIntoViewIfNeeded();
 const box=await resultCard.boundingBox();
 assert(box && box.width>150);
 const cdp=await context.newCDPSession(page);
 const touchY=Math.round(box.y+box.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:touchY}]});
 for(const x of [260,220,180,140,100]){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:touchY}]});
  await page.waitForTimeout(20);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.getByRole('heading',{name:'Ergebnis erfassen'}).waitFor();
 for(const step of [2,3]){
  await swipe('.result-entry-step',300,110);
  await page.getByRole('heading',{name:new RegExp(`Schritt ${step}:`)}).waitFor();
 }
 await swipe('.result-entry-step',300,110);
 await page.getByText('Statistiken vergleichen ausschließlich',{exact:false}).waitFor();
 await page.waitForTimeout(250);
 await page.screenshot({path:'/tmp/dogsports-swipe-statistics.png'});
 const headingBox=await page.getByRole('heading',{name:'Statistik THS'}).boundingBox();
 assert(headingBox);
 const reverseY=Math.round(headingBox.y+headingBox.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:reverseY}]});
 for(const x of [120,160,200,240,280]){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:reverseY}]});
  await page.waitForTimeout(20);
 }
 const scale=await page.locator('.app-swipe-surface').evaluate(el=>{
  const matrix=new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return {x:matrix.a,y:matrix.d};
 });
 assert.equal(scale.x,1);
 assert.equal(scale.y,1);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.getByRole('heading',{name:'Ergebnis erfassen'}).waitFor();
 await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
 await resultCard.waitFor();
 console.log('REVERSE_SWIPE_PRESERVES_SCALE',JSON.stringify(scale));
 await page.waitForTimeout(300);
 await resultCard.tap();
 await page.getByRole('heading',{name:'Ergebnis erfassen'}).waitFor();
 await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
 console.log('RESULT_CARD_SWIPE_AND_TAP_OK');
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
 await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
 await swipe('.app-swipe-surface',300,110);
 await page.getByRole('heading',{name:'Neuer Eintrag',exact:true}).waitFor();
 await swipe('.app-swipe-surface',300,110);
 await page.getByRole('heading',{name:'Statistik',exact:true}).waitFor();
 console.log('THS_IBGH_NEW_ENTRY_SWIPE_ORDER_OK');
 await page.getByRole('button',{name:'Leistungsrichter',exact:true}).click();
 await page.getByText('DIGITALER LEISTUNGSRICHTER',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Hundeführer und Hunde verwalten',exact:true}).click();
 await page.getByRole('heading',{name:'Local Handler',exact:true}).waitFor();
 console.log('IMPORT_CSV_STATS_THS_IBGH_PROFILES_OK');

 await page.getByRole('button',{name:'Verein suchen oder beitreten',exact:true}).click();
 await page.getByRole('heading',{name:'Community',exact:true}).waitFor();
 await page.getByRole('button',{name:'Vereine entdecken',exact:true}).click();
 await page.getByText('Neuen Verein anlegen',{exact:true}).click();
 await page.getByLabel('Vereinsname',{exact:true}).last().fill('Mobile Testverein');
 await page.getByLabel('Ort',{exact:true}).fill('Teststadt');
 await page.getByRole('button',{name:'Verein anlegen und beitreten',exact:true}).click();
 await page.getByRole('heading',{name:'Mobile Testverein',exact:true}).waitFor();
 await page.getByText('Ergebnis im Verein teilen',{exact:true}).click();
 await page.getByLabel('Verein',{exact:true}).selectOption(communityClub.id);
 await page.getByLabel('Vollständiges Ergebnis',{exact:true}).selectOption('local-result');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Im Vereinsfeed veröffentlichen',exact:true}).click();
 await page.getByRole('button',{name:'Beitrag zurückziehen',exact:true}).waitFor();
 assert(!JSON.stringify(testPosts).includes('birthDate'));
 assert.equal(testPosts[0].total,278.52);
 await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 await page.screenshot({path:'/tmp/dogsports-community-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Beitrag zurückziehen',exact:true}).click();
 await page.getByText('Beitrag zurückgezogen.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Verein verlassen',exact:true}).click();
 await page.getByRole('button',{name:'Verein beitreten',exact:true}).waitFor();
 await page.getByRole('button',{name:'Verein beitreten',exact:true}).click();
 await page.getByRole('button',{name:'Verein verlassen',exact:true}).waitFor();
 console.log('COMMUNITY_CREATE_SHARE_WITHDRAW_LEAVE_JOIN_MOBILE_OK');

 violations.push(...await page.evaluate(()=>window.__cspViolations));
 console.log('CSP',JSON.stringify(violations));
 console.log('ERRORS',JSON.stringify(errors));
 assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();await rm(root,{recursive:true,force:true});}
