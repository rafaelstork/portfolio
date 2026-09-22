import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { setupProjects } from './projects';
import { setupFAQ } from './faq';


import Lenis from 'lenis';
import Swup from 'swup';
import SwupHeadPlugin from '@swup/head-plugin';

gsap.registerPlugin(ScrollTrigger, SplitText);
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let cleanup = () => {};
let generation = 0;
let lenis: Lenis | null = null;
let frameFn: ((time: number) => void) | null = null;

function setupSmoothScroll() {
  lenis?.destroy(); lenis = null;
  if(frameFn)gsap.ticker.remove(frameFn);
  if(!preference.matches){
    lenis=new Lenis({duration:1.05,smoothWheel:true,anchors:false});
    lenis.on('scroll',ScrollTrigger.update);
    frameFn=(time)=>lenis?.raf(time*1000);
    gsap.ticker.add(frameFn);gsap.ticker.lagSmoothing(0);
  }
}

function setupVideo(signal: AbortSignal, reduced: boolean) {
  const section=document.querySelector<HTMLElement>('.presence');
  const video=section?.querySelector<HTMLVideoElement>('video');
  if(!video || !section)return ()=>{};
  const toggle=section.querySelector<HTMLButtonElement>('.film-toggle')!;
  const instruction=section.querySelector<HTMLElement>('.film-instruction')!;
  let trigger: ScrollTrigger | undefined, paused=false, desired=0, disposed=false, loaded=false, seeking=false;
  let pending=0;
  const seek=()=>{
    if(disposed||paused||reduced||!loaded||video.seeking||seeking)return;
    const target=Math.min(Math.max(desired,0),Math.max(0,video.duration-.04));
    if(Math.abs(video.currentTime-target)>.006){seeking=true;try{video.currentTime=target;}catch{seeking=false;}}
  };
  const onReady=()=>{
    if(disposed||loaded||!Number.isFinite(video.duration))return;
    loaded=true;
    if(reduced)return;
    toggle.hidden=false;
    trigger=ScrollTrigger.create({trigger:section,start:()=>0,end:()=>`+=${innerHeight*1.25}`,pin: section.querySelector('.presence-sticky')!.getBoundingClientRect().height + 0 <= innerHeight + 2 ? section.querySelector('.presence-sticky') : false,pinSpacing:true,invalidateOnRefresh:true,onUpdate:self=>{desired=self.progress*video.duration;gsap.set('.film-progress span',{scaleX:self.progress});seek();}});
    seek();ScrollTrigger.refresh();lenis?.resize();
  };
  video.addEventListener('loadedmetadata',onReady,{signal});
  video.addEventListener('seeked',()=>{seeking=false;cancelAnimationFrame(pending);pending=requestAnimationFrame(seek);},{signal});
  video.addEventListener('error',()=>{toggle.hidden=true;instruction.textContent='Da ideia à presença.';trigger?.kill();ScrollTrigger.refresh();},{signal});
  toggle.addEventListener('click',()=>{paused=!paused;toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'Retomar movimento':'Pausar movimento';if(!paused)seek();},{signal});
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)&&!video.getAttribute('src')&&!reduced){video.src=video.dataset.src!;video.preload='auto';video.load();observer.disconnect();}
  },{rootMargin:'650px'});observer.observe(section);
  if(reduced)instruction.textContent='Forma, direção e movimento.';
  return ()=>{disposed=true;observer.disconnect();cancelAnimationFrame(pending);trigger?.kill();video.pause();video.removeAttribute('src');video.load();};
}

function initPage() {
  const id=++generation;
  const reduced=preference.matches;
  document.body.classList.toggle('has-hero',!!document.querySelector('.hero-stage'));
  const abort=new AbortController();
  const disposers:Array<()=>void>=[];
  const context=gsap.context(()=>{
    if(!reduced){
      const heading=document.querySelector('[data-title]');
      if(heading){
        const split=SplitText.create(heading,{type:'lines',autoSplit:true,mask:'lines',onSplit:self=>gsap.from(self.lines,{yPercent:105,duration:.85,stagger:.09,ease:'expo.out'})});
        disposers.push(()=>split.revert());
      }
      gsap.from('.sculpture',{opacity:0,duration:1.1,delay:.1});
      document.querySelectorAll('[data-reveal]').forEach(el=>gsap.from(el,{y:28,opacity:0,duration:.85,ease:'expo.out',scrollTrigger:{trigger:el,start:'top 94%',once:true}}));
      document.querySelectorAll('.project-image').forEach(el=>gsap.from(el,{clipPath:'inset(8% 0 0 0)',duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 95%',once:true}}));
      document.querySelectorAll<SVGPathElement>('.signature-line path').forEach(path=>{const length=path.getTotalLength();gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:path.closest('svg'),start:'top 92%',end:'bottom 65%',scrub:.7}});});
    }
  });
  disposers.push(setupVideo(abort.signal,reduced));
  if(!reduced&&document.querySelector('.hero-stage'))import('./hero-motion').then(({setupHeroMotion})=>{
    if(id===generation&&!abort.signal.aborted)disposers.push(setupHeroMotion(abort.signal,reduced));
  }).catch(()=>{});
  disposers.push(setupProjects(abort.signal,reduced));
  disposers.push(setupFAQ(abort.signal,reduced,()=>{ScrollTrigger.refresh();lenis?.resize();}));

  const shapes=[...document.querySelectorAll<HTMLElement>('#swup [data-shape]')];
  let shapeFrame=0;
  function updateShapes(){shapeFrame=0;if(abort.signal.aborted||reduced)return;shapes.forEach((shape,i)=>{const rect=shape.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;const progress=gsap.utils.clamp(0,1,(innerHeight-rect.top)/(innerHeight+rect.height));gsap.set(shape,{rotation:(i%2?-1:1)*(progress-.5)*180,y:(progress-.5)*-60});gsap.set(shape.children,{scale:.8+progress*.28});});}
  function requestShapes(){if(!shapeFrame)shapeFrame=requestAnimationFrame(updateShapes);}
  window.addEventListener('scroll',requestShapes,{signal:abort.signal,passive:true});window.addEventListener('resize',requestShapes,{signal:abort.signal});document.addEventListener('portfolio:refresh',requestShapes,{signal:abort.signal});requestShapes();
  disposers.push(()=>cancelAnimationFrame(shapeFrame));
  const scenes = document.querySelectorAll<HTMLElement>('[data-sculpture]');
  if(scenes.length){
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry=>entry.isIntersecting).forEach(entry=>{
        observer.unobserve(entry.target);
        import('./sculpture').then(({createSculpture})=>{
          if(id===generation&&!abort.signal.aborted)disposers.push(createSculpture(entry.target as HTMLElement,reduced));
        }).catch(()=>{});
      });
    }, {rootMargin:'400px'});
    scenes.forEach(scene=>observer.observe(scene));
    disposers.push(()=>observer.disconnect());
  }
  document.querySelectorAll<HTMLAnchorElement>('.site-header nav a').forEach(a=>{
    a.removeAttribute('aria-current');
    const url=new URL(a.href);
    if(url.pathname===location.pathname&&!url.hash&&url.origin===location.origin)a.setAttribute('aria-current','page');
  });
  document.fonts.ready.then(()=>{if(!abort.signal.aborted){ScrollTrigger.refresh();lenis?.resize();}});
  cleanup=()=>{generation++;abort.abort();disposers.reverse().forEach(fn=>fn());context.revert();};
}

// Persistent controls live outside Swup's replaced container.
const themeSwitch=document.querySelector<HTMLButtonElement>('[data-theme-switch]')!;
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
let themeChoice='system';try{themeChoice=localStorage.getItem('rafa-theme')||'system';}catch{}
function applyTheme(){
  const dark=themeChoice==='dark'||(themeChoice==='system'&&systemTheme.matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  themeSwitch.setAttribute('aria-checked',String(dark));themeSwitch.title=dark?'Ativar modo claro':'Ativar modo escuro';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#10272c':'#f7f5ef');
}
themeSwitch.addEventListener('click',()=>{themeChoice=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('rafa-theme',themeChoice);}catch{}applyTheme();});
systemTheme.addEventListener('change',applyTheme);applyTheme();
const header=document.querySelector<HTMLElement>('.site-header')!;
const menu=document.querySelector<HTMLDialogElement>('#mobile-menu')!;
const menuToggle=document.querySelector<HTMLButtonElement>('.menu-toggle')!;
let menuAnimation:gsap.core.Timeline|undefined,lastY=scrollY;
function closeMenu(restore=true,animate=true,resume=true){
  if(!menu.open)return;
  menuAnimation?.kill();menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Abrir menu');
  const finish=()=>{menu.close();document.querySelector<HTMLElement>('#swup')!.inert=false;document.body.classList.remove('menu-is-open');gsap.set(menu,{clearProps:'opacity,transform,clipPath'});if(resume)lenis?.start();if(restore)menuToggle.focus({preventScroll:true});};
  if(animate&&!preference.matches)menuAnimation=gsap.timeline({onComplete:finish}).to(menu,{clipPath:'inset(0 0 100% 0)',duration:.5,ease:'power3.inOut'});else finish();
}
menuToggle.addEventListener('click',()=>{
  if(menu.open){closeMenu();return;}menuAnimation?.kill();menu.show();document.querySelector<HTMLElement>('#swup')!.inert=true;menuToggle.setAttribute('aria-label','Fechar menu');document.body.classList.add('menu-is-open');menuToggle.setAttribute('aria-expanded','true');lenis?.stop();header.classList.remove('header-hidden');
  if(!preference.matches)menuAnimation=gsap.timeline().fromTo(menu,{clipPath:'inset(0 0 100% 0)',opacity:1,y:0},{clipPath:'inset(0 0 0% 0)',duration:.75,ease:'power3.inOut'}).fromTo(menu.querySelectorAll('nav a'),{opacity:0,y:12},{opacity:1,y:0,duration:.6,stagger:.07,ease:'power2.out'},.2).fromTo(menu.querySelectorAll('.scroll-shape'),{rotation:-20,scale:.9,opacity:0},{rotation:15,scale:1,opacity:1,duration:1.1,stagger:.1,ease:'power2.inOut'},.1);
});
menu.querySelector('.menu-close')?.addEventListener('click',()=>closeMenu());
document.addEventListener('keydown',event=>{if(!menu.open)return;if(event.key==='Escape'){event.preventDefault();closeMenu();}if(event.key==='Tab'){const items=[...header.querySelectorAll<HTMLElement>('a,button'),...menu.querySelectorAll<HTMLElement>('a,button')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu(false,false)));
matchMedia('(min-width:761px)').addEventListener('change',event=>{if(event.matches)closeMenu(false,false);});
window.addEventListener('scroll',()=>{const y=Math.max(0,scrollY),delta=y-lastY;const hero=document.querySelector<HTMLElement>('.hero-stage');const film=hero?.querySelector<HTMLVideoElement>('video');const inHero=!!hero&&hero.getBoundingClientRect().bottom>0;const filmFinished=preference.matches||!!film?.error||!!(film&&Number.isFinite(film.duration)&&film.currentTime>=film.duration-.15);header.classList.toggle('over-hero',inHero&&hero!.getBoundingClientRect().bottom>header.clientHeight);const holdHero=inHero&&(!filmFinished||hero!.getBoundingClientRect().top>=-2);if(holdHero||menu.open||y<100||delta< -2)header.classList.remove('header-hidden');else if(delta>3&&!header.contains(document.activeElement))header.classList.add('header-hidden');lastY=y;},{passive:true});
header.classList.toggle('over-hero',!!document.querySelector('.hero-stage'));
header.addEventListener('focusin',()=>header.classList.remove('header-hidden'));

setupSmoothScroll();initPage();
const overlay=document.querySelector<HTMLElement>('.page-overlay')!;
const bands=overlay.querySelectorAll('.overlay-band');
const emblem=overlay.querySelector('.overlay-emblem');
const logoPieces=overlay.querySelectorAll<SVGPathElement>('.logo-piece');
logoPieces.forEach(path=>{path.removeAttribute('pathLength');path.style.strokeDasharray=String(path.getTotalLength());path.style.strokeDashoffset=String(path.getTotalLength());});
const pathLength=(_i:number,el:SVGPathElement)=>el.getTotalLength();
let overlayAnimation:gsap.core.Timeline|undefined;
let coverage:Promise<void>|null=null;
function resetOverlay(){overlayAnimation?.kill();coverage=null;gsap.set(bands,{y:0,yPercent:100});gsap.set(emblem,{opacity:0});gsap.set(logoPieces,{strokeDasharray:pathLength,strokeDashoffset:pathLength,clearProps:'transform,opacity'});overlay.classList.remove('is-active');}
function coverPage(cover:boolean){
  if(preference.matches){resetOverlay();return Promise.resolve();}
  overlayAnimation?.kill();overlay.classList.add('is-active');
  return new Promise<void>(resolve=>{
    const timeline=gsap.timeline({onComplete:()=>{if(!cover){overlay.classList.remove('is-active');gsap.set(bands,{y:0,yPercent:100});}resolve();},onInterrupt:resolve});
    overlayAnimation=timeline;
    if(cover){
      timeline.set(bands,{y:0,yPercent:100}).set(emblem,{opacity:0})
        .to(bands,{yPercent:0,duration:.5,stagger:.075,ease:'power3.inOut'})
        .set(emblem,{opacity:1})
        .fromTo(logoPieces,{strokeDasharray:pathLength,strokeDashoffset:pathLength},{strokeDashoffset:0,duration:.38,stagger:.07,ease:'none'})
        .to({},{duration:.06});
    }else{
      timeline.to(logoPieces,{strokeDashoffset:(_i:number,el:SVGPathElement)=>-el.getTotalLength(),duration:.28,stagger:.05,ease:'none'})
        .set(emblem,{opacity:0})
        .to(bands,{yPercent:-100,duration:.55,stagger:.055,ease:'power3.inOut'});
    }
  });
}
const swup=new Swup({containers:['#swup'],plugins:[new SwupHeadPlugin({persistAssets:true})],animationSelector:false,animateHistoryBrowsing:true,linkSelector:'a[href]:not([data-project-choice]):not([data-no-swup]):not([target="_blank"]):not([download])'});
swup.hooks.replace('animation:out:await',()=>coverage??=coverPage(true));
swup.hooks.replace('animation:in:await',()=>coverPage(false));
swup.hooks.on('visit:start',()=>{coverage=null;closeMenu(false,false,false);lenis?.stop();document.body.setAttribute('aria-busy','true');});
swup.hooks.before('content:replace',async()=>{await (coverage??=coverPage(true));cleanup();});
swup.hooks.on('page:view',()=>{applyTheme();lenis?.resize();initPage();header.classList.toggle('over-hero',!!document.querySelector('.hero-stage'));header.classList.remove('header-hidden');document.querySelector<HTMLElement>('main')?.focus({preventScroll:true});});
swup.hooks.on('visit:end',()=>{coverage=null;lenis?.start();document.body.removeAttribute('aria-busy');ScrollTrigger.refresh();document.dispatchEvent(new Event('portfolio:refresh'));});
for(const hook of ['visit:abort','fetch:error'] as const)swup.hooks.on(hook,()=>{resetOverlay();lenis?.start();document.body.removeAttribute('aria-busy');});
swup.hooks.replace('scroll:anchor',(_visit,{hash})=>{const anchor=document.getElementById(decodeURIComponent(hash.replace(/^#/,'')));if(!anchor)return false;const offset=-(header.clientHeight+18);if(lenis)lenis.scrollTo(anchor,{offset,duration:1.3,force:true});else window.scrollTo({top:anchor.getBoundingClientRect().top+scrollY+offset,behavior:preference.matches?'instant':'smooth'});return true;});
swup.hooks.replace('scroll:top',()=>{if(lenis)lenis.scrollTo(0,{immediate:true,force:true});else window.scrollTo(0,0);});
preference.addEventListener('change',()=>{resetOverlay();cleanup();setupSmoothScroll();initPage();if(menu.open)closeMenu(false,false);});




