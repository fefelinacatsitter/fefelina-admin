var ve=Object.defineProperty;var we=(t,r,s)=>r in t?ve(t,r,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[r]=s;var B=(t,r,s)=>(we(t,typeof r!="symbol"?r+"":r,s),s);import{r as c,a as Ne,R as _e}from"./recharts-c8f055a0.js";import{c as Ce,_ as p}from"./supabase-6a05ac42.js";import{u as le,a as ce,L as ee,N as ke,B as Ee,R as te,b as x}from"./react-vendor-4d4caec1.js";(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const l of a.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function s(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(o){if(o.ep)return;o.ep=!0;const a=s(o);fetch(o.href,a)}})();var de={exports:{}},M={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Fe=c,Pe=Symbol.for("react.element"),Le=Symbol.for("react.fragment"),Ae=Object.prototype.hasOwnProperty,Re=Fe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Oe={key:!0,ref:!0,__self:!0,__source:!0};function me(t,r,s){var i,o={},a=null,l=null;s!==void 0&&(a=""+s),r.key!==void 0&&(a=""+r.key),r.ref!==void 0&&(l=r.ref);for(i in r)Ae.call(r,i)&&!Oe.hasOwnProperty(i)&&(o[i]=r[i]);if(t&&t.defaultProps)for(i in r=t.defaultProps,r)o[i]===void 0&&(o[i]=r[i]);return{$$typeof:Pe,type:t,key:a,ref:l,props:o,_owner:Re.current}}M.Fragment=Le;M.jsx=me;M.jsxs=me;de.exports=M;var e=de.exports,q={},re=Ne;q.createRoot=re.createRoot,q.hydrateRoot=re.hydrateRoot;let Se={data:""},$e=t=>typeof window=="object"?((t?t.querySelector("#_goober"):window._goober)||Object.assign((t||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:t||Se,ze=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Ie=/\/\*[^]*?\*\/|  +/g,se=/\n+/g,C=(t,r)=>{let s="",i="",o="";for(let a in t){let l=t[a];a[0]=="@"?a[1]=="i"?s=a+" "+l+";":i+=a[1]=="f"?C(l,a):a+"{"+C(l,a[1]=="k"?"":r)+"}":typeof l=="object"?i+=C(l,r?r.replace(/([^,])+/g,n=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,n):n?n+" "+d:d)):a):l!=null&&(a=/^--/.test(a)?a:a.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=C.p?C.p(a,l):a+":"+l+";")}return s+(r&&o?r+"{"+o+"}":o)+i},N={},ue=t=>{if(typeof t=="object"){let r="";for(let s in t)r+=s+ue(t[s]);return r}return t},De=(t,r,s,i,o)=>{let a=ue(t),l=N[a]||(N[a]=(d=>{let m=0,u=11;for(;m<d.length;)u=101*u+d.charCodeAt(m++)>>>0;return"go"+u})(a));if(!N[l]){let d=a!==t?t:(m=>{let u,g,b=[{}];for(;u=ze.exec(m.replace(Ie,""));)u[4]?b.shift():u[3]?(g=u[3].replace(se," ").trim(),b.unshift(b[0][g]=b[0][g]||{})):b[0][u[1]]=u[2].replace(se," ").trim();return b[0]})(t);N[l]=C(o?{["@keyframes "+l]:d}:d,s?"":"."+l)}let n=s&&N.g?N.g:null;return s&&(N.g=N[l]),((d,m,u,g)=>{g?m.data=m.data.replace(g,d):m.data.indexOf(d)===-1&&(m.data=u?d+m.data:m.data+d)})(N[l],r,i,n),l},Me=(t,r,s)=>t.reduce((i,o,a)=>{let l=r[a];if(l&&l.call){let n=l(s),d=n&&n.props&&n.props.className||/^go/.test(n)&&n;l=d?"."+d:n&&typeof n=="object"?n.props?"":C(n,""):n===!1?"":n}return i+o+(l??"")},"");function V(t){let r=this||{},s=t.call?t(r.p):t;return De(s.unshift?s.raw?Me(s,[].slice.call(arguments,1),r.p):s.reduce((i,o)=>Object.assign(i,o&&o.call?o(r.p):o),{}):s,$e(r.target),r.g,r.o,r.k)}let xe,J,X;V.bind({g:1});let _=V.bind({k:1});function Ve(t,r,s,i){C.p=r,xe=t,J=s,X=i}function k(t,r){let s=this||{};return function(){let i=arguments;function o(a,l){let n=Object.assign({},a),d=n.className||o.className;s.p=Object.assign({theme:J&&J()},n),s.o=/ *go\d+/.test(d),n.className=V.apply(s,i)+(d?" "+d:""),r&&(n.ref=l);let m=t;return t[0]&&(m=n.as||t,delete n.as),X&&m[0]&&X(n),xe(m,n)}return r?r(o):o}}var Te=t=>typeof t=="function",D=(t,r)=>Te(t)?t(r):t,Be=(()=>{let t=0;return()=>(++t).toString()})(),fe=(()=>{let t;return()=>{if(t===void 0&&typeof window<"u"){let r=matchMedia("(prefers-reduced-motion: reduce)");t=!r||r.matches}return t}})(),Ze=20,pe=(t,r)=>{switch(r.type){case 0:return{...t,toasts:[r.toast,...t.toasts].slice(0,Ze)};case 1:return{...t,toasts:t.toasts.map(a=>a.id===r.toast.id?{...a,...r.toast}:a)};case 2:let{toast:s}=r;return pe(t,{type:t.toasts.find(a=>a.id===s.id)?1:0,toast:s});case 3:let{toastId:i}=r;return{...t,toasts:t.toasts.map(a=>a.id===i||i===void 0?{...a,dismissed:!0,visible:!1}:a)};case 4:return r.toastId===void 0?{...t,toasts:[]}:{...t,toasts:t.toasts.filter(a=>a.id!==r.toastId)};case 5:return{...t,pausedAt:r.time};case 6:let o=r.time-(t.pausedAt||0);return{...t,pausedAt:void 0,toasts:t.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+o}))}}},I=[],P={toasts:[],pausedAt:void 0},L=t=>{P=pe(P,t),I.forEach(r=>{r(P)})},Ue={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},We=(t={})=>{let[r,s]=c.useState(P),i=c.useRef(P);c.useEffect(()=>(i.current!==P&&s(P),I.push(s),()=>{let a=I.indexOf(s);a>-1&&I.splice(a,1)}),[]);let o=r.toasts.map(a=>{var l,n,d;return{...t,...t[a.type],...a,removeDelay:a.removeDelay||((l=t[a.type])==null?void 0:l.removeDelay)||(t==null?void 0:t.removeDelay),duration:a.duration||((n=t[a.type])==null?void 0:n.duration)||(t==null?void 0:t.duration)||Ue[a.type],style:{...t.style,...(d=t[a.type])==null?void 0:d.style,...a.style}}});return{...r,toasts:o}},He=(t,r="blank",s)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:r,ariaProps:{role:"status","aria-live":"polite"},message:t,pauseDuration:0,...s,id:(s==null?void 0:s.id)||Be()}),O=t=>(r,s)=>{let i=He(r,t,s);return L({type:2,toast:i}),i.id},f=(t,r)=>O("blank")(t,r);f.error=O("error");f.success=O("success");f.loading=O("loading");f.custom=O("custom");f.dismiss=t=>{L({type:3,toastId:t})};f.remove=t=>L({type:4,toastId:t});f.promise=(t,r,s)=>{let i=f.loading(r.loading,{...s,...s==null?void 0:s.loading});return typeof t=="function"&&(t=t()),t.then(o=>{let a=r.success?D(r.success,o):void 0;return a?f.success(a,{id:i,...s,...s==null?void 0:s.success}):f.dismiss(i),o}).catch(o=>{let a=r.error?D(r.error,o):void 0;a?f.error(a,{id:i,...s,...s==null?void 0:s.error}):f.dismiss(i)}),t};var qe=(t,r)=>{L({type:1,toast:{id:t,height:r}})},Je=()=>{L({type:5,time:Date.now()})},R=new Map,Xe=1e3,Ye=(t,r=Xe)=>{if(R.has(t))return;let s=setTimeout(()=>{R.delete(t),L({type:4,toastId:t})},r);R.set(t,s)},Ge=t=>{let{toasts:r,pausedAt:s}=We(t);c.useEffect(()=>{if(s)return;let a=Date.now(),l=r.map(n=>{if(n.duration===1/0)return;let d=(n.duration||0)+n.pauseDuration-(a-n.createdAt);if(d<0){n.visible&&f.dismiss(n.id);return}return setTimeout(()=>f.dismiss(n.id),d)});return()=>{l.forEach(n=>n&&clearTimeout(n))}},[r,s]);let i=c.useCallback(()=>{s&&L({type:6,time:Date.now()})},[s]),o=c.useCallback((a,l)=>{let{reverseOrder:n=!1,gutter:d=8,defaultPosition:m}=l||{},u=r.filter(v=>(v.position||m)===(a.position||m)&&v.height),g=u.findIndex(v=>v.id===a.id),b=u.filter((v,S)=>S<g&&v.visible).length;return u.filter(v=>v.visible).slice(...n?[b+1]:[0,b]).reduce((v,S)=>v+(S.height||0)+d,0)},[r]);return c.useEffect(()=>{r.forEach(a=>{if(a.dismissed)Ye(a.id,a.removeDelay);else{let l=R.get(a.id);l&&(clearTimeout(l),R.delete(a.id))}})},[r]),{toasts:r,handlers:{updateHeight:qe,startPause:Je,endPause:i,calculateOffset:o}}},Qe=_`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Ke=_`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,et=_`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,tt=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Qe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ke} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${t=>t.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${et} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,rt=_`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,st=k("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${t=>t.secondary||"#e0e0e0"};
  border-right-color: ${t=>t.primary||"#616161"};
  animation: ${rt} 1s linear infinite;
`,at=_`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,it=_`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ot=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${at} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${it} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${t=>t.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,nt=k("div")`
  position: absolute;
`,lt=k("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ct=_`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,dt=k("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ct} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,mt=({toast:t})=>{let{icon:r,type:s,iconTheme:i}=t;return r!==void 0?typeof r=="string"?c.createElement(dt,null,r):r:s==="blank"?null:c.createElement(lt,null,c.createElement(st,{...i}),s!=="loading"&&c.createElement(nt,null,s==="error"?c.createElement(tt,{...i}):c.createElement(ot,{...i})))},ut=t=>`
0% {transform: translate3d(0,${t*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,xt=t=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${t*-150}%,-1px) scale(.6); opacity:0;}
`,ft="0%{opacity:0;} 100%{opacity:1;}",pt="0%{opacity:1;} 100%{opacity:0;}",ht=k("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,gt=k("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,yt=(t,r)=>{let s=t.includes("top")?1:-1,[i,o]=fe()?[ft,pt]:[ut(s),xt(s)];return{animation:r?`${_(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${_(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},bt=c.memo(({toast:t,position:r,style:s,children:i})=>{let o=t.height?yt(t.position||r||"top-center",t.visible):{opacity:0},a=c.createElement(mt,{toast:t}),l=c.createElement(gt,{...t.ariaProps},D(t.message,t));return c.createElement(ht,{className:t.className,style:{...o,...s,...t.style}},typeof i=="function"?i({icon:a,message:l}):c.createElement(c.Fragment,null,a,l))});Ve(c.createElement);var jt=({id:t,className:r,style:s,onHeightUpdate:i,children:o})=>{let a=c.useCallback(l=>{if(l){let n=()=>{let d=l.getBoundingClientRect().height;i(t,d)};n(),new MutationObserver(n).observe(l,{subtree:!0,childList:!0,characterData:!0})}},[t,i]);return c.createElement("div",{ref:a,className:r,style:s},o)},vt=(t,r)=>{let s=t.includes("top"),i=s?{top:0}:{bottom:0},o=t.includes("center")?{justifyContent:"center"}:t.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:fe()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${r*(s?1:-1)}px)`,...i,...o}},wt=V`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,z=16,Nt=({reverseOrder:t,position:r="top-center",toastOptions:s,gutter:i,children:o,containerStyle:a,containerClassName:l})=>{let{toasts:n,handlers:d}=Ge(s);return c.createElement("div",{id:"_rht_toaster",style:{position:"fixed",zIndex:9999,top:z,left:z,right:z,bottom:z,pointerEvents:"none",...a},className:l,onMouseEnter:d.startPause,onMouseLeave:d.endPause},n.map(m=>{let u=m.position||r,g=d.calculateOffset(m,{reverseOrder:t,gutter:i,defaultPosition:r}),b=vt(u,g);return c.createElement(jt,{id:m.id,key:m.id,onHeightUpdate:d.updateHeight,className:m.visible?wt:"",style:b},m.type==="custom"?D(m.message,m):o?o(m):c.createElement(bt,{toast:m,position:u}))}))},Pr=f;const _t="https://peopleudnxrqkhusiatw.supabase.co",Ct="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3BsZXVkbnhycWtodXNpYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTE3MTAsImV4cCI6MjA3MDIyNzcxMH0.k2phVQx0c4NHwu1VL96rTzp_w4YPg6jZvHf2-c9Duf0",A=Ce(_t,Ct,{auth:{autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!1}}),he=c.createContext(void 0);function kt({children:t}){var G;const[r,s]=c.useState(null),[i,o]=c.useState([]),[a,l]=c.useState(!0),n=c.useRef(null),d=async(h=!1)=>{var E;try{h&&l(!0);const{data:{user:F}}=await A.auth.getUser();if(!F){s(null),n.current=null,o([]);return}const{data:w,error:$}=await A.from("user_profiles").select(`
          *,
          profile:profiles (
            id,
            name,
            description,
            is_admin,
            is_active
          )
        `).eq("user_id",F.id).single();if($){console.error("Erro ao carregar profile:",$),s(null),n.current=null,o([]);return}if(!(w!=null&&w.is_active)||!((E=w==null?void 0:w.profile)!=null&&E.is_active)){console.warn("Usuário ou profile inativo"),s(null),n.current=null,o([]);return}const Q=w;s(Q),n.current=Q;const{data:je,error:K}=await A.from("permissions").select("resource, can_read, can_create, can_update, can_delete").eq("profile_id",w.profile_id);if(K){console.error("Erro ao carregar permissões:",K),o([]);return}o(je||[])}catch(F){console.error("Erro ao carregar permissões:",F),s(null),n.current=null,o([])}finally{h&&l(!1)}};c.useEffect(()=>{d(!0);const{data:{subscription:h}}=A.auth.onAuthStateChange(E=>{if(E==="SIGNED_IN"){if(n.current)return;d(!0)}else E==="SIGNED_OUT"&&(s(null),n.current=null,o([]))});return()=>{h.unsubscribe()}},[]);const m=((G=r==null?void 0:r.profile)==null?void 0:G.is_admin)??!1,u=(h,E)=>{if(m)return!0;const F=i.find($=>$.resource===h);if(!F)return!1;const w=`can_${E}`;return F[w]===!0},be={userProfile:r,permissions:i,loading:a,isAdmin:m,hasPermission:u,canRead:h=>u(h,"read"),canCreate:h=>u(h,"create"),canUpdate:h=>u(h,"update"),canDelete:h=>u(h,"delete"),refreshPermissions:()=>d(!0)};return e.jsx(he.Provider,{value:be,children:t})}function T(){const t=c.useContext(he);if(t===void 0)throw new Error("usePermissions must be used within a PermissionsProvider");return t}const ae="fefelina_showValues",ge=c.createContext(void 0);function Et({children:t}){const[r,s]=c.useState(()=>{const a=localStorage.getItem(ae);return a!==null?a==="true":!0});c.useEffect(()=>{localStorage.setItem(ae,r.toString())},[r]);const i=()=>s(a=>!a),o=a=>r?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(a):"R$ ••••••";return e.jsx(ge.Provider,{value:{showValues:r,toggleShowValues:i,formatCurrency:o},children:t})}function Ft(){const t=c.useContext(ge);if(!t)throw new Error("useValuesVisibility deve ser usado dentro de um ValuesVisibilityProvider");return t}/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Lt=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(r,s,i)=>i?i.toUpperCase():s.toLowerCase()),ie=t=>{const r=Lt(t);return r.charAt(0).toUpperCase()+r.slice(1)},ye=(...t)=>t.filter((r,s,i)=>!!r&&r.trim()!==""&&i.indexOf(r)===s).join(" ").trim(),At=t=>{for(const r in t)if(r.startsWith("aria-")||r==="role"||r==="title")return!0};/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Rt={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=c.forwardRef(({color:t="currentColor",size:r=24,strokeWidth:s=2,absoluteStrokeWidth:i,className:o="",children:a,iconNode:l,...n},d)=>c.createElement("svg",{ref:d,...Rt,width:r,height:r,stroke:t,strokeWidth:i?Number(s)*24/Number(r):s,className:ye("lucide",o),...!a&&!At(n)&&{"aria-hidden":"true"},...n},[...l.map(([m,u])=>c.createElement(m,u)),...Array.isArray(a)?a:[a]]));/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=(t,r)=>{const s=c.forwardRef(({className:i,...o},a)=>c.createElement(Ot,{ref:a,iconNode:r,className:ye(`lucide-${Pt(ie(t))}`,`lucide-${t}`,i),...o}));return s.displayName=ie(t),s};/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],$t=j("chevron-down",St);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],It=j("circle-alert",zt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],Z=j("eye-off",Dt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],U=j("eye",Mt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],oe=j("lock",Vt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],Bt=j("log-out",Tt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=[["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 18h16",key:"19g7jn"}],["path",{d:"M4 6h16",key:"1o0s65"}]],Ut=j("menu",Zt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Ht=j("settings",Wt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],ne=j("shield",qt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],Xt=j("triangle-alert",Jt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],Gt=j("user",Yt);/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],Kt=j("x",Qt),W=[{id:"cat-orange",emoji:"🐱",label:"Gato Laranja",bgColor:"bg-primary-100"},{id:"cat-black",emoji:"🐈",label:"Gato Preto",bgColor:"bg-gray-100"},{id:"cat-white",emoji:"🐈‍⬛",label:"Gato Branco",bgColor:"bg-slate-100"},{id:"dog",emoji:"🐕",label:"Cachorro",bgColor:"bg-amber-100"},{id:"dog-service",emoji:"🐕‍🦺",label:"Cachorro de Serviço",bgColor:"bg-yellow-100"},{id:"paw",emoji:"🐾",label:"Patinha",bgColor:"bg-pink-100"},{id:"heart",emoji:"❤️",label:"Coração",bgColor:"bg-red-100"},{id:"star",emoji:"⭐",label:"Estrela",bgColor:"bg-yellow-100"},{id:"sparkles",emoji:"✨",label:"Brilhos",bgColor:"bg-purple-100"},{id:"flower",emoji:"🌸",label:"Flor",bgColor:"bg-pink-100"},{id:"rainbow",emoji:"🌈",label:"Arco-íris",bgColor:"bg-indigo-100"},{id:"sun",emoji:"☀️",label:"Sol",bgColor:"bg-yellow-100"},{id:"moon",emoji:"🌙",label:"Lua",bgColor:"bg-blue-100"},{id:"fire",emoji:"🔥",label:"Fogo",bgColor:"bg-primary-100"},{id:"tree",emoji:"🌳",label:"Árvore",bgColor:"bg-green-100"},{id:"butterfly",emoji:"🦋",label:"Borboleta",bgColor:"bg-purple-100"},{id:"bee",emoji:"🐝",label:"Abelha",bgColor:"bg-yellow-100"},{id:"fish",emoji:"🐠",label:"Peixe",bgColor:"bg-blue-100"},{id:"bird",emoji:"🐦",label:"Pássaro",bgColor:"bg-sky-100"},{id:"rabbit",emoji:"🐰",label:"Coelho",bgColor:"bg-gray-100"},{id:"turtle",emoji:"🐢",label:"Tartaruga",bgColor:"bg-green-100"},{id:"hamster",emoji:"🐹",label:"Hamster",bgColor:"bg-amber-100"},{id:"crown",emoji:"👑",label:"Coroa",bgColor:"bg-yellow-100"},{id:"gift",emoji:"🎁",label:"Presente",bgColor:"bg-red-100"}],er=t=>t&&W.find(r=>r.id===t)||W[0],tr={"2xs":"w-4 h-4 text-[10px]",xs:"w-6 h-6 text-xs",sm:"w-8 h-8 text-sm",md:"w-10 h-10 text-base",lg:"w-12 h-12 text-lg",xl:"w-16 h-16 text-2xl"};function rr({avatarId:t,name:r,size:s="md",className:i=""}){const o=er(t);return e.jsx("div",{className:`${tr[s]} ${o.bgColor} rounded-full flex items-center justify-center font-medium text-gray-700 ${i}`,title:r,children:e.jsx("span",{className:"select-none",children:o.emoji})})}function H({inSidebar:t=!1}){const[r,s]=c.useState(!1),[i,o]=c.useState(!1),a=c.useRef(null),l=le(),{userProfile:n,isAdmin:d}=T();c.useEffect(()=>{function u(g){a.current&&!a.current.contains(g.target)&&s(!1)}return r&&document.addEventListener("mousedown",u),()=>{document.removeEventListener("mousedown",u)}},[r]);const m=async()=>{try{o(!0),await A.auth.signOut(),l("/login")}catch(u){console.error("Erro ao fazer logout:",u),alert("Erro ao fazer logout. Tente novamente.")}finally{o(!1)}};return n?e.jsxs("div",{className:"relative",ref:a,children:[e.jsxs("button",{onClick:()=>s(!r),className:"flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-150",children:[e.jsx(rr,{avatarId:n.avatar_url,name:n.full_name,size:"md",className:"shadow-sm"}),e.jsxs("div",{className:"hidden md:block text-left",children:[e.jsx("p",{className:"text-sm font-medium text-gray-900",children:n.full_name}),e.jsxs("p",{className:"text-xs text-gray-500 flex items-center",children:[d&&e.jsx(ne,{className:"w-3 h-3 mr-1 text-primary-600"}),n.profile.name]})]}),e.jsx($t,{className:`w-4 h-4 text-gray-500 transition-transform duration-200 ${r?"rotate-180":""}`})]}),r&&e.jsxs("div",{className:`absolute ${t?"left-0":"right-0"} w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${t?"bottom-full mb-2":"top-full mt-2"}`,children:[e.jsxs("div",{className:"px-4 py-3 border-b border-gray-100",children:[e.jsx("p",{className:"text-sm font-semibold text-gray-900",children:n.full_name}),e.jsx("p",{className:"text-xs text-gray-500 mt-0.5",children:n.email}),e.jsxs("div",{className:"mt-2 inline-flex items-center px-2 py-1 rounded-md bg-primary-50 text-xs font-medium text-primary-700",children:[d&&e.jsx(ne,{className:"w-3 h-3 mr-1"}),n.profile.name]})]}),e.jsxs("div",{className:"py-2",children:[e.jsxs("button",{onClick:()=>{s(!1),l("/profile")},className:"w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center",children:[e.jsx(Gt,{className:"w-4 h-4 mr-3 text-gray-500"}),"Meu Perfil"]}),d&&e.jsxs("button",{onClick:()=>{s(!1),l("/setup")},className:"w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center",children:[e.jsx(Ht,{className:"w-4 h-4 mr-3 text-gray-500"}),"Configurações"]})]}),e.jsx("div",{className:"border-t border-gray-100 pt-2",children:e.jsxs("button",{onClick:m,disabled:i,className:"w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50",children:[e.jsx(Bt,{className:"w-4 h-4 mr-3"}),i?"Saindo...":"Sair"]})})]})]}):null}const sr=[{name:"Dashboard",href:"/dashboard",resource:"dashboard"},{name:"Leads",href:"/leads",resource:"leads"},{name:"Clientes",href:"/clients",resource:"clients"},{name:"Pets",href:"/pets",resource:"pets"},{name:"Serviços",href:"/services",resource:"services"},{name:"Visitas",href:"/visits",resource:"visits"},{name:"Agenda",href:"/agenda",resource:"agenda"},{name:"Finanças",href:"/finances",resource:"financeiro"},{name:"Relatórios",href:"/reports",resource:"relatorios"},{name:"Caixa",href:"/financial",resource:"financeiro"}];function ar({children:t}){const r=ce(),[s,i]=c.useState(!1),{canRead:o,isAdmin:a}=T(),{showValues:l,toggleShowValues:n}=Ft(),d=c.useMemo(()=>sr.filter(m=>a?!0:m.resource&&o(m.resource)),[o,a]);return e.jsxs("div",{className:"h-screen flex overflow-hidden bg-gray-100",children:[s&&e.jsxs("div",{className:"fixed inset-0 flex z-50 md:z-50",children:[e.jsx("div",{className:"fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity",onClick:()=>i(!1)}),e.jsxs("div",{className:"relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl transform transition-transform",children:[e.jsx("div",{className:"absolute top-0 right-0 -mr-12 pt-2",children:e.jsx("button",{className:"ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-white bg-opacity-20 hover:bg-opacity-30 transition-all",onClick:()=>i(!1),children:e.jsx(Kt,{className:"h-6 w-6 text-white"})})}),e.jsxs("div",{className:"flex-1 h-0 pt-5 pb-4 overflow-y-auto",children:[e.jsxs("div",{className:"flex-shrink-0 flex items-center px-4 mb-6",children:[e.jsx("img",{src:"/fefelina-admin/fefelina-logo.png",alt:"Fefelina Logo",className:"w-8 h-8 mr-2 rounded-lg shadow-sm"}),e.jsx("h1",{className:"text-base font-bold text-secondary-700",children:"Fefelina Admin"})]}),e.jsx("nav",{className:"mt-5 px-2 space-y-1",children:d.map(m=>{const u=r.pathname===m.href;return e.jsx(ee,{to:m.href,onClick:()=>i(!1),className:`${u?"bg-primary-100 text-primary-800 border-l-4 border-primary-500":"text-secondary-700 hover:bg-primary-50 hover:text-primary-700"} group flex items-center px-2 py-3 text-base font-medium rounded-md transition-colors duration-200`,children:m.name},m.name)})})]}),e.jsxs("div",{className:"flex-shrink-0 flex items-center justify-between border-t border-gray-200 p-4",children:[e.jsx(H,{inSidebar:!0}),e.jsx("button",{onClick:n,className:"p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors",title:l?"Ocultar valores":"Mostrar valores",children:l?e.jsx(U,{className:"h-5 w-5"}):e.jsx(Z,{className:"h-5 w-5"})})]})]})]}),e.jsx("div",{className:"hidden xl:flex xl:flex-shrink-0",children:e.jsx("div",{className:"flex flex-col w-64",children:e.jsxs("div",{className:"flex flex-col h-0 flex-1 border-r border-gray-200 bg-white",children:[e.jsxs("div",{className:"flex-1 flex flex-col pt-5 pb-4 overflow-y-auto",children:[e.jsxs("div",{className:"flex items-center flex-shrink-0 px-4 mb-2",children:[e.jsx("img",{src:"/fefelina-admin/fefelina-logo.png",alt:"Fefelina Logo",className:"w-10 h-10 mr-3 rounded-lg shadow-sm"}),e.jsx("h1",{className:"text-lg font-bold text-secondary-700",children:"Fefelina Admin"})]}),e.jsx("nav",{className:"mt-5 flex-1 px-2 bg-white space-y-1",children:d.map(m=>{const u=r.pathname===m.href;return e.jsx(ee,{to:m.href,className:`${u?"bg-primary-100 text-primary-800 border-l-4 border-primary-500":"text-secondary-700 hover:bg-primary-50 hover:text-primary-700"} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`,children:m.name},m.name)})})]}),e.jsxs("div",{className:"flex-shrink-0 flex items-center justify-between border-t border-gray-200 p-4",children:[e.jsx(H,{inSidebar:!0}),e.jsx("button",{onClick:n,className:"p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors",title:l?"Ocultar valores":"Mostrar valores",children:l?e.jsx(U,{className:"h-5 w-5"}):e.jsx(Z,{className:"h-5 w-5"})})]})]})})}),e.jsxs("div",{className:"flex flex-col w-0 flex-1 overflow-hidden",children:[e.jsx("div",{className:"xl:hidden",children:e.jsxs("div",{className:"relative z-10 flex-shrink-0 flex h-16 bg-white shadow",children:[e.jsx("button",{className:"px-4 border-r border-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 xl:hidden",onClick:()=>i(!0),children:e.jsx(Ut,{className:"h-6 w-6"})}),e.jsxs("div",{className:"flex-1 px-4 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center",children:[e.jsx("img",{src:"/fefelina-admin/fefelina-logo.png",alt:"Fefelina Logo",className:"w-8 h-8 mr-2 rounded-lg shadow-sm"}),e.jsx("h1",{className:"text-base font-bold text-secondary-700",children:"Fefelina Admin"})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:n,className:"p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors",title:l?"Ocultar valores":"Mostrar valores",children:l?e.jsx(U,{className:"h-5 w-5"}):e.jsx(Z,{className:"h-5 w-5"})}),e.jsx(H,{})]})]})]})}),e.jsx("main",{className:"flex-1 relative z-0 overflow-y-auto focus:outline-none",children:e.jsx("div",{className:"py-4 md:py-6",children:e.jsx("div",{className:"max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8",children:t})})})]})]})}function Y({size:t="md",variant:r="walking",text:s="Carregando..."}){const i={sm:"w-12 h-12",md:"w-20 h-20",lg:"w-32 h-32"};return r==="walking"?e.jsxs("div",{className:"flex flex-col items-center justify-center gap-4",children:[e.jsx("div",{className:`${i[t]} relative`,children:e.jsx("div",{className:"absolute inset-0 animate-cat-walk",children:e.jsxs("svg",{viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("circle",{cx:"50",cy:"35",r:"15",fill:"#FF8C42"}),e.jsx("path",{d:"M 40 25 L 35 15 L 45 20 Z",fill:"#FF8C42"}),e.jsx("path",{d:"M 60 25 L 65 15 L 55 20 Z",fill:"#FF8C42"}),e.jsx("path",{d:"M 40 24 L 37 18 L 43 21 Z",fill:"#FFB380"}),e.jsx("path",{d:"M 60 24 L 63 18 L 57 21 Z",fill:"#FFB380"}),e.jsx("circle",{cx:"45",cy:"35",r:"2",fill:"#000",className:"animate-blink"}),e.jsx("circle",{cx:"55",cy:"35",r:"2",fill:"#000",className:"animate-blink"}),e.jsx("circle",{cx:"50",cy:"40",r:"1.5",fill:"#FF6B9D"}),e.jsx("line",{x1:"35",y1:"40",x2:"28",y2:"39",stroke:"#000",strokeWidth:"0.5"}),e.jsx("line",{x1:"35",y1:"42",x2:"28",y2:"43",stroke:"#000",strokeWidth:"0.5"}),e.jsx("line",{x1:"65",y1:"40",x2:"72",y2:"39",stroke:"#000",strokeWidth:"0.5"}),e.jsx("line",{x1:"65",y1:"42",x2:"72",y2:"43",stroke:"#000",strokeWidth:"0.5"}),e.jsx("ellipse",{cx:"50",cy:"60",rx:"18",ry:"22",fill:"#FF8C42"}),e.jsx("ellipse",{cx:"50",cy:"62",rx:"12",ry:"15",fill:"#FFB380"}),e.jsx("path",{d:"M 68 55 Q 80 50 85 60",stroke:"#FF8C42",strokeWidth:"6",fill:"none",strokeLinecap:"round",className:"animate-tail-wag"}),e.jsx("rect",{x:"40",y:"75",width:"4",height:"12",rx:"2",fill:"#FF8C42",className:"animate-leg-left"}),e.jsx("rect",{x:"56",y:"75",width:"4",height:"12",rx:"2",fill:"#FF8C42",className:"animate-leg-right"}),e.jsx("circle",{cx:"42",cy:"87",r:"2.5",fill:"#FFB380",className:"animate-leg-left"}),e.jsx("circle",{cx:"58",cy:"87",r:"2.5",fill:"#FFB380",className:"animate-leg-right"})]})})}),s&&e.jsx("p",{className:"text-sm text-gray-600 animate-pulse",children:s})]}):r==="paws"?e.jsxs("div",{className:"flex flex-col items-center justify-center gap-4",children:[e.jsx("div",{className:"flex gap-2",children:[0,1,2,3].map(o=>e.jsx("div",{className:"animate-paw-bounce",style:{animationDelay:`${o*.15}s`},children:e.jsxs("svg",{width:"30",height:"30",viewBox:"0 0 30 30",fill:"none",children:[e.jsx("ellipse",{cx:"15",cy:"18",rx:"8",ry:"7",fill:"#FF8C42"}),e.jsx("circle",{cx:"10",cy:"10",r:"3",fill:"#FF8C42"}),e.jsx("circle",{cx:"15",cy:"8",r:"3",fill:"#FF8C42"}),e.jsx("circle",{cx:"20",cy:"10",r:"3",fill:"#FF8C42"}),e.jsx("ellipse",{cx:"15",cy:"18",rx:"5",ry:"4",fill:"#FFB380"})]})},o))}),s&&e.jsx("p",{className:"text-sm text-gray-600",children:s})]}):r==="sleeping"?e.jsxs("div",{className:"flex flex-col items-center justify-center gap-4",children:[e.jsx("div",{className:`${i[t]} relative`,children:e.jsxs("svg",{viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("circle",{cx:"50",cy:"55",r:"25",fill:"#FF8C42",className:"animate-breathing"}),e.jsx("circle",{cx:"50",cy:"55",r:"18",fill:"#FFB380",className:"animate-breathing"}),e.jsx("circle",{cx:"40",cy:"40",r:"12",fill:"#FF8C42",className:"animate-breathing"}),e.jsx("path",{d:"M 35 30 L 30 22 L 38 28 Z",fill:"#FF8C42"}),e.jsx("path",{d:"M 45 30 L 50 22 L 42 28 Z",fill:"#FF8C42"}),e.jsx("path",{d:"M 35 29 L 32 24 L 37 28 Z",fill:"#FFB380"}),e.jsx("path",{d:"M 45 29 L 48 24 L 43 28 Z",fill:"#FFB380"}),e.jsx("path",{d:"M 35 40 Q 37 42 39 40",stroke:"#000",strokeWidth:"1.5",fill:"none",strokeLinecap:"round"}),e.jsx("path",{d:"M 41 40 Q 43 42 45 40",stroke:"#000",strokeWidth:"1.5",fill:"none",strokeLinecap:"round"}),e.jsx("circle",{cx:"40",cy:"44",r:"1",fill:"#FF6B9D"}),e.jsx("text",{x:"65",y:"25",className:"animate-zzz",fill:"#999",fontSize:"8",fontWeight:"bold",children:"Z"}),e.jsx("text",{x:"70",y:"20",className:"animate-zzz",fill:"#999",fontSize:"10",fontWeight:"bold",style:{animationDelay:"0.3s"},children:"Z"}),e.jsx("text",{x:"76",y:"15",className:"animate-zzz",fill:"#999",fontSize:"12",fontWeight:"bold",style:{animationDelay:"0.6s"},children:"Z"}),e.jsx("path",{d:"M 70 65 Q 80 70 75 80",stroke:"#FF8C42",strokeWidth:"8",fill:"none",strokeLinecap:"round"})]})}),s&&e.jsx("p",{className:"text-sm text-gray-600",children:s})]}):null}function y({children:t,resource:r,action:s="read",requireAdmin:i=!1}){const o=ce(),{loading:a,isAdmin:l,hasPermission:n,userProfile:d}=T();if(a)return e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50",children:e.jsx(Y,{size:"lg",variant:"sleeping",text:"Verificando suas credenciais..."})});if(!d)return e.jsx(ke,{to:"/login",state:{from:o},replace:!0});if(r){if(i&&!l)return e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-gray-50 px-4",children:e.jsxs("div",{className:"max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center",children:[e.jsx("div",{className:"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4",children:e.jsx(oe,{className:"w-8 h-8 text-red-600"})}),e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-2",children:"Acesso Restrito"}),e.jsx("p",{className:"text-gray-600 mb-6",children:"Esta área é exclusiva para administradores do sistema."}),e.jsx("div",{className:"bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6",children:e.jsxs("div",{className:"flex items-start",children:[e.jsx(It,{className:"w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"}),e.jsxs("div",{className:"text-left",children:[e.jsxs("p",{className:"text-sm text-yellow-800 font-medium",children:["Seu perfil: ",(d==null?void 0:d.profile.name)||"Sem perfil"]}),e.jsx("p",{className:"text-sm text-yellow-700 mt-1",children:"Para acessar esta área, entre em contato com um administrador."})]})]})}),e.jsx("button",{onClick:()=>window.history.back(),className:"w-full btn-fefelina",children:"Voltar"})]})});if(!n(r,s))return e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-gray-50 px-4",children:e.jsxs("div",{className:"max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center",children:[e.jsx("div",{className:"w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4",children:e.jsx(oe,{className:"w-8 h-8 text-primary-600"})}),e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-2",children:"Sem Permissão"}),e.jsx("p",{className:"text-gray-600 mb-6",children:"Você não tem permissão para acessar esta funcionalidade."}),e.jsxs("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left",children:[e.jsx("p",{className:"text-sm text-blue-900 font-medium mb-2",children:"Informações do seu perfil:"}),e.jsxs("ul",{className:"text-sm text-blue-800 space-y-1",children:[e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Nome:"})," ",(d==null?void 0:d.full_name)||"N/A"]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Perfil:"})," ",(d==null?void 0:d.profile.name)||"Sem perfil"]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Recurso:"})," ",r]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Ação necessária:"})," ",s==="read"?"visualizar":s==="create"?"criar":s==="update"?"editar":"excluir"]})]})]}),e.jsx("p",{className:"text-sm text-gray-600 mb-6",children:"Entre em contato com um administrador para solicitar acesso."}),e.jsx("button",{onClick:()=>window.history.back(),className:"w-full btn-fefelina",children:"Voltar"})]})})}return e.jsx(e.Fragment,{children:t})}function ir(){const t=le(),{userProfile:r,canRead:s,loading:i}=T();return c.useEffect(()=>{if(i||!r)return;const a=[{path:"/dashboard",resource:"dashboard"},{path:"/clients",resource:"clients"},{path:"/leads",resource:"leads"},{path:"/agenda",resource:"agenda"},{path:"/services",resource:"services"},{path:"/visits",resource:"visits"},{path:"/pets",resource:"pets"},{path:"/finances",resource:"financeiro"},{path:"/reports",resource:"relatorios"},{path:"/setup",resource:"setup"}].find(l=>s(l.resource));a?t(a.path,{replace:!0}):t("/my-profile",{replace:!0})},[r,s,i,t]),e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-gray-100",children:e.jsxs("div",{className:"text-center",children:[e.jsx(Y,{}),e.jsx("p",{className:"mt-4 text-gray-600",children:"Carregando..."})]})})}class or extends c.Component{constructor(){super(...arguments);B(this,"state",{hasError:!1});B(this,"handleReload",()=>{this.setState({hasError:!1}),window.location.reload()})}static getDerivedStateFromError(){return{hasError:!0}}componentDidCatch(s,i){console.error("Erro não tratado capturado pelo ErrorBoundary:",s,i)}render(){return this.state.hasError?e.jsx("div",{className:"min-h-screen flex items-center justify-center bg-gray-50 p-4",children:e.jsxs("div",{className:"card-fefelina max-w-md w-full text-center",children:[e.jsx("div",{className:"mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4",children:e.jsx(Xt,{className:"w-6 h-6 text-red-600"})}),e.jsx("h1",{className:"text-lg font-semibold text-gray-900",children:"Ops, algo deu errado"}),e.jsx("p",{className:"mt-2 text-sm text-gray-600",children:"Ocorreu um erro inesperado ao carregar esta página. Você pode tentar recarregar."}),e.jsx("button",{onClick:this.handleReload,className:"btn-fefelina mt-6",children:"Recarregar página"})]})}):this.props.children}}const nr=c.lazy(()=>p(()=>import("./LoginPage-fb224ede.js"),["assets/LoginPage-fb224ede.js","assets/recharts-c8f055a0.js","assets/react-vendor-4d4caec1.js","assets/supabase-6a05ac42.js"])),lr=c.lazy(()=>p(()=>import("./DashboardEnhanced-d747e0d3.js"),["assets/DashboardEnhanced-d747e0d3.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/index-294c011b.js","assets/index-d96bb25f.js","assets/index-bc8bb77f.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),cr=c.lazy(()=>p(()=>import("./ClientsPage-615c4ef6.js"),["assets/ClientsPage-615c4ef6.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/useDebouncedValue-721aecc7.js","assets/PaginationControls-721b7c2f.js","assets/chevron-right-1a8868c5.js","assets/useFieldMask-a15ea7be.js","assets/ConfirmDialog-069c8468.js","assets/MarkdownContent-62f25488.js","assets/react-vendor-4d4caec1.js","assets/pencil-a5a8ce82.js","assets/supabase-6a05ac42.js"])),dr=c.lazy(()=>p(()=>import("./ClientProfilePage-8433df57.js"),["assets/ClientProfilePage-8433df57.js","assets/recharts-c8f055a0.js","assets/check-4c623b42.js","assets/users-a80df03b.js","assets/plus-53dc3801.js","assets/MarkdownContent-62f25488.js","assets/useFieldMask-a15ea7be.js","assets/react-vendor-4d4caec1.js","assets/index-294c011b.js","assets/index-bc8bb77f.js","assets/index-e955fbf2.js","assets/supabase-6a05ac42.js"])),mr=c.lazy(()=>p(()=>import("./PetsPage-f1eb8d34.js"),["assets/PetsPage-f1eb8d34.js","assets/recharts-c8f055a0.js","assets/ClientCombobox-8ea0f879.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),ur=c.lazy(()=>p(()=>import("./ServicesPage-33f33b6a.js"),["assets/ServicesPage-33f33b6a.js","assets/recharts-c8f055a0.js","assets/ClientCombobox-8ea0f879.js","assets/PaginationControls-721b7c2f.js","assets/chevron-right-1a8868c5.js","assets/useFieldMask-a15ea7be.js","assets/useDebouncedValue-721aecc7.js","assets/ellipsis-vertical-b0a76517.js","assets/pencil-a5a8ce82.js","assets/circle-check-c97870a6.js","assets/copy-c20d77cb.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),xr=c.lazy(()=>p(()=>import("./VisitsPage-43438961.js"),["assets/VisitsPage-43438961.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/PaginationControls-721b7c2f.js","assets/chevron-right-1a8868c5.js","assets/useFieldMask-a15ea7be.js","assets/react-vendor-4d4caec1.js","assets/circle-check-c97870a6.js","assets/supabase-6a05ac42.js"])),fr=c.lazy(()=>p(()=>import("./AgendaPage-5fb71157.js"),["assets/AgendaPage-5fb71157.js","assets/recharts-c8f055a0.js","assets/phone-b7a5826b.js","assets/clock-74b8e4d6.js","assets/users-a80df03b.js","assets/index-294c011b.js","assets/index-bc8bb77f.js","assets/index-e955fbf2.js","assets/ConfirmDialog-069c8468.js","assets/chevron-right-1a8868c5.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),pr=c.lazy(()=>p(()=>import("./LeadsPage-42bdeafb.js"),["assets/LeadsPage-42bdeafb.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/phone-b7a5826b.js","assets/clock-74b8e4d6.js","assets/users-a80df03b.js","assets/ConfirmDialog-069c8468.js","assets/plus-53dc3801.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),hr=c.lazy(()=>p(()=>import("./FinancesPage-a77d5b53.js"),["assets/FinancesPage-a77d5b53.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/index-294c011b.js","assets/index-d96bb25f.js","assets/index-bc8bb77f.js","assets/clock-74b8e4d6.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),gr=c.lazy(()=>p(()=>import("./RelatoriosPage-f8ec6713.js"),["assets/RelatoriosPage-f8ec6713.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/index-294c011b.js","assets/index-e955fbf2.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),yr=c.lazy(()=>p(()=>import("./FinanceiroPage-9e2feb54.js"),["assets/FinanceiroPage-9e2feb54.js","assets/recharts-c8f055a0.js","assets/paginatedFetch-6a8c3b6b.js","assets/ConfirmDialog-069c8468.js","assets/ellipsis-vertical-b0a76517.js","assets/pencil-a5a8ce82.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),br=c.lazy(()=>p(()=>import("./SetupPage-85c4a6c1.js"),["assets/SetupPage-85c4a6c1.js","assets/recharts-c8f055a0.js","assets/ConfirmDialog-069c8468.js","assets/check-4c623b42.js","assets/users-a80df03b.js","assets/copy-c20d77cb.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),jr=c.lazy(()=>p(()=>import("./MyProfilePage-688ec164.js"),["assets/MyProfilePage-688ec164.js","assets/recharts-c8f055a0.js","assets/check-4c623b42.js","assets/phone-b7a5826b.js","assets/supabase-6a05ac42.js","assets/react-vendor-4d4caec1.js"])),vr=c.lazy(()=>p(()=>import("./ChangePasswordPage-ae6883fa.js"),["assets/ChangePasswordPage-ae6883fa.js","assets/recharts-c8f055a0.js","assets/react-vendor-4d4caec1.js","assets/check-4c623b42.js","assets/supabase-6a05ac42.js"]));function wr(){return e.jsx("div",{className:"min-h-screen flex items-center justify-center",children:e.jsx(Y,{size:"lg",text:"Carregando..."})})}function Nr(){return e.jsxs("div",{className:"flex flex-col items-center justify-center h-full py-24 text-center",children:[e.jsx("h1",{className:"text-3xl font-semibold text-gray-900",children:"Página não encontrada"}),e.jsx("p",{className:"mt-2 text-sm text-gray-600",children:"A página que você tentou acessar não existe ou foi movida."})]})}function _r(){return e.jsx(or,{children:e.jsx(Ee,{basename:"/fefelina-admin",children:e.jsx(kt,{children:e.jsxs(Et,{children:[e.jsx(c.Suspense,{fallback:e.jsx(wr,{}),children:e.jsxs(te,{children:[e.jsx(x,{path:"/login",element:e.jsx(nr,{})}),e.jsx(x,{path:"/change-password",element:e.jsx(vr,{})}),e.jsx(x,{path:"/*",element:e.jsx(y,{children:e.jsx(ar,{children:e.jsxs(te,{children:[e.jsx(x,{path:"/",element:e.jsx(ir,{})}),e.jsx(x,{path:"/dashboard",element:e.jsx(y,{resource:"dashboard",children:e.jsx(lr,{})})}),e.jsx(x,{path:"/clients",element:e.jsx(y,{resource:"clients",children:e.jsx(cr,{})})}),e.jsx(x,{path:"/clients/:id",element:e.jsx(y,{resource:"clients",children:e.jsx(dr,{})})}),e.jsx(x,{path:"/pets",element:e.jsx(y,{resource:"pets",children:e.jsx(mr,{})})}),e.jsx(x,{path:"/services",element:e.jsx(y,{resource:"services",children:e.jsx(ur,{})})}),e.jsx(x,{path:"/visits",element:e.jsx(y,{resource:"visits",children:e.jsx(xr,{})})}),e.jsx(x,{path:"/agenda",element:e.jsx(y,{resource:"agenda",children:e.jsx(fr,{})})}),e.jsx(x,{path:"/leads",element:e.jsx(y,{resource:"leads",children:e.jsx(pr,{})})}),e.jsx(x,{path:"/finances",element:e.jsx(y,{resource:"financeiro",children:e.jsx(hr,{})})}),e.jsx(x,{path:"/reports",element:e.jsx(y,{resource:"relatorios",children:e.jsx(gr,{})})}),e.jsx(x,{path:"/financial",element:e.jsx(y,{resource:"financeiro",children:e.jsx(yr,{})})}),e.jsx(x,{path:"/setup",element:e.jsx(y,{resource:"setup",requireAdmin:!0,children:e.jsx(br,{})})}),e.jsx(x,{path:"/profile",element:e.jsx(jr,{})}),e.jsx(x,{path:"*",element:e.jsx(Nr,{})})]})})})})]})}),e.jsx(Nt,{position:"top-right",toastOptions:{duration:4e3,style:{background:"#fff",color:"#374151",boxShadow:"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"16px",fontSize:"14px",fontWeight:"500"},success:{style:{border:"1px solid #10b981",color:"#047857"},iconTheme:{primary:"#10b981",secondary:"#fff"}},error:{style:{border:"1px solid #ef4444",color:"#dc2626"},iconTheme:{primary:"#ef4444",secondary:"#fff"}}}})]})})})})}q.createRoot(document.getElementById("root")).render(e.jsx(_e.StrictMode,{children:e.jsx(_r,{})}));export{rr as A,Y as C,U as E,oe as L,ne as S,Xt as T,Gt as U,Pr as V,Kt as X,T as a,It as b,j as c,$t as d,f as e,Z as f,Ht as g,W as h,e as j,A as s,Ft as u};
