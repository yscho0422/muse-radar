
/*
 * No-login, best-effort video search. Searches public third-party Invidious
 * instances for Korean makeup videos on each visit, at most once per 6h.
 * This is NOT a crawler of Instagram/TikTok, nor a background updater.
 * Requests may be rate limited or blocked by CORS; the sourced snapshot remains.
 */
(() => {
  'use strict';
  const INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.tiekoetter.com'
  ];
  const TARGETS = [
    {id:'roblox-20261111',title:'로블록스 메이크업',q:'로블록스 메이크업'},
    {id:'cat-20261111',title:'고양이 메이크업',q:'고양이 메이크업'},
    {id:'catlike-20261111',title:'고양이상 메이크업',q:'고양이상 메이크업'},
    {id:'tomie-interest',title:'토미에 메이크업',q:'토미에 메이크업'}
  ];
  const EXTRA=['메이크업 챌린지','캐릭터 메이크업'];
  const cacheKey='muse-public-youtube-v4';
  const TTL=1000*60*15;
  const now=Date.now();
  const isId=id=>/^[a-zA-Z0-9_-]{11}$/.test(id||'');
  const isRecent=pub=>pub&&Date.now()-pub < 1000*60*60*24*14&&Date.now()-pub>-1000*60*60*24;
  const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').trim().slice(0,180);
  const STOP=new Set(['데일리','추천','초간단','오늘','아이','여름','가을','겨울','봄','셀프','인기','연예인','일본','한국','기초','여자','남자','메이크업','초보','학생','커버','장인','뷰티','미친','완벽한','챌린지','유행','최신','아이라인','틴트','고급']);
  function normalize(rows, target) {
    if(!Array.isArray(rows))return [];
    const found=new Set();
    return rows.filter(item => item?.type === 'video' && isId(item.videoId))
      .map(item=>{
        const time=Number(item.published||0)*1000;
        if (!isRecent(time) || Number(item.lengthSeconds||0)>180 || Number(item.lengthSeconds||0)<=0)return null;
        const label=clean(item.title)+' '+clean(item.description);
        const stem=target.q.replace(/\s*메이크업$/, '');
        if(!label.toLowerCase().includes(stem.toLowerCase()))return null;
        return {
          platform:'youtube',url:'https://www.youtube.com/watch?v='+item.videoId,
          author:clean(item.author||'크리에이터'),published_at:new Date(time).toISOString(),
          title:clean(item.title),thumbnail:'https://i.ytimg.com/vi/'+item.videoId+'/hqdefault.jpg',views:Number.isFinite(Number(item.viewCount))?Number(item.viewCount):null,
          source_method:'public-invidious-search'
        };
      }).filter(item=>{
        if(!item||found.has(item.url))return false;
        found.add(item.url);return true;
      }).slice(0,7);
  }
  function buildData(lookups){
    return lookups.flatMap(({target,posts})=>posts.length?[{
      id:target.id,title:target.title,subtitle:'NEW PUBLIC VIDEO SEARCH',
      category:'character',description:'최근 공개 영상 검색에서 추가로 발견한 자료입니다. SNS 전체 유행 순위는 아닙니다.',
      status:'공개 영상 추가',post_count:posts.length,author_count:new Set(posts.map(p=>p.author)).size,
      score:0,latest_at:posts.map(p=>p.published_at).sort().at(-1),art:target.id.startsWith('roblox')?'roblox':target.id.startsWith('tomie')?'tomie':'daily',
      example:false,source_posts:posts,keywords:[target.title,'메이크업'],source_method:'public-search'
    }]:[]);
  }
  function discoverUnknown(results){
    const groups=new Map();
    for(const {posts} of results){for(const post of posts){
      const matches=String(post.title||'').matchAll(/([가-힣A-Za-z]{2,15})\s*메이크업/g);
      for(const m of matches){const word=m[1].toLowerCase();if(STOP.has(word))continue;
        const title=m[1]+' 메이크업';
        if(TARGETS.some(t=>t.title===title))continue;
        const key=title.toLowerCase();if(!groups.has(key))groups.set(key,{title,posts:[]});
        if(!groups.get(key).posts.some(v=>v.url===post.url))groups.get(key).posts.push(post);
      }
    }}
    return [...groups.values()].filter(g=>g.posts.length>=2&&new Set(g.posts.map(p=>p.author)).size>=2).slice(0,6).map(g=>({
      id:'discovered-'+encodeURIComponent(g.title),title:g.title,subtitle:'NEW LOOK / PUBLIC VIDEO',category:'character',
      description:'최근 한국어 공개 영상 제목에서 반복적으로 발견된 콘셉트. 플랫폼 전체 트렌드라는 뜻은 아닙니다.',
      status:'2명 이상 반복 관측',post_count:g.posts.length,author_count:new Set(g.posts.map(p=>p.author)).size,score:g.posts.length,
      latest_at:g.posts.map(p=>p.published_at).sort().at(-1),example:false,source_posts:g.posts,keywords:[g.title],art:'daily'
    }));
  }
  async function search(target, instance){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),4300);
    try{
      const url=new URL('/api/v1/search',instance);
      url.searchParams.set('q',target.q);
      url.searchParams.set('type','video');
      url.searchParams.set('sort_by','upload_date');
      url.searchParams.set('date','week');
      const r=await fetch(url.href,{signal:controller.signal,mode:'cors',credentials:'omit'});
      if(!r.ok)throw Error('Search unavailable');
      return normalize(await r.json(),target);
    }finally{clearTimeout(timeout)}
  }
  async function run(force=false, onStatus=()=>{}){
    let cached=null;
    try {cached=JSON.parse(localStorage.getItem(cacheKey)||'null')}catch{}
    if(!force && cached?.time && Date.now()-cached.time<TTL && Array.isArray(cached.trends)){
      window.MuseRadarAddDiscovered?.({trends:cached.trends});return {source:'cache',videos:cached.trends.reduce((n,t)=>n+(t.source_posts?.length||0),0),available:true};
    }
    // Sequential instance failover, not repeated bulk traffic.
    const lookups=[...TARGETS,...EXTRA.map(q=>({id:null,title:q,q}))];
    const results=await Promise.all(lookups.map(async target=>{
      let rows=[];let available=false;
      for(const instance of INSTANCES){
        try {rows=await search(target,instance);available=true;break;}catch{}
      }
      return {target,posts:rows,available};
    }));
    const working=results.filter(r=>r.available).length;
    if(!working){onStatus('공개 영상 검색 서비스 응답 없음');return {source:'none',videos:0,available:false};}
    const trends=[...buildData(results.filter(r=>r.target.id)),...discoverUnknown(results.filter(r=>!r.target.id))];
    try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),trends}))}catch{}
    if(trends.length)window.MuseRadarAddDiscovered?.({trends});
    const videos=new Set(trends.flatMap(t=>(t.source_posts||[]).map(p=>p.url))).size;
    onStatus('검색한 공개 영상 '+videos+'개 · Instagram 최신 검색은 별도 데이터 연결 필요');
    return {source:'public-search',videos,available:true};
  }
  window.MuseRadarSearchNow = (callback)=>run(true,callback);
  const delay=()=>run(false).catch(()=>{});
  delay();
  setInterval(delay,TTL);
})();

