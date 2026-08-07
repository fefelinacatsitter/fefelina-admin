async function e(s,t=1e3){const o=[];let r=0;for(;;){const{data:c,error:n}=await s.range(r,r+t-1);if(n)throw n;const a=c||[];if(o.push(...a),a.length<t)break;r+=t}return o}export{e as f};
