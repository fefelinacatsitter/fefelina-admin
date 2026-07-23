import{r as o}from"./recharts-c8f055a0.js";function s(e,t=400){const[r,u]=o.useState(e);return o.useEffect(()=>{const c=setTimeout(()=>u(e),t);return()=>clearTimeout(c)},[e,t]),r}export{s as u};
