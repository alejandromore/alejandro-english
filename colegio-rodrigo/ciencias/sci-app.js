// Science Practice App Logic
var state={view:'menu',unitIdx:-1,topicIdx:-1,exIdx:0,score:0,correct:0,total:0,answers:[]};

function init(){
  loadProgress();
  showMenu();
}

function loadProgress(){
  try{
    var s=localStorage.getItem('sci_progress');
    if(s){var d=JSON.parse(s);state.scores=d.scores||{};}
  }catch(e){state.scores={};}
  if(!state.scores)state.scores={};
}

function saveProgress(){
  try{localStorage.setItem('sci_progress',JSON.stringify({scores:state.scores}));}catch(e){}
}

function showMenu(){
  state.view='menu';
  document.getElementById('scoreBar').classList.add('hidden');
  document.getElementById('backBtnContainer').innerHTML='';
  var c=document.getElementById('content');
  var h='<div class="card"><h2 class="unit-title">📖 Choose a Unit to Practice</h2><div class="menu-grid">';
  units.forEach(function(u,i){
    var totalEx=0;u.topics.forEach(function(t){totalEx+=t.exercises.length;});
    var completed=0;u.topics.forEach(function(t){
      var key=u.id+'_'+t.title;
      if(state.scores&&state.scores[key])completed++;
    });
    h+='<button class="menu-btn '+u.color+'" onclick="showUnit('+i+')">';
    h+='<span class="icon">'+u.icon+'</span>';
    h+='<strong>'+u.title+'</strong>';
    h+='<span class="desc">'+u.topics.length+' topics · '+totalEx+' exercises · '+completed+'/'+u.topics.length+' completed</span>';
    h+='</button>';
  });
  h+='</div></div>';
  c.innerHTML=h;
}

function showUnit(idx){
  state.view='unit';state.unitIdx=idx;
  document.getElementById('scoreBar').classList.add('hidden');
  document.getElementById('backBtnContainer').innerHTML='<button class="back-btn" onclick="showMenu()">← Back to Menu</button>';
  var u=units[idx];
  var c=document.getElementById('content');
  var h='<div class="card"><h2 class="unit-title">'+u.icon+' '+u.title+'</h2>';
  h+='<p style="margin-bottom:15px;color:#666">Choose a topic to start practicing:</p>';
  h+='<div class="menu-grid">';
  u.topics.forEach(function(t,i){
    var key=u.id+'_'+t.title;
    var score=state.scores&&state.scores[key]?state.scores[key]:null;
    var badge=score?'<span class="topic-score">'+score.correct+'/'+score.total+' ⭐</span>':'<span class="topic-score" style="background:#ccc">Not done</span>';
    h+='<button class="menu-btn '+u.color+'" onclick="startTopic('+idx+','+i+')">';
    h+='<span class="icon">📝</span>';
    h+='<strong>'+t.title+'</strong>';
    h+='<span class="desc">'+t.exercises.length+' exercises</span>';
    h+='</button>';
  });
  h+='</div></div>';
  c.innerHTML=h;
}

function startTopic(uIdx,tIdx){
  state.unitIdx=uIdx;state.topicIdx=tIdx;state.exIdx=0;
  state.score=0;state.correct=0;state.total=0;state.answers=[];
  state.view='exercise';
  showExercise();
}

function showExercise(){
  var u=units[state.unitIdx];var t=u.topics[state.topicIdx];
  var ex=t.exercises[state.exIdx];
  state.total=t.exercises.length;
  updateScoreBar();
  document.getElementById('backBtnContainer').innerHTML='<button class="back-btn" onclick="showUnit('+state.unitIdx+')">← Back to '+u.title+'</button>';
  var c=document.getElementById('content');
  var progressPct=(state.exIdx/state.total)*100;
  var h='<div class="card">';
  h+='<div class="progress"><div class="progress-fill" style="width:'+progressPct+'%"></div></div>';
  h+='<p style="color:#999;font-size:0.9em;margin-bottom:10px">Question '+(state.exIdx+1)+' of '+state.total+'</p>';
  h+='<div class="question">'+ex.q+'</div>';
  if(ex.type==='mc'){
    h+='<div class="options" id="options">';
    ex.options.forEach(function(opt,i){
      h+='<div class="option" onclick="selectMC('+i+')" id="opt'+i+'">'+opt+'</div>';
    });
    h+='</div>';
  }else if(ex.type==='fill'){
    h+='<input type="text" class="fill-input" id="fillAnswer" placeholder="Type your answer..." onkeypress="if(event.keyCode===13)checkFill()">';
    h+='<button class="btn" onclick="checkFill()">Check Answer</button>';
  }
  h+='<div id="feedback"></div>';
  h+='</div>';
  c.innerHTML=h;
  if(ex.type==='fill'){document.getElementById('fillAnswer').focus();}
}

function selectMC(idx){
  var opts=document.querySelectorAll('.option');
  opts.forEach(function(o){o.classList.remove('selected');});
  document.getElementById('opt'+idx).classList.add('selected');
  var ex=units[state.unitIdx].topics[state.topicIdx].exercises[state.exIdx];
  var fb=document.getElementById('feedback');
  opts.forEach(function(o){o.style.pointerEvents='none';});
  if(idx===ex.answer){
    document.getElementById('opt'+idx).classList.add('correct');
    state.correct++;state.score+=10;
    fb.innerHTML='<div class="feedback correct">✅ Correct! +10 points<br><small>'+ex.exp+'</small></div>';
  }else{
    document.getElementById('opt'+idx).classList.add('wrong');
    document.getElementById('opt'+ex.answer).classList.add('correct');
    fb.innerHTML='<div class="feedback wrong">❌ Wrong! The answer is: <strong>'+ex.options[ex.answer]+'</strong><br><small>'+ex.exp+'</small></div>';
  }
  updateScoreBar();
  setTimeout(nextExercise,2500);
}

function checkFill(){
  var input=document.getElementById('fillAnswer');
  var ans=input.value.trim().toLowerCase();
  var ex=units[state.unitIdx].topics[state.topicIdx].exercises[state.exIdx];
  var fb=document.getElementById('feedback');
  var correct=ex.answer.toLowerCase();
  if(ans===correct){
    state.correct++;state.score+=10;
    fb.innerHTML='<div class="feedback correct">✅ Correct! +10 points<br><small>'+ex.exp+'</small></div>';
  }else{
    fb.innerHTML='<div class="feedback wrong">❌ Wrong! The answer is: <strong>'+ex.answer+'</strong><br><small>'+ex.exp+'</small></div>';
  }
  input.disabled=true;
  updateScoreBar();
  setTimeout(nextExercise,2500);
}

function nextExercise(){
  var t=units[state.unitIdx].topics[state.topicIdx];
  state.exIdx++;
  if(state.exIdx<t.exercises.length){
    showExercise();
  }else{
    showResults();
  }
}

function showResults(){
  var u=units[state.unitIdx];var t=u.topics[state.topicIdx];
  var pct=Math.round((state.correct/state.total)*100);
  var stars='⭐'.repeat(Math.ceil(pct/33.4));
  if(pct<34)stars='⭐';
  else if(pct<67)stars='⭐⭐';
  else stars='⭐⭐⭐';
  var key=u.id+'_'+t.title;
  if(!state.scores)state.scores={};
  state.scores[key]={correct:state.correct,total:state.total,score:state.score};
  saveProgress();
  document.getElementById('scoreBar').classList.add('hidden');
  document.getElementById('backBtnContainer').innerHTML='<button class="back-btn" onclick="showUnit('+state.unitIdx+')">← Back to '+u.title+'</button>';
  var c=document.getElementById('content');
  var h='<div class="card result-box">';
  h+='<div class="stars">'+stars+'</div>';
  h+='<h2>Topic Completed!</h2>';
  h+='<div class="score-text">'+state.correct+' / '+state.total+'</div>';
  h+='<p style="font-size:1.2em;color:#666">You scored '+pct+'% ('+state.score+' points)</p>';
  if(pct===100)h+='<p style="margin:15px 0;font-size:1.1em">🏆 Perfect score! Excellent work!</p>';
  else if(pct>=70)h+='<p style="margin:15px 0;font-size:1.1em">🎉 Great job! Keep practicing!</p>';
  else if(pct>=50)h+='<p style="margin:15px 0;font-size:1.1em">👍 Good effort! Try again to improve!</p>';
  else h+='<p style="margin:15px 0;font-size:1.1em">📚 Keep studying! You can do it!</p>';
  h+='<div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">';
  h+='<button class="btn" onclick="startTopic('+state.unitIdx+','+state.topicIdx+')">🔄 Try Again</button>';
  h+='<button class="btn green" onclick="showUnit('+state.unitIdx+')">📋 Back to Topics</button>';
  h+='<button class="btn" onclick="showMenu()" style="background:#2b58d6">🏠 Main Menu</button>';
  h+='</div></div>';
  c.innerHTML=h;
}

function updateScoreBar(){
  var sb=document.getElementById('scoreBar');
  sb.classList.remove('hidden');
  document.getElementById('totalScore').textContent=state.score;
  document.getElementById('correctCount').textContent=state.correct;
  document.getElementById('progressText').textContent=(state.exIdx+1)+'/'+state.total;
}

init();
