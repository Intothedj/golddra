'use strict';
const $=id=>document.getElementById(id), rates={red:.03,white:.05};
let logs=[],busy=false,job=0,page=0,winCount=0,streak=0,usage={red:0,white:0};
let totalCost=0n,pendingCost=0n,lastSuccessCost=null,pendingAttempts=0,lastSuccessAttempts=0;
const fmt=n=>n.toLocaleString('ko-KR');
function money(n){n=BigInt(n);if(n===0n)return '0 머니';const parts=[];for(const [unit,name] of [[1000000000000n,'조'],[100000000n,'억'],[10000n,'만'],[1n,'']]){const q=n/unit;if(q)parts.push(fmt(q)+name);n%=unit;}return parts.join(' ')+' 머니';}
function readPrice(type){const raw=$(type+'Price').value.replaceAll(',','').trim();if(!/^\d+$/.test(raw))return null;const n=BigInt(raw);return n<=1000000000000n?n:null;}
function validatePrices(types=['red','white']){if(types.some(t=>readPrice(t)===null)){status('비서 가격을 확인해 주세요','0~1조 머니 사이의 정수를 입력해 주세요.');return false;}return true;}
function priceHint(type){const n=readPrice(type);$(type+'PriceHint').textContent=n===null?'0~1조 머니 사이의 정수를 입력해 주세요':money(n);}
function renderCosts(){$('totalCost').textContent=money(totalCost);$('totalCostExact').textContent=fmt(totalCost)+' 머니';$('lastSuccessCost').textContent=lastSuccessCost===null?'아직 성공 전':money(lastSuccessCost);$('lastSuccessAttempts').textContent=lastSuccessCost===null?'첫 시도부터 성공까지 합산':fmt(lastSuccessAttempts)+'회 시도 · 성공한 비서 포함';$('pendingCost').textContent=money(pendingCost);$('pendingAttempts').textContent=fmt(pendingAttempts)+'회 시도 중';}
function random(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function attempt(type){const success=random()<rates[type],cost=readPrice(type);totalCost+=cost;pendingCost+=cost;pendingAttempts++;const successCost=success?pendingCost:null;logs.push({id:logs.length+1,type,success,cost,successCost});usage[type]++;if(success){winCount++;streak=0;lastSuccessCost=pendingCost;lastSuccessAttempts=pendingAttempts;pendingCost=0n;pendingAttempts=0;}else streak++;return success;}
function lock(value){busy=value;document.body.classList.toggle('is-running',value);['runRed','runWhite','until','redCount','whiteCount','untilType','redPrice','whitePrice'].forEach(id=>$(id).disabled=value);$('stop').disabled=!value;}
function status(title,detail){$('status').textContent=title;$('detail').textContent=detail;}
function render(){ renderCosts(); renderStage(); $('total').textContent=fmt(logs.length);$('wins').textContent=fmt(winCount);$('percent').textContent=(logs.length?100*winCount/logs.length:0).toFixed(1)+'%';$('redUsage').textContent=fmt(usage.red);$('whiteUsage').textContent=fmt(usage.white);$('streak').textContent=fmt(streak);$('logCount').textContent=fmt(logs.length)+'건'; renderLogs(); }
function renderLogs(){const f=$('filter').value, filtered=logs.filter(x=>f==='all'||(f==='success'?x.success:x.type===f));const pages=Math.max(1,Math.ceil(filtered.length/50));page=Math.max(0,Math.min(page,pages-1));const items=filtered.slice().reverse().slice(page*50,(page+1)*50);$('table').hidden=!items.length;$('empty').hidden=!!items.length;$('empty').innerHTML=logs.length?'<b>◇</b>조건에 맞는 기록이 없습니다.':'<b>◇</b>아직 시도 기록이 없습니다.<br>당신의 첫 번째 결과를 기다리고 있어요.';$('rows').innerHTML=items.map(x=>`<tr><td data-label="시도">#${fmt(x.id)}</td><td data-label="사용 비서"><i class="dot ${x.type==='white'?'white':''}"></i>${x.type==='white'?'희귀잠재력각인비서':'잠재력각인비서'}</td><td data-label="확률">${rates[x.type]*100}%</td><td data-label="결과"><span class="${x.success?'success':'failure'}">${x.success?'성공':'실패'}</span></td><td data-label="사용 금액">${money(x.cost)}</td><td data-label="성공까지 비용" class="success-cost">${x.successCost===null?'—':money(x.successCost)}</td></tr>`).join('');$('pageText').textContent=`${page+1} / ${pages} 페이지 · 최근순`;$('prev').disabled=page===0;$('next').disabled=page>=pages-1;}
const pause=()=>new Promise(r=>setTimeout(r,35));
// Each button runs only its own scroll and captures the selected count.
async function runBatch(type) {
  if (busy || !validatePrices([type])) return;
  const total = Number($(type + 'Count').value);
  if (!Number.isInteger(total) || total < 1 || total > 10000) {
    status('시도 횟수를 확인해 주세요', '선택한 비서의 횟수에 1~10,000 사이의 정수를 입력해 주세요.');
    return;
  }
  lock(true);
  page = 0;
  const token = ++job, start = logs.length, startWins = winCount, startCost = totalCost;
  const label = type === 'red' ? '빨간색' : '하얀색';
  for (let i = 0; i < total;) {
    if (token !== job) return;
    for (let n = 0; n < 100 && i < total; n++, i++) attempt(type);
    render();
    status(label + ' 비서를 시도하고 있습니다', `${fmt(logs.length - start)} / ${fmt(total)}회 진행`);
    await pause();
  }
  if (token !== job) return;
  lock(false);
  status(label + ' 비서 시도가 완료되었습니다', `이번 실행 ${fmt(total)}회 · 성공 ${fmt(winCount - startWins)}회 · 사용 ${money(totalCost - startCost)}`);
}
$('runRed').onclick = () => runBatch('red');
$('runWhite').onclick = () => runBatch('white');
$('until').onclick=async()=>{if(busy)return;const type=$('untilType').value;if(!validatePrices([type]))return;const token=++job,startCost=totalCost;lock(true);page=0;let count=0,success=false;while(!success){if(token!==job)return;success=attempt(type);count++;render();status(success?'각인에 성공했습니다!':'첫 성공을 향해 시도 중',`${type==='red'?'빨간색':'하얀색'} 비서로 이번 도전 ${fmt(count)}회${success?' 만에 성공':' 진행'} · 이번 실행 ${money(totalCost-startCost)}`);if(!success)await pause();}if(token===job)lock(false);};
$('stop').onclick=()=>{job++;lock(false);status('시도를 중지했습니다','중지 전까지의 결과는 기록에 남아 있습니다.');};
$('reset').onclick=()=>{job++;lock(false);logs=[];totalCost=0n;pendingCost=0n;lastSuccessCost=null;pendingAttempts=0;lastSuccessAttempts=0;winCount=0;streak=0;usage={red:0,white:0};page=0;render();status('기록을 초기화했습니다','시도 기록과 사용 금액 통계를 지웠습니다. 횟수·가격·비서 선택 설정은 유지됩니다.');};
$('filter').onchange=()=>{page=0;renderLogs();};$('prev').onclick=()=>{page--;renderLogs();};$('next').onclick=()=>{page++;renderLogs();};render();

['red','white'].forEach(type=>{const input=$(type+'Price');input.oninput=()=>priceHint(type);input.onblur=()=>{const n=readPrice(type);if(n!==null)input.value=fmt(n);priceHint(type);};priceHint(type);});

// Game-style tabs keep configuration and history accessible without horizontal scrolling.
function activateTab(name) {
  for (const [key, tabId, panelId] of [['engrave','tabEngrave','engravePanel'],['history','tabHistory','historyPanel']]) {
    const active = key === name;
    $(tabId).setAttribute('aria-selected', String(active));
    $(tabId).classList.toggle('active', active);
    $(tabId).tabIndex = active ? 0 : -1;
    $(panelId).hidden = !active;
  }
}
$('tabEngrave').onclick = () => activateTab('engrave');
$('tabHistory').onclick = () => activateTab('history');
for (const id of ['tabEngrave','tabHistory']) {
  $(id).onkeydown = event => {
    if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();
      const target = event.key === 'Home' ? 'engrave' : event.key === 'End' ? 'history' : id === 'tabEngrave' ? 'history' : 'engrave';
      activateTab(target);
      $(target === 'engrave' ? 'tabEngrave' : 'tabHistory').focus();
    }
  };
}
function renderStage() {
  const last = logs[logs.length - 1];
  const type = last ? last.type : $('untilType').value;
  $('activeScroll').src = 'assets/' + type + '.png';
  $('activeScroll').alt = type === 'white' ? '하얀색 희귀잠재력각인비서' : '빨간색 잠재력각인비서';
  $('stageNote').textContent = last ? (last.success ? '각인 성공 · 잠재력이 깨어납니다' : '각인 실패 · 다음 기회를 기다립니다') : '각인의 순간을 기다리는 중';
  document.body.classList.toggle('has-success', Boolean(last && last.success));
}
$('untilType').onchange = () => { if (!logs.length) renderStage(); };
