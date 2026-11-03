/* Classroom activities use the same probability engine as free exploration. */
(function () {
  'use strict';
  const root=document.getElementById('ec-classroom-root');
  const I=window.ElectronI18n, lab=window.ElectronLab, content=window.ElectronLessons;
  if(!root||!I||!lab||!content) return;
  root.dataset.i18nDynamic='true';
  const L=(zh,en)=>I.pick(zh,en), text=value=>typeof value==='string' ? value : L(value.zh,value.en);
  let activeLesson=null, teacherPreset=content.presets[0].id, projecting=false;
  let updating=false, lastRunSeed=null;
  const answers=Object.fromEntries(content.lessons.map(lesson=>[lesson.id,{prediction:null,conclusion:null,reflection:'',started:false,result:null,attempts:[]} ]));
  const refs={};
  function el(tag,className,value) {
    const node=document.createElement(tag);
    if(className) node.className=className;
    if(value!==undefined) node.textContent=value;
    return node;
  }
  function button(label,id,action,className='btn') {
    const node=el('button',className,label);node.type='button';
    if(id) node.id=id;
    node.addEventListener('click',action);return node;
  }
  const lessonById=id=>content.lessons.find(lesson=>lesson.id===id);
  const presetById=id=>content.presets.find(preset=>preset.id===id);
  function snapshot() { return lab.snapshot(); }
  function matches(lesson,s) {
    const c=presetById(lesson.presetId).config;
    return s.model===c.model&&s.state===c.state&&Math.abs(s.radius-c.radius)<1e-8&&
      (!c.element||s.element===c.element)&&(!c.scope||s.scope===c.scope)&&
      (lesson.id!=='nodes'||(!s.guided&&s.color==='phase'));
  }
  function ready(lesson,s) { return matches(lesson,s)&&s.count>=lesson.minCount&&(!lesson.needsReveal||s.revealed); }
  function setError(message) { refs.error.textContent=message||'';refs.error.hidden=!message; }
  function returnToExperiment() {
    const guide=document.getElementById('ec-guide');
    const target=guide&&!guide.hidden ? guide : document.getElementById('ec-observation-controls');
    target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
  function loadPreset(id,fromTask=false) {
    const preset=presetById(id);if(!preset)return;
    if(preset.lessonId) activeLesson=preset.lessonId; else activeLesson=null;
    teacherPreset=id;
    if(activeLesson) { answers[activeLesson].started=fromTask;answers[activeLesson].result=null; }
    try {
      updating=true;lab.loadPreset(preset.config);lastRunSeed=snapshot().seed;
      render();setError('');
      if(fromTask&&refs.taskPanel) refs.taskPanel.open=false;
      if(fromTask) returnToExperiment();
    } catch(error) { setError(L('场景载入失败：','Unable to load the scenario: ')+error.message); }
    finally { updating=false;updateProgress(); }
  }
  function radioGroup(lesson,kind,disabled) {
    const fieldset=el('fieldset');
    fieldset.append(el('legend','',kind==='prediction' ? L('实验前：我的预测','Before the experiment: my prediction') : L('观察后：我的判断','After observing: my conclusion')));
    const group=el('div','ec-task-options');group.setAttribute('aria-disabled',String(disabled));
    for(const choice of lesson.choices) {
      const label=el('label','ec-task-option');
      const input=el('input');input.type='radio';input.name='ec-task-'+kind;input.value=choice.id;
      input.checked=answers[lesson.id][kind]===choice.id;input.disabled=disabled;
      input.addEventListener('change',()=>{
        answers[lesson.id][kind]=choice.id;
        if(kind==='conclusion') { answers[lesson.id].result=null;renderFeedback(lesson); }
        updateProgress();
      });
      label.append(input,el('span','',text(choice.text)));group.append(label);
    }
    fieldset.append(group);return fieldset;
  }
  function renderFeedback(lesson) {
    if(!refs.feedback) return;
    refs.feedback.replaceChildren();const result=answers[lesson.id].result;
    refs.feedback.hidden=!result;if(!result)return;
    refs.feedback.append(el('h3','',result.correct ? L('你的选择符合模型解释','Your choice matches the model explanation') : L('再对照观察想一想','Compare your observation once more')));
    refs.feedback.append(el('p','',text(lesson.explanation)));
    const list=el('ul');for(const point of lesson.rubric)list.append(el('li','',text(point)));
    refs.feedback.append(list);
    refs.feedback.append(el('p','ec-classroom-small',L('自由解释没有自动评分，请用上面的要点核对自己的说明。','Your written explanation is not automatically graded. Compare it with the points above.')));
    refs.feedback.append(el('p','ec-classroom-small',L('这次核对记录了 ','This check recorded ')+result.observation.count.toLocaleString(I.locale())+L(' 次测量。',' measurements.')));
  }
  function checkConclusion(lesson) {
    const a=answers[lesson.id],s=snapshot();
    if(!a.started||!ready(lesson,s)||!a.conclusion||!a.reflection.trim())return;
    const record={correct:a.conclusion===lesson.answerId,prediction:a.prediction,conclusion:a.conclusion,reflection:a.reflection.trim(),language:I.lang,observation:{model:s.model,element:s.element,scope:s.scope,state:s.state,count:s.count,hits:s.hits,radius:s.radius,seed:s.seed,probability:s.probability,frequency:s.frequency,revealed:s.revealed}};
    a.result=record;a.attempts.push(record);if(a.attempts.length>30)a.attempts.shift();
    renderFeedback(lesson);updateProgress();
  }
  function renderTask(lesson,wasOpen=true) {
    const a=answers[lesson.id],s=snapshot();
    const panel=el('details','ec-task-panel');panel.id='ec-task-panel';panel.open=wasOpen;
    const summary=el('summary','',text(lesson.title));panel.append(summary);
    panel.append(el('p','',text(lesson.goal)),el('p','',text(lesson.question)));
    const predictionGroup=radioGroup(lesson,'prediction',a.started);panel.append(predictionGroup);
    const start=button(a.started ? L('重新运行本课场景','Run this scenario again') : L('记录预测并开始实验','Record prediction and start'), 'ec-task-start',()=>loadPreset(lesson.presetId,true),'btn btn-primary');
    const reset=button(L('清空本题并重做','Clear this task and restart'),'ec-task-reset',()=>{
      answers[lesson.id]={prediction:null,conclusion:null,reflection:'',started:false,result:null,attempts:[]};
      updating=true;try { lab.loadPreset({...presetById(lesson.presetId).config,count:0,revealed:false});lastRunSeed=snapshot().seed; }finally{updating=false;}
      render(true);
    });
    const actions=el('div','ec-task-actions');actions.append(start,reset);panel.append(actions);
    const progress=el('p','ec-task-progress');progress.id='ec-task-progress';progress.setAttribute('aria-live','polite');panel.append(progress);
    panel.append(el('p','ec-classroom-small',text(lesson.observeHint)));
    const conclusionGroup=radioGroup(lesson,'conclusion',!a.started||!ready(lesson,s));panel.append(conclusionGroup);
    const reflectionLabel=el('label','ec-task-reflection-label',text(lesson.reflectionPrompt));reflectionLabel.htmlFor='ec-task-reflection';panel.append(reflectionLabel);
    const reflection=el('textarea','ec-task-reflection');reflection.id='ec-task-reflection';reflection.maxLength=2000;reflection.rows=3;reflection.value=a.reflection;
    reflection.disabled=!a.started||!ready(lesson,s);
    reflection.placeholder=L('用自己的话写一句解释……','Explain the observation in your own words…');
    reflection.addEventListener('input',()=>{a.reflection=reflection.value;a.result=null;renderFeedback(lesson);updateProgress();});panel.append(reflection);
    const check=button(L('核对我的判断','Check my conclusion'),'ec-task-check',()=>checkConclusion(lesson),'btn btn-primary');
    const returnButton=button(L('回到实验操作','Return to the experiment'),'ec-task-return',()=>{panel.open=false;returnToExperiment();});
    const bottom=el('div','ec-task-actions');bottom.append(check,returnButton);panel.append(bottom);
    const feedback=el('div','ec-task-feedback');feedback.id='ec-task-feedback';feedback.setAttribute('role','status');panel.append(feedback);
    Object.assign(refs,{taskPanel:panel,taskSummary:summary,predictionGroup,conclusionGroup,start,progress,check,reflection,feedback});
    renderFeedback(lesson);return panel;
  }
  function renderTeacher(wasOpen=false) {
    const panel=el('details','ec-teacher-panel');panel.id='ec-teacher-panel';panel.open=wasOpen;
    panel.append(el('summary','',L('教师工具 · 课堂场景与学习记录','Teacher tools · Scenarios and learning records')));
    panel.append(el('p','',L('选择预设会开始一组新实验。学生可以先做预测；教学提示与目标供教师备课使用。','Loading a preset starts a new experiment. Invite predictions first; the objectives and notes below support lesson preparation.')));
    const controls=el('div','ec-teacher-controls');
    const label=el('label','form-label',L('课堂场景','Classroom scenario'));label.htmlFor='ec-teacher-preset';
    const select=el('select','form-select');select.id='ec-teacher-preset';
    for(const p of content.presets) { const option=el('option','',text(p.title));option.value=p.id;select.append(option); }
    select.value=teacherPreset;select.addEventListener('change',()=>{teacherPreset=select.value;renderTeacherNotes();});label.append(select);
    const load=button(L('载入场景','Load scenario'),'ec-teacher-load',()=>loadPreset(select.value));
    const project=button(projecting ? L('退出投影模式','Exit projection mode') : L('投影大字模式','Projection mode'),'ec-project',()=>{
      projecting=!projecting;document.body.classList.toggle('ec-projecting',projecting);
      project.textContent=projecting ? L('退出投影模式','Exit projection mode') : L('投影大字模式','Projection mode');
      project.setAttribute('aria-pressed',String(projecting));window.dispatchEvent(new Event('resize'));
    });project.setAttribute('aria-pressed',String(projecting));
    controls.append(label,load,project);panel.append(controls);
    const notes=el('div','ec-teacher-notes');notes.id='ec-teacher-notes';panel.append(notes);refs.teacherNotes=notes;
    const exportButton=button(L('导出学习记录 JSON','Export learning record JSON'),'ec-export-record',exportRecord);
    panel.append(exportButton,el('p','ec-classroom-small',L('记录包含预测、结论、自由解释和核对时的实验参数。答案仅保存在本页面；关闭页面前可自行导出。','The record includes predictions, conclusions, explanations, and experiment parameters at each check. Answers stay in this page; export them before closing it if needed.')));
    refs.teacherPanel=panel;return panel;
  }
  function renderTeacherNotes() {
    const preset=presetById(teacherPreset);if(!refs.teacherNotes||!preset)return;
    refs.teacherNotes.replaceChildren(el('p','',text(preset.objective)),el('p','ec-classroom-small',L('建议用时：','Suggested duration: ')+text(preset.duration)));
    const list=el('ul');for(const note of preset.teacherNotes)list.append(el('li','',text(note)));refs.teacherNotes.append(list);
  }
  function updateProgress() {
    if(updating||!activeLesson||!refs.progress)return;
    const lesson=lessonById(activeLesson),a=answers[activeLesson],s=snapshot();
    const match=matches(lesson,s),observed=ready(lesson,s);
    if(lastRunSeed!==null&&s.seed!==lastRunSeed) { a.result=null;renderFeedback(lesson);lastRunSeed=s.seed; }
    if(!match&&a.result) { a.result=null;renderFeedback(lesson); }
    refs.start.disabled=!a.prediction&&!a.started;
    for(const input of refs.conclusionGroup.querySelectorAll('input'))input.disabled=!a.started||!observed;
    refs.conclusionGroup.querySelector('.ec-task-options').setAttribute('aria-disabled',String(!a.started||!observed));
    refs.reflection.disabled=!a.started||!observed;
    refs.check.disabled=!a.started||!observed||!a.conclusion||!a.reflection.trim();
    const n=s.count.toLocaleString(I.locale());
    let message;
    if(!a.started)message=L('先选择一个预测，再开始本课实验。','Choose a prediction before starting this activity.');
    else if(!match)message=L('当前参数已离开本课场景。恢复本课参数，或重新载入场景后再核对。','The current parameters differ from this activity. Restore its settings or load its scenario again before checking.');
    else if(s.count<lesson.minCount)message=L('已完成 ','Completed ')+n+L(' 次测量；至少观察 ',' measurements; observe at least ')+lesson.minCount.toLocaleString(I.locale())+L(' 次，再填写结论。',' before choosing a conclusion.');
    else if(lesson.needsReveal&&!s.revealed)message=L('次数已足够。请在实验中揭晓预测概率，再比较频率。','You have enough measurements. Reveal the model probability in the experiment, then compare it with the frequency.');
    else message=L('观察已就绪：','Observation ready: ')+n+L(' 次测量。选择结论并写一句解释，即可核对。',' measurements. Choose a conclusion and write an explanation to check it.');
    refs.progress.textContent=message;
    refs.taskSummary.textContent=text(lesson.title)+(a.started ? L(' · 已记录预测',' · Prediction recorded') : '');
  }
  function exportRecord() {
    const report={format:'ElectronCloudClassroomRecord',version:2,createdAt:new Date().toISOString(),language:I.lang,currentExperiment:snapshot(),activities:content.lessons.map(lesson=>({id:lesson.id,title:lesson.title,question:lesson.question,choices:lesson.choices,...answers[lesson.id]})),writtenExplanationAutomaticallyGraded:false};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download='electron-cloud-learning-record.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(forceTaskOpen) {
    const oldTaskOpen=refs.taskPanel?.open??true,oldTeacherOpen=refs.teacherPanel?.open??false;
    root.replaceChildren();Object.keys(refs).forEach(key=>delete refs[key]);
    const heading=el('div','ec-classroom-heading');const title=el('div');
    title.append(el('h2','',L('课堂任务：先预测，再实验','Classroom activities: predict, then explore')),el('p','',L('选一张任务卡，完成观察后再解释。原有入门引导和自由探索都可继续使用。','Choose an activity, observe, then explain. Guided introduction and free exploration remain available.')));heading.append(title);root.append(heading);
    const choices=el('div','ec-lesson-choices');
    for(const lesson of content.lessons) {
      const choice=button('',null,()=>{activeLesson=lesson.id;teacherPreset=lesson.presetId;render(true);});
      choice.classList.add('ec-lesson-choice');choice.dataset.lesson=lesson.id;choice.setAttribute('aria-pressed',String(activeLesson===lesson.id));
      choice.append(el('strong','',text(lesson.title)),el('span','',text(lesson.goal)));choices.append(choice);
    }
    root.append(choices);
    if(activeLesson)root.append(renderTask(lessonById(activeLesson),forceTaskOpen===undefined ? oldTaskOpen : forceTaskOpen));
    root.append(renderTeacher(oldTeacherOpen));renderTeacherNotes();
    const error=el('p','ec-classroom-error');error.id='ec-classroom-error';error.setAttribute('role','alert');error.hidden=true;root.append(error);refs.error=error;
    updateProgress();
  }
  document.addEventListener('electronlab:change',updateProgress);
  document.addEventListener('electronlab:languagechange',()=>render());
  render();
  window.ElectronClassroom=Object.freeze({exportRecord,getAnswers:()=>JSON.parse(JSON.stringify(answers)),getActiveLesson:()=>activeLesson});
})();
