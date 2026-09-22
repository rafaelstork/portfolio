import type { } from 'gsap';

// A single viewport mask covers the image, copy and persistent navigation together.
export function createHeroReveal(){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.classList.add('hero-reveal');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(ns,'path');path.setAttribute('fill-rule','evenodd');
  svg.append(path);document.body.append(svg);
  return {
    update(state:{aperture:number;tilt:number;roll:number;centerY:number;reveal:number}){
      const w=innerWidth,h=innerHeight;
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const half=state.aperture*h,r=Math.min(half,.034*h*(1-state.reveal));
      const points:string[]=[];
      for(let corner=0;corner<4;corner++){
        const angle=corner*Math.PI/2;
        const cx=(corner===0||corner===3?1:-1)*(half-r);
        const cy=(corner<2?1:-1)*(half-r);
        for(let step=0;step<=12;step++){
          const a=angle+step/12*Math.PI/2;
          const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
          const rx=x*Math.cos(state.roll)-y*Math.sin(state.roll);
          const ry=x*Math.sin(state.roll)+y*Math.cos(state.roll);
          const perspective=1+ry*Math.sin(state.tilt)/(h*2);
          points.push(`${(w/2+rx/perspective).toFixed(2)},${(h*(1-state.centerY)-ry*Math.cos(state.tilt)/perspective).toFixed(2)}`);
        }
      }
      path.setAttribute('d',`M0 0H${w}V${h}H0Z M${points.join('L')}Z`);
    },
    remove(){svg.remove();}
  };
}
