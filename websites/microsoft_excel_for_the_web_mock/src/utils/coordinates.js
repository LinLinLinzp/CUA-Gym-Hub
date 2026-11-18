export const colName = n => { let s=''; for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s }
export const colNumber = s => [...s.toUpperCase()].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)
export const address = (r,c) => `${colName(c)}${r}`
export function coord(a) { const m=/^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i.exec(a?.trim()||''); if(!m)return null; const c=colNumber(m[1]),r=+m[2];return c<=16384&&r<=1048576?{r,c}:null }
export function range(a) { const parts=String(a||'').split(':');const [x,y]=parts.map(coord);if(!x||parts.length>2||(parts.length===2&&!y))return null;return {r1:Math.min(x.r,y?.r??x.r),r2:Math.max(x.r,y?.r??x.r),c1:Math.min(x.c,y?.c??x.c),c2:Math.max(x.c,y?.c??x.c)} }
export const rangeName = b => `${address(b.r1,b.c1)}${b.r1===b.r2&&b.c1===b.c2?'':':'+address(b.r2,b.c2)}`
export const inside = (cell,b) => !!b&&cell.row>=b.r1&&cell.row<=b.r2&&cell.column>=b.c1&&cell.column<=b.c2
export function* points(b) { if(!b)return;for(let r=b.r1;r<=b.r2;r++)for(let c=b.c1;c<=b.c2;c++)yield {r,c} }
export const overlap=(a,b)=>a&&b&&a.r1<=b.r2&&b.r1<=a.r2&&a.c1<=b.c2&&b.c1<=a.c2
