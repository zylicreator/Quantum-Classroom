const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {pathToFileURL}=require('url');
const {launchBrowser}=require('./browser.cjs');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts','workspace');fs.mkdirSync(output,{recursive:true});
const file=path.join(root,'electron-cloud-classroom.html'),checks=[],errors=[],requests=[];
const good=(name,evidence)=>{checks.push({name,evidence});console.log('PASS '+name);};
let browser,page;
const molecular=()=>page.evaluate(()=>MolecularLab.snapshot());
const atomic=()=>page.evaluate(()=>ElectronLab.snapshot());
const stable=s=>{const {playing,...r}=s;return r;};
(async()=>{
 browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:1280,height:1000},locale:'zh-CN',acceptDownloads:true});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(pathToFileURL(file).href);await page.waitForFunction(()=>window.ElectronWorkspace&&window.MolecularClassroom);
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.equal(await page.locator('#hydrogen-demo').isVisible(),true);assert.equal(await page.locator('#molecular-demo').isVisible(),false);
 assert.equal(await page.locator('script[src],link[rel="stylesheet"][href]').count(),0);
 good('One offline bundle, common language toolbar and atomic default');

 await page.click('#ec-guide-primary');const atomBefore=await atomic();assert.equal(atomBefore.count,1);
 await page.click('#ec-workspace-molecule');assert.equal(await page.locator('#molecular-demo').isVisible(),true);
 assert.equal(await page.locator('#hydrogen-demo').isVisible(),false);
 assert.deepEqual(stable(await atomic()),stable(atomBefore));
 const first=await molecular();assert.equal(first.count,0);assert.equal(first.frequency,null);
 good('Separate experiments start clean and preserve atomic measurement');

 await page.evaluate(()=>MolecularLab.loadPreset({R:2,state:'bonding',seed:20261012,total:1000,count:1000,revealed:true,view:'xz',color:'probability',playing:false}));
 const s=await molecular();assert.equal(s.count,1000);
 const calc=await page.evaluate(()=>{const s=MolecularLab.snapshot(),p=MolecularModel.points(s.R,s.state,s.count,s.seed);return {hits:p.filter(v=>v.inRegion).length,probability:MolecularModel.regionProbability(s.R,s.state)};});
 assert.equal(s.hits,calc.hits);assert.equal(s.frequency,s.hits/s.count);assert.equal(s.probability,calc.probability);
 good('Displayed statistics match the entire independent sample set',{count:s.count,hits:s.hits,probability:s.probability});
 const atomStored=await atomic(),molStored=await molecular();
 await page.click('#ec-lang-en');assert.deepEqual(await molecular(),molStored);assert.deepEqual(await atomic(),atomStored);
 await page.click('#ec-lang-zh');assert.deepEqual(await molecular(),molStored);
 await page.click('#ec-workspace-atom');assert.deepEqual(stable(await molecular()),stable(molStored));assert.deepEqual(stable(await atomic()),stable(atomStored));
 await page.click('#ec-workspace-molecule');assert.deepEqual(stable(await molecular()),stable(molStored));
 good('Bilingual and workspace switches preserve both models and data');

 await page.evaluate(()=>MolecularLab.loadPreset({R:2,state:'antibonding',seed:7001,total:100000,count:100000,revealed:true,view:'xz',color:'phase',playing:false}));
 const large=await molecular();assert.equal(large.count,100000);assert.equal(large.total,100000);
 const hits100k=await page.evaluate(()=>MolecularModel.points(2,'antibonding',100000,7001).filter(p=>p.inRegion).length);assert.equal(large.hits,hits100k);
 assert.equal(large.frequency,hits100k/100000);assert.equal(large.selectedDisplayCount,50000);assert.equal(large.displayLimit,50000);
 good('100000 measurements contribute to molecular statistics',{count:large.count,hits:large.hits,frequency:large.frequency});

 await page.click('#mo-lesson-one-electron');await page.check('#mo-prediction-copies');await page.click('#mo-task-start');
 await page.locator('#mo-task-panel').evaluate(e=>e.open=true);
 let a=await page.evaluate(()=>MolecularClassroom.snapshot());assert.equal(a.answers['one-electron'].started,true);
 assert.equal(await page.locator('#mo-task-reflection').isDisabled(),true);
 // Drive the observation through the real measurement buttons when available.
 const finish=page.locator('#mo-finish');await finish.click();
 await page.locator('#mo-task-panel').evaluate(e=>e.open=true);
 assert.equal(await page.locator('#mo-task-reflection').isDisabled(),false);
 await page.check('#mo-conclusion-copies');await page.fill('#mo-task-reflection','每个点来自重新制备后的独立位置测量，许多点逐渐呈现同一个模型分布。');await page.click('#mo-task-check');
 a=await page.evaluate(()=>MolecularClassroom.snapshot());assert.equal(a.answers['one-electron'].result.correct,true);
 const lessonBefore=await page.evaluate(()=>MolecularClassroom.snapshot());
 await page.click('#ec-lang-en');
 const lessonAfter=await page.evaluate(()=>MolecularClassroom.snapshot());
 assert.deepEqual(lessonAfter.answers,lessonBefore.answers);
 assert.match(await page.locator('#mo-task-feedback').innerText(),/not automatically graded/i);
 good('Prediction-observation-explanation and bilingual answer preservation');

 const run=await molecular();await page.evaluate(cfg=>MolecularLab.loadPreset(cfg),{R:run.R,state:run.state,seed:run.seed,total:1000,count:1000,revealed:false,playing:false});
 a=await page.evaluate(()=>MolecularClassroom.snapshot());assert.equal(a.answers['one-electron'].started,false);
 assert.equal(await page.locator('#mo-task-check').isDisabled(),true);
 good('Reloading the same seed creates a new run and invalidates old task submission');

 await page.click('#mo-lesson-node-sign');await page.check('#mo-prediction-sign');await page.click('#mo-task-start');await page.click('#mo-finish');
 await page.locator('#mo-task-panel').evaluate(e=>e.open=true);await page.check('#mo-conclusion-sign');await page.fill('#mo-task-reflection','The colors label opposite signs of the real wavefunction; the density vanishes on z=0, while a finite slab can still contain measurements.');await page.click('#mo-task-check');
 a=await page.evaluate(()=>MolecularClassroom.snapshot());assert.equal(a.answers['node-sign'].result.correct,true);
 await page.locator('#mo-teacher-panel').evaluate(e=>e.open=true);await page.click('#mo-teacher-load');
 a=await page.evaluate(()=>MolecularClassroom.snapshot());assert.equal(a.answers['node-sign'].started,false);assert.equal((await molecular()).count,0);
 good('Node/sign activity works; teacher loading does not submit a student prediction');

 await page.locator('#mo-teacher-panel').evaluate(e=>e.open=true);await page.click('#mo-project');
 assert.equal(await page.locator('#mo-project').getAttribute('aria-pressed'),'true');await page.click('#mo-project');
 const download=page.waitForEvent('download');await page.click('#ec-export-all');const d=await download;
 const downloadPath=path.join(output,'qa-learning-record.json');await d.saveAs(downloadPath);const record=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
 assert.equal(record.format,'ElectronCloudAtomsMoleculesRecord');assert.equal(record.atomic.experiment.count,1);assert.ok(record.molecular.classroom.answers);assert.equal(record.writtenExplanationAutomaticallyGraded,false);
 good('Projection mode and combined JSON export contain both experiments and activities');

 const layouts=[];
 for(const width of [1280,390]) {await page.setViewportSize({width,height:1000});for(const lang of ['zh','en']) {await page.click('#ec-lang-'+lang);for(const workspace of ['atom','molecule']) {
  await page.click('#ec-workspace-'+workspace);const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width+1,JSON.stringify({workspace,lang,...layout}));layouts.push({workspace,lang,...layout});
 }}}
 good('Both workspaces fit desktop and mobile viewports in both languages',layouts);
 await page.click('#ec-workspace-molecule');await page.click('#ec-lang-en');await page.locator('#mo-teacher-panel').evaluate(e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(output,'molecular-mobile-en.png'),fullPage:true});
 await page.setViewportSize({width:1280,height:1000});await page.click('#ec-lang-zh');
 await page.evaluate(()=>MolecularLab.loadPreset({R:2,state:'bonding',seed:20261012,total:10000,count:10000,revealed:true,view:'xz',color:'probability',playing:false}));
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'molecular-desktop-zh.png'),fullPage:true});
 await page.evaluate(()=>MolecularLab.loadPreset({R:2,state:'antibonding',seed:20261012,total:10000,count:10000,revealed:true,view:'xz',color:'phase',playing:false}));
 await page.click('#ec-lang-en');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'molecular-antibonding-en.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 good('No browser errors or external network requests during classroom use');
 const report={passed:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),checks,pageErrors:errors,externalRequests:requests};
 fs.writeFileSync(path.join(output,'qa-workspace.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
})().catch(async e=>{console.error(e.stack);if(page)await page.screenshot({path:path.join(output,'qa-failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(output,'qa-workspace-failure.json'),JSON.stringify({error:e.stack,checks,pageErrors:errors,externalRequests:requests},null,2));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
