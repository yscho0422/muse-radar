
(() => {
'use strict';
const examples = [
 {id:'example-roblox',title:'로블록스 메이크업',subtitle:'ROBLOX MAKEUP',category:'character',description:'게임 아바타의 과장된 눈매, 블러셔, 입체적인 입술을 현실 메이크업으로 옮기는 콘셉트.',status:'샘플 콘셉트',score:0,post_count:0,author_count:0,first_seen:null,latest_at:null,example:true,art:'roblox',source_posts:[],keywords:['로블록스','아바타','게임','픽셀']},
 {id:'example-tomie',title:'토미에 메이크업',subtitle:'TOMIE INSPIRED',category:'character',description:'만화 속 차가운 분위기와 점, 눈매를 활용한 서늘하고 몽환적인 캐릭터 룩.',status:'샘플 콘셉트',score:0,post_count:0,author_count:0,first_seen:null,latest_at:null,example:true,art:'tomie',source_posts:[],keywords:['토미에','이토 준지','만화','캐릭터']}
];
const categoryNames={character:'캐릭터 / 세계관',artistic:'아트 / 실험적',daily:'데일리 / 무드',other:'기타 콘셉트'};
const sourceNames={youtube:'YouTube Shorts 후보',instagram:'Instagram Reels',tiktok:'TikTok',news:'Google News',google_trends:'Google Trends KR',ai:'AI 요약'};
let activeTrend=null;
let currentlyPlaying=-1;
let data = window.__MUSE_DATA__ || {trends:[],leads:[],source_status:{}};
let state={view:'discover',category:'all',query:'',sort:'new'};
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}}
function fmtNum(n){return Number(n||0).toLocaleString('ko-KR')}
function fmtDate(d){if(!d)return '날짜 미확인';const date=new Date(d);if(Number.isNaN(+date))return '날짜 미확인';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric'}).format(date)}
function fmtRefresh(d){if(!d)return '—';const date=new Date(d);if(Number.isNaN(+date))return '—';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(date)}
function activeData(){return data.trends?.length?data.trends:examples}
function isExampleMode(){return !(data.trends?.some(t=>!t.example&&t.source_posts?.length>0))}
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('museSaved')||'[]'))}catch{saved=new Set()}
let savedCache={};try{savedCache=JSON.parse(localStorage.getItem('museSavedCache')||'{}')}catch{savedCache={}}
function persist(){try{localStorage.setItem('museSaved',JSON.stringify([...saved]));localStorage.setItem('museSavedCache',JSON.stringify(savedCache))}catch{}}
function visibleData(){if(state.view!=='saved')return activeData();const known=new Set(activeData().map(t=>t.id));return [...activeData(),...Object.values(savedCache).filter(t=>t&&t.id&&!known.has(t.id))]}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400)}
function setView(view){state.view=view;document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));$('crumbText').textContent=({discover:'DISCOVER',saved:'SAVED',sources:'SOURCES'})[view];$('mainContent').querySelectorAll('.intro,.hero,.metrics,.trends-section,.leads-section').forEach(el=>el.hidden=view==='sources');if(view==='sources'){renderSources();$('mainContent').querySelector('.source-page')?.remove();const elem=document.createElement('section');elem.className='source-page';elem.id='sourcePage';elem.innerHTML=sourceHTML();$('mainContent').insertBefore(elem,$('mainContent').querySelector('footer'));}else{$('sourcePage')?.remove();render()}
 if(view==='saved'){$('resultsTitle').innerHTML='저장한 트렌드 <span id="resultsCount">00</span>';$('sectionSubtitle').textContent='저장해 둔 메이크업 아이디어를 한곳에서 살펴보세요.';}else if(view==='discover'){$('resultsTitle').innerHTML='발견한 트렌드 <span id="resultsCount">00</span>';$('sectionSubtitle').textContent='로블록스·토미에처럼 사람들의 화면에 등장하는 새로운 얼굴들.';}
 if(view!=='sources'){render();$('trendsSection').scrollIntoView({behavior:'smooth',block:'start'});}else{window.scrollTo({top:0,behavior:'smooth'})}}
function render(){const sample=isExampleMode(),cards=visibleData();let filtered=cards.filter(t=>(state.category==='all'||t.category===state.category)&&(state.view!=='saved'||saved.has(t.id))&&(!state.query||[t.title,t.subtitle,t.description,...(t.keywords||[])].join(' ').toLowerCase().includes(state.query.toLowerCase())));
 filtered=[...filtered].sort((a,b)=>state.sort==='popular'?Number(b.score||0)-Number(a.score||0):new Date(b.latest_at||0)-new Date(a.latest_at||0));
 $('cardsGrid').innerHTML=filtered.map((t,i)=>cardHTML(t,i)).join('');$('noResults').hidden=filtered.length>0;$('resultsCount').textContent=String(filtered.length).padStart(2,'0');const count=cards.reduce((sum,t)=>sum+Number(t.source_posts?.length||0),0);$('metricTrends').textContent=String(cards.filter(t=>!t.example).length).padStart(2,'0');$('metricVideos').textContent=fmtNum(sample?0:count);$('metricRefresh').textContent=fmtRefresh(data.updated_at);$('metricMode').textContent=sample?'DEMO':data.live_discovery?'SEARCH':'SOURCES';$('metricModeLabel').textContent=sample?'예시 콘셉트 전시':data.live_discovery?'공개 YouTube 검색 추가됨':'공개 출처의 원본 링크';$('modeBadge').classList.toggle('live',Boolean(data.live_discovery));$('modeBadge').innerHTML='<span class="status-led"></span> '+(sample?'샘플 화면':data.live_discovery?'공개 검색 반영':'11/11 출처 스냅샷');
 const notice=$('dataNotice');notice.classList.toggle('live-notice',Boolean(data.live_discovery));notice.innerHTML=sample?'<strong>미리보기 모드</strong> — 아직 원본 영상이 수집되지 않았어요.':data.live_discovery?'<strong>공개 영상 검색 반영</strong> — 사이트를 열 때 공개 YouTube 검색에서 발견된 영상이 추가됐어요. Instagram/TikTok 순위는 아니에요.':'<strong>11월 11일 출처 스냅샷</strong> — 공개 트렌드 리포트가 인용한 원본 영상 15개를 모았어요. 원본 게시물 자체는 직접 확인하지 못했으며, 매일 사이트 자동 수집은 아직 아닙니다.';
 $('savedCount').textContent=saved.size;$('savedRailCount').textContent=saved.size;$('heroDescription').innerHTML=sample?'메이크업 트렌드를 둘러보세요.':'확인 가능한 원본 영상 링크를 모았어요.<br>사이트를 열면 공개 YouTube 검색도 시도해요.';
 $('creativeNote').textContent=filtered.length?(filtered[0].example?'캐릭터의 눈매와 입술을 현실적으로 재해석하고, 마지막 1초에 원본 레퍼런스를 공개하는 Before / After 릴스.':`‘${filtered[0].title}’ 콘셉트를 3초 훅 → 디테일 클로즈업 → 완성 컷으로 구성해보세요.`):'평소 좋아하는 메이크업을 3초 훅과 전후 변신 컷으로 편집해보세요.';
 const leads=data.leads||[];$('leadsCount').textContent=String(leads.length).padStart(2,'0');$('leadList').innerHTML=leads.length?leads.slice(0,9).map(leadHTML).join(''):'<div class="empty-leads">별도로 확인된 키워드 후보가 아직 없어요. &nbsp; <a href="https://trends.google.com/trending?geo=KR" target="_blank" rel="noopener noreferrer">한국 트렌드 보기 ↗</a></div>';
 }
function cardHTML(t,i){const cat=categoryNames[t.category]||'뷰티 콘셉트';const art=['roblox','tomie','daily'].includes(t.art)?t.art:'default';const proof=t.source_posts||[];const thumb=t.thumbnail?safeURL(t.thumbnail):'#';const img=thumb==='#'?'':`<img src="${escapeHTML(thumb)}" loading="lazy" alt="${escapeHTML(t.title)} 관련 공개 영상 썸네일" onerror="this.remove()">`;const artMarkup=img?'':(art==='roblox'?'<div class="art-halo"></div><div class="art-avatar"><span class="art-eye left"></span><span class="art-eye right"></span></div>':art==='tomie'?'<div class="art-halo"></div><div class="art-tomie"></div><div class="art-strand"></div><div class="art-tomie-mole"></div>':'<div class="art-halo"></div>');return `<article class="trend-card"><div class="card-visual" data-art="${art}" data-open="${escapeHTML(t.id)}" role="button" tabindex="0" aria-label="${escapeHTML(t.title)} 자세히 보기">${img}${artMarkup}<span class="visual-tag">${escapeHTML(cat)}</span><button class="visual-save ${saved.has(t.id)?'saved':''}" data-save="${escapeHTML(t.id)}" aria-label="${saved.has(t.id)?'저장 취소':'트렌드 저장'}" title="저장하기">${saved.has(t.id)?'♥':'♡'}</button><span class="card-index">${String(i+1).padStart(2,'0')} / RADAR</span><span class="card-type">${t.example?'CONCEPT EXAMPLE':escapeHTML(t.source_posts?.[0]?.platform||'SOCIAL VIDEO')}</span></div><div class="card-info"><div class="card-eyebrow"><span>${escapeHTML(t.subtitle||'K-BEAUTY / MAKEUP')}</span><span class="signal-pill">${escapeHTML(t.status||'관찰 중')}</span></div><h3 class="card-title">${escapeHTML(t.title)}</h3><p class="card-desc">${escapeHTML(t.description||'새롭게 등장한 메이크업 콘셉트를 살펴보세요.')}</p><div class="card-meta"><span>${t.example?'원본 영상 미확인':`<strong>${fmtNum(proof.length)}</strong>개 링크 · <strong>${fmtNum(t.author_count)}</strong>명 크리에이터`}</span><button data-open="${escapeHTML(t.id)}">${t.example?'주제 살펴보기':'릴스 보기 ▶'}</button></div></div></article>`}
function leadHTML(t){return `<div class="lead-card"><span>${escapeHTML((t.source||'SEARCH').toUpperCase())} · ${escapeHTML(fmtDate(t.published_at))}</span><h4>${escapeHTML(t.title)}</h4><p>${escapeHTML(t.description||'검색 결과에서 관찰된 키워드입니다. 숏폼 확산 여부는 미검증입니다.')}</p><a href="${escapeHTML(safeURL(t.url))}" target="_blank" rel="noopener noreferrer">관련 출처 확인 ↗</a></div>`}
function sourceHTML(){const s=data.source_status||{};const labels=[['youtube','로그인 없는 YouTube 탐색','사이트를 열면 공개 검색 서버에 한국어 메이크업을 조회해 최근 14일 영상을 찾아요. 서버 제한으로 실패할 수 있어요.'],['instagram','Instagram 원본 링크','공개 트렌드 리포트가 소개한 원본 링크를 보관합니다. 새 릴스를 자동 수집하는 API 연결은 없어요.'],['tiktok','TikTok 원본 링크','공개 트렌드 리포트가 소개한 원본 링크를 보관합니다. 플랫폼 검색·재생은 접근 제한이 있을 수 있어요.']];return `<div class="source-intro"><div class="section-kicker">HOW IT WORKS / SOURCES</div><h2>공개 영상 링크를,<br>한 곳에 모았어요.</h2><p>외부 계정 연결 없이 작동하는 버전이에요. 이미 확보한 링크는 저장돼 있고, 열 때마다 추가 공개 영상 검색을 시도합니다. 브라우저를 닫은 동안 웹사이트 자체가 매일 갱신되는 구조는 아니에요.</p><p style="margin-top:9px;font-weight:800">마지막 실행: ${escapeHTML(data.updated_at?new Date(data.updated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'아직 없음')} · 원본 영상 링크는 2026년 11월 11일 확인된 공개 리포트 기준</p></div>${labels.map(([key,title,desc])=>`<div class="source-item"><div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(desc)}</p></div><span class="${s[key]?'active-source':''}">${s[key]?'● 공개 검색 성공':'○ 실시간 연결 없음'}</span></div>`).join('')}<div class="source-item"><div><strong>정확도에 관한 약속</strong><p>공개 자료에 기재된 링크를 모았으며 플랫폼이 영상 접근을 막을 수 있습니다. 확인되지 않은 조회수와 유행 상승률은 만들지 않아요. 플랫폼 전체 인기 순위가 아니에요.</p></div><span>TRANSPARENT</span></div>`}
function renderSources(){}
function officialVideoUrl(post){
 const original=safeURL(post.url);
 if(original==='#')return '#';
 try{
  const url=new URL(original);const host=url.hostname.replace(/^www\./,'').toLowerCase();
  if(post.platform==='youtube'&&['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host))return original;
  if(post.platform==='instagram'&&['instagram.com','m.instagram.com'].includes(host))return original;
  if(post.platform==='tiktok'&&['tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(host))return original;
 }catch{}
 return '#';
}
function embedFor(post){
 const original=officialVideoUrl(post);
 if(original==='#')return null;
 try{
  const url=new URL(original);
  if(post.platform==='youtube'){
   const id=url.hostname==='youtu.be'?url.pathname.slice(1).split('/')[0]:url.pathname.startsWith('/shorts/')?url.pathname.split('/')[2]:url.searchParams.get('v');
   if(/^[a-zA-Z0-9_-]{11}$/.test(id||''))return {url:`https://www.youtube-nocookie.com/embed/${id}?rel=0`,name:'YouTube'};
  }
  if(post.platform==='instagram'){
   const matched=url.pathname.match(/^\/(?:reel|p)\/([A-Za-z0-9_-]+)\/?/);
   if(matched)return {url:`https://www.instagram.com/reel/${matched[1]}/embed/`,name:'Instagram'};
  }
  if(post.platform==='tiktok'){
   const matched=url.pathname.match(/\/video\/(\d+)/);
   if(matched)return {url:`https://www.tiktok.com/embed/v2/${matched[1]}`,name:'TikTok'};
  }
 }catch{}
 return null;
}
function videoTile(post,index){
 const thumb=post.thumbnail&&safeURL(post.thumbnail)!=='#'?`<img loading="lazy" src="${escapeHTML(safeURL(post.thumbnail))}" alt="" onerror="this.remove()">`:'';
 return `<button class="video-tile ${index===currentlyPlaying?'chosen':''}" data-play-index="${index}" aria-label="${escapeHTML(sourceNames[post.platform]||'영상')} ${index+1}번 재생"><span class="video-tile-art">${thumb}<span class="play-bubble">▶</span></span><span class="video-tile-info"><span class="video-platform">${escapeHTML(sourceNames[post.platform]||post.platform||'영상')} · ${escapeHTML(fmtDate(post.published_at))}</span><strong>${escapeHTML(post.title||'원본 영상')}</strong><small>${escapeHTML(post.author?('@'+post.author.replace(/^@/,'')):'크리에이터 미표기')}${post.views!==null&&post.views!==undefined?' · 조회 '+fmtNum(post.views):''}</small></span></button>`;
}
function playVideo(index){
 if(!activeTrend)return;
 const posts=(activeTrend.source_posts||[]).filter(p=>officialVideoUrl(p)!=='#');
 if(!(index>=0&&index<posts.length))return;
 currentlyPlaying=index;
 const post=posts[index];const embed=embedFor(post);
 const stage=$('videoStage');if(!stage)return;
 stage.innerHTML=embed?`<div class="video-embed"><iframe title="${escapeHTML(post.title||'원본 영상')}" src="${escapeHTML(embed.url)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="video-stage-footer"><span>${escapeHTML(embed.name)}에서 재생 · 플랫폼 정책에 따라 재생이 차단될 수 있어요.</span><a href="${escapeHTML(officialVideoUrl(post))}" target="_blank" rel="noopener noreferrer">원본 앱에서 열기 ↗</a></div>`:
 `<div class="video-stage-placeholder"><span>↗</span><strong>이 영상은 사이트 내 재생을 지원하지 않아요</strong><a class="modal-action" href="${escapeHTML(officialVideoUrl(post))}" target="_blank" rel="noopener noreferrer">원본에서 영상 보기 ↗</a></div>`;
 $('videoList').innerHTML=posts.map(videoTile).join('');
}
function modalOpen(id){
 const item=visibleData().find(t=>t.id===id);if(!item)return;
 activeTrend=item;currentlyPlaying=-1;
 const posts=(item.source_posts||[]).filter(p=>officialVideoUrl(p)!=='#');
 const query=encodeURIComponent(item.title);
 const gallery=posts.length?`<div class="video-gallery"><div class="video-stage" id="videoStage"><div class="video-stage-placeholder"><span>▶</span><strong>보고 싶은 릴스를 선택해 줘.</strong><p>영상을 누르면 이곳에 재생돼요. 재생이 제한된 경우 원본으로 이동할 수 있어요.</p></div></div><div class="video-list" id="videoList">${posts.map(videoTile).join('')}</div></div>`:
 `<div class="video-empty"><span>◌</span><strong>아직 확보한 개별 영상 링크가 없어요.</strong><p>${item.example?'로블록스·토미에는 화면 예시이며 실시간 수집 자료가 아니에요.':'공개 검색에서 영상이 발견되면 여기에 추가될 수 있어요.'}</p></div>`;
 const growth=item.growth_percent!=null?` · 최근 게시 속도 변화 ${item.growth_percent>=0?'+':''}${fmtNum(item.growth_percent)}% (수집된 영상 기준)`:'';
 $('modalContents').innerHTML=`<span class="modal-kicker">${escapeHTML(categoryNames[item.category]||'BEAUTY TREND')} / ${item.example?'EXAMPLE':'SOURCE-LINKED POSTS'}</span><h2 id="modalTitle">${escapeHTML(item.title)}</h2><p class="modal-sub">${escapeHTML(item.description)}</p><div class="gallery-intro"><div><strong>${posts.length}</strong><span>공개 출처 영상 링크</span></div><div><strong>${fmtNum(item.author_count||0)}</strong><span>참여 크리에이터</span></div><div><strong>${item.latest_at?escapeHTML(fmtDate(item.latest_at)):'—'}</strong><span>최근 감지일</span></div></div><h3 class="gallery-title">관련 릴스 모아보기 <span>▶</span></h3>${gallery}<p class="gallery-disclaimer">영상 저작권은 각 크리에이터에게 있어요. 사이트는 원본 영상을 임베드하고, 플랫폼에서 재생을 제한하면 원본 링크를 제공해요.</p><div class="modal-divider"></div><p class="modal-sub">${item.example?'이 콘셉트는 데모 예시예요. 실제 급상승 여부는 아직 확인되지 않았어요.':`수집된 게시물 ${fmtNum(item.post_count)}개 · ${escapeHTML(item.status||'관찰 중')}${growth}. 플랫폼 전체를 대표하는 통계는 아니에요.`}</p>${item.evidence_url?`<p class="gallery-disclaimer">자료 출처: <a href="${escapeHTML(safeURL(item.evidence_url))}" target="_blank" rel="noopener noreferrer">공개 트렌드 리포트 ↗</a> · 영상 직접 확인은 플랫폼 로그인/차단에 따라 제한될 수 있어요.</p>`:''}<div class="modal-note">촬영 아이디어: 이 메이크업의 대표 요소 하나를 첫 3초에 확대하고, Before / After로 완성 컷을 공개해 보세요.</div><div class="external-searches"><a class="modal-action" href="https://www.instagram.com/explore/search/keyword/?q=${query}" target="_blank" rel="noopener noreferrer">Instagram 검색 ↗</a><a class="modal-action" href="https://www.tiktok.com/search?q=${query}" target="_blank" rel="noopener noreferrer">TikTok 검색 ↗</a><a class="modal-action" href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener noreferrer">YouTube 검색 ↗</a></div>`;
 $('detailModal').hidden=false;document.body.style.overflow='hidden';$('modalClose').focus();
}
function modalClose(){
 $('detailModal').hidden=true;document.body.style.overflow='';activeTrend=null;currentlyPlaying=-1;
 // Removing the iframe stops audio immediately when the modal closes.
 $('modalContents').replaceChildren();
}
document.addEventListener('click',e=>{const play=e.target.closest('[data-play-index]');if(play){playVideo(Number(play.dataset.playIndex));return;}const save=e.target.closest('[data-save]');if(save){const id=save.dataset.save;if(saved.has(id)){saved.delete(id);delete savedCache[id];toast('저장을 취소했어요')}else{saved.add(id);const item=visibleData().find(t=>t.id===id);if(item)savedCache[id]=item;toast('내 컬렉션에 저장했어요 ♡')}persist();render();return}const open=e.target.closest('[data-open]');if(open){modalOpen(open.dataset.open);return}const chip=e.target.closest('[data-category]');if(chip){state.category=chip.dataset.category;document.querySelectorAll('.chip').forEach(b=>b.classList.toggle('active',b===chip));render();return}const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view)}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setView('discover');$('searchInput').focus()}if(e.key==='Escape'&&!$('detailModal').hidden)modalClose();if((e.key==='Enter'||e.key===' ')&&e.target.matches('.card-visual[data-open]')){e.preventDefault();modalOpen(e.target.dataset.open)}});
$('searchInput').addEventListener('input',e=>{state.query=e.target.value;render()});$('sortBtn').addEventListener('click',()=>{state.sort=state.sort==='new'?'popular':'new';$('sortBtn').innerHTML=state.sort==='new'?'최신순 <span>↓</span>':'관심도순 <span>↓</span>';render()});$('browseBtn').addEventListener('click',()=>$('trendsSection').scrollIntoView({behavior:'smooth'}));$('goSavedBtn').addEventListener('click',()=>setView('saved'));$('resetBtn').addEventListener('click',()=>{state.query='';state.category='all';$('searchInput').value='';document.querySelectorAll('.chip').forEach(b=>b.classList.toggle('active',b.dataset.category==='all'));render()});$('modalClose').addEventListener('click',modalClose);$('detailModal').addEventListener('click',e=>{if(e.target===$('detailModal'))modalClose()});
window.MuseRadarAddDiscovered=function incoming(update){
 if(!update||!Array.isArray(update.trends)||!update.trends.length)return;
 for(const newer of update.trends){
  if(!newer||!newer.id||!Array.isArray(newer.source_posts))continue;
  const existing=(data.trends||[]).find(t=>t.id===newer.id);
  if(existing){const old=new Set((existing.source_posts||[]).map(p=>p.url));for(const post of newer.source_posts){if(!old.has(post.url)){existing.source_posts.push(post);old.add(post.url)}}existing.post_count=existing.source_posts.length;existing.author_count=new Set(existing.source_posts.map(p=>p.author).filter(Boolean)).size;existing.example=false;existing.status=existing.snapshot?'원본 링크 + 공개 검색':'공개 검색 영상 추가';existing.latest_at=[existing.latest_at,newer.latest_at].filter(Boolean).sort().at(-1);}
  else data.trends.push(newer);
 }
 data.live_discovery=true;data.source_status.youtube=true;render();
};
const now=new Date();$('todayText').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric',weekday:'short'}).format(now);render();
})();

