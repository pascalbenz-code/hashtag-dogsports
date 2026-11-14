import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { handler, femaleHandler, dog, reportedExamples, matrixCases } from './ths-editor-fixtures.mjs';

const repository = path.resolve(import.meta.dirname, '..');
const root = await mkdtemp(path.join(tmpdir(), 'dogsports-ths-editor-'));
const userId = '11111111-1111-4111-8111-111111111111';
const errors = [], violations = [];
let page;
let browser;
let server;
try {
  execFileSync('npm', ['run', 'build', '--', '--outDir', root], { cwd:repository, stdio:'inherit', env:{...process.env, VITE_SUPABASE_URL:'https://eeuugnoccfdkgslvphql.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_local_test'} });
  const config = JSON.parse(await readFile(path.join(repository,'vercel.json'),'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
  const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.webmanifest':'application/manifest+json' };
  server=createServer(async(req,res)=>{
    try {
      const name=new URL(req.url,'http://localhost').pathname;
      const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
      if(!target.startsWith(root+'/')){res.writeHead(403);res.end();return;}
      await stat(target);res.writeHead(200,{...headers,'Content-Type':mime[path.extname(target)]??'application/octet-stream'});res.end(await readFile(target));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*', async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    if(url.hostname==='eeuugnoccfdkgslvphql.supabase.co'){
      const table=url.pathname.split('/').at(-1);
      const value=table==='dogsports_user_ids'?{public_id:'#A000001'}:table==='dogsports_notification_reads'?null:[];
      return route.fulfill({status:200,contentType:'application/json',body:route.request().method()==='HEAD'?'':JSON.stringify(value)});
    }
    errors.push('Unexpected request: '+url.origin+url.pathname);return route.abort();
  });
  await context.addInitScript(({userId})=>{
    const user={id:userId,email:'editor@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    localStorage.setItem('sb-eeuugnoccfdkgslvphql-auth-token',JSON.stringify({access_token:'local-test-token',refresh_token:'local-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
    window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective+': '+e.blockedURI));
    window.__formSubmissions=[];document.addEventListener('submit',e=>window.__formSubmissions.push({button:e.submitter?.textContent,value:e.submitter?.getAttribute('value')}),true);
  },{userId});
  page=await context.newPage();page.setDefaultTimeout(8000);
  page.on('pageerror',error=>{errors.push(error.message);console.error('BROWSER_ERROR',error.stack);});
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin);await page.getByText('THS',{exact:true}).click();
  await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'synthetic-examples.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'#Dogsports',version:3,handlers:[handler,femaleHandler],dogs:[dog],results:reportedExamples}))});
  await page.getByText('2 Datensätze',{exact:true}).waitFor();
  const readResults = () => page.evaluate(() => new Promise((resolve,reject) => {
    const request = indexedDB.open('dogsport');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result, transaction=db.transaction('results','readonly');
      const records=transaction.objectStore('results').getAll();
      transaction.oncomplete=()=>{db.close();resolve(records.result);};
      transaction.onerror=()=>{db.close();reject(transaction.error);};
    };
  }));
  for(const sample of reportedExamples){
    await page.locator('button[data-swipe-card]').filter({has:page.getByRole('heading',{name:sample.event,exact:true})}).tap();
    await page.getByRole('heading',{name:'Ergebnis erfassen',exact:true}).waitFor();
    await page.getByRole('button',{name:'Schritt 2 von 3: Prüfungsdaten',exact:true}).click();
    await page.getByRole('button',{name:'Weiter',exact:true}).tap();
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(()=>window.__formSubmissions),[], 'Weiter must not submit the editor');
    await page.getByRole('heading',{name:'Schritt 3: Leistungsdaten',exact:true}).waitFor();
    await page.getByLabel('Unterordnung · 0 bis 60 Punkte',{exact:true}).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth), 'Editor action bar must fit the mobile viewport');
    assert.deepEqual(errors,[]);
    const persisted=(await readResults()).find(r=>r.id===sample.id);
    assert.deepEqual(persisted,sample, 'Opening and navigating must not write a result');
    console.log('REPORTED_RESULT_OPENS',sample.event);
    await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
  }

  const number = n => String(n).replace('.',',');
  const assertEvaluation = async (total,qualis,hl=false) => {
    const expected=total.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+(hl?' s':'');
    assert.equal(await page.locator('.score > strong').innerText(),expected);
    assert.deepEqual(await page.locator('.score [class*="q-"]').allTextContents(),qualis);
    assert.equal(await page.locator('.score .badge.complete').textContent(),'Vollständig');
    assert.deepEqual(errors,[]);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'No horizontal overflow');
  };
  const forwardWithoutSave = async () => {
    const count=await page.evaluate(()=>window.__formSubmissions.length);
    await page.getByRole('button',{name:'Weiter',exact:true}).tap();
    assert.equal(await page.evaluate(()=>window.__formSubmissions.length),count,'Step navigation submitted the form');
  };
  const addFault = async (sectionLabel,index,position,rule) => {
    const section=page.locator(`section[aria-label="${sectionLabel}"]`).nth(index);
    const toggle=section.locator('.hurdle-details-toggle');
    if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    await section.locator(`[data-position="${position}"]`).press('Enter');
    await section.locator('.hurdle-rule-list').getByRole('button',{name:rule}).click();
  };
  const created=[];
  const dismissFeedback = async () => {
    const dismiss=page.getByRole('button',{name:'Meldung schließen',exact:true});
    for(let count=0;count<8 && await dismiss.isVisible();count++)await dismiss.click();
    assert.equal(await dismiss.isVisible(),false,'Feedback queue should be dismissed before the next form interaction');
  };
  assert.equal(matrixCases.length,20);
  for(const [index,test] of matrixCases.entries()){
    const input=test.input,hl=input.className==='VDH-HL';
    await page.getByRole('button',{name:'Neuer Eintrag',exact:true}).click();
    await page.getByRole('button',{name:'Eingaben löschen',exact:true}).click();
    await dismissFeedback();
    await page.getByRole('combobox',{name:/^Hundeführer/}).selectOption(input.handlerId);
    await page.getByRole('combobox',{name:/^Hund(?!eführer)/}).selectOption(input.dogId);
    await forwardWithoutSave();
    await page.getByLabel(/^Datum/).fill(input.date);
    await page.getByLabel(/^Prüfungsstufe/).selectOption(input.className);
    await page.getByLabel(/^Turnierart/).selectOption(input.competitionType);
    await page.getByLabel('Turnier / Verein',{exact:true}).fill(input.event);
    await forwardWithoutSave();
    await page.getByRole('heading',{name:'Schritt 3: Leistungsdaten',exact:true}).waitFor();
    if(input.className.startsWith('FCI-VK'))await page.getByLabel('Unterordnung · 0 bis 60 Punkte',{exact:true}).fill(number(input.obedience));
    if(input.className==='VDH-S-VK'){
      await page.getByLabel('Gemessene Zeit · Sekunden',{exact:true}).fill(number(input.crossCountry.timeSeconds));
      await page.getByLabel('Tatsächliche Strecke · Meter',{exact:true}).fill(number(input.crossCountry.distanceMeters));
    }
    const keys=hl?['obstacle','obstacle2']:['hurdles','slalom','obstacle'];
    for(const [runIndex,key] of keys.entries()){
      await page.getByLabel('Zeit · Sekunden',{exact:true}).nth(runIndex).fill(number(input[key].time));
      await page.getByLabel('Fehlerpunkte',{exact:true}).nth(runIndex).fill(number(input[key].faults));
      if(hl||input.className==='VDH-DK')await page.getByLabel(/^Leinenstatus/).nth(runIndex).selectOption(input[`${key}Leash`]);
    }
    if(test.details && !hl){
      await addFault('Hürdenfehler im Detail',0,'hurdle-2',/Stange abgeworfen/);
      await addFault('Slalomfehler im Detail',0,'gate-2',/Streckentor nicht durchlaufen/);
      await addFault('Hindernislauffehler im Detail',0,'plank',/Seitliches Abspringen/);
    }else if(test.details){
      await addFault('Hindernislauffehler im Detail',0,'oxer',/Stange 1 abgeworfen/);
      await addFault('Hindernislauffehler im Detail',1,'plank',/Seitliches Abspringen/);
    }
    await page.getByRole('textbox',{name:/^Notizen/}).fill(`Testfall ${index+1} neu erfasst`);
    await assertEvaluation(test.total,test.qualis,hl);
    await page.getByRole('button',{name:'Ergebnis speichern',exact:true}).click();
    await page.getByRole('heading',{name:'Schritt 1: Zuordnung',exact:true}).waitFor();
    await dismissFeedback();
    const records=await readResults(),saved=records.find(r=>r.event===input.event);
    assert(saved,'Result must be stored');assert.equal(records.length,3+index);
    assert.equal(saved.handlerId,input.handlerId);assert.equal(saved.dogId,input.dogId);
    for(const key of keys){assert.equal(saved[key].time,input[key].time);assert.equal(saved[key].faults,input[key].faults);}
    assert.equal(await page.getByRole('combobox',{name:/^Hundeführer/}).inputValue(),'','Saving must clear the editor');
    created.push({test,saved});
    console.log('CREATED',index+1,input.className,test.total,test.qualis.join(',')||'none');
  }
  for(const [index,{test,saved}] of created.entries()){
    await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
    await page.locator('button[data-swipe-card]').filter({has:page.getByRole('heading',{name:saved.event,exact:true})}).tap();
    await page.getByRole('button',{name:'Schritt 1 von 3: Zuordnung',exact:true}).click();
    await forwardWithoutSave();
    await page.getByLabel('Turnier / Verein',{exact:true}).fill(saved.event+' · bearbeitet');
    await forwardWithoutSave();
    await page.getByRole('heading',{name:'Schritt 3: Leistungsdaten',exact:true}).waitFor();
    // Regression: a complete persisted result must still be intact at this point.
    assert.deepEqual((await readResults()).find(r=>r.id===saved.id),saved,'Weiter must not silently overwrite a stored result');
    const hl=saved.className==='VDH-HL',key=hl?'obstacle':'hurdles';
    const changedTime=Math.round((saved[key].time+1.25)*100)/100;
    await page.getByLabel('Zeit · Sekunden',{exact:true}).first().fill(number(changedTime));
    await page.getByRole('textbox',{name:/^Notizen/}).fill(`Testfall ${index+1} nachträglich bearbeitet`);
    const editedTotal=Math.round((test.total+(hl?1.25:-1.25))*100)/100;
    await assertEvaluation(editedTotal,test.editedQualis,hl);
    if(index===0||test.details){await page.screenshot({path:`/tmp/dogsports-ths-editor-case-${index+1}.png`,fullPage:true});}
    await page.getByRole('button',{name:'Ergebnis speichern',exact:true}).click();
    await page.getByRole('heading',{name:'Schritt 1: Zuordnung',exact:true}).waitFor();
    await dismissFeedback();
    const records=await readResults(),edited=records.find(r=>r.id===saved.id);
    assert.equal(records.length,22,'Editing must not add a duplicate');
    assert.equal(edited.createdAt,saved.createdAt);assert.notEqual(edited.updatedAt,saved.updatedAt);
    assert.equal(edited[key].time,changedTime);assert.equal(edited.event,saved.event+' · bearbeitet');
    assert.equal(edited.notes,`Testfall ${index+1} nachträglich bearbeitet`);
    assert.equal(edited.handlerId,saved.handlerId);assert.equal(edited.dogId,saved.dogId);
    for(const field of ['hurdles','slalom','obstacle','obstacle2'])assert.deepEqual(edited[field]?.faultDetails,saved[field]?.faultDetails,'Detail faults must be retained');
    console.log('EDITED',index+1,saved.className,editedTotal,test.editedQualis.join(',')||'none');
  }
  const finalRecords=await readResults();
  await page.reload();await page.getByText('THS',{exact:true}).click();
  await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
  await page.getByText('22 Datensätze',{exact:true}).waitFor();
  assert.deepEqual(await readResults(),finalRecords,'Saved edits must survive reload');
  await page.setViewportSize({width:1280,height:900});
  for(const index of [0,14,19]){
    const {test,saved}=created[index],hl=saved.className==='VDH-HL';
    await page.getByRole('row',{name:saved.event+' · bearbeitet bearbeiten',exact:true}).press('Enter');
    await page.getByRole('button',{name:'Schritt 2 von 3: Prüfungsdaten',exact:true}).click();
    const count=await page.evaluate(()=>window.__formSubmissions.length);
    await page.getByRole('button',{name:'Weiter',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__formSubmissions.length),count);
    await assertEvaluation(Math.round((test.total+(hl?1.25:-1.25))*100)/100,test.editedQualis,hl);
    await page.getByRole('button',{name:'Ergebnisse',exact:true}).click();
  }
  console.log('THS_EDITOR_MATRIX_OK: 20 created, 20 edited, retained after reload; 2 reported examples; desktop keyboard navigation');
  violations.push(...await page.evaluate(()=>window.__violations));
  assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
} catch(error){
  if(page){await page.screenshot({path:'/tmp/dogsports-ths-editor-failure.png',fullPage:true}).catch(()=>{});console.error((await page.locator('body').innerText().catch(()=>'' )).slice(-3000));}
  throw error;
} finally {
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});
}
