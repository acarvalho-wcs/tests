// Read-only experimental view of the public canonical Observatory feeds.
// Both files are pinned to the same commit; no restricted data is requested.
export const SOURCE_COMMIT='583ac03918994a214cdf10eaa4ab67e284602da2';
const BASE='https://raw.githubusercontent.com/wcsbrintel/iwt_globalobservatory/'+SOURCE_COMMIT+'/';
export const SOURCE_URL='https://github.com/wcsbrintel/iwt_globalobservatory/tree/'+SOURCE_COMMIT;
export const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[–—]/g,'-');
const valid=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
export const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
async function read(name){const response=await fetch(BASE+name,{credentials:'omit'});if(!response.ok)throw Error(name+' HTTP '+response.status);return response.json()}
let promise;
export function loadWildlife(){return promise??=(async()=>{
 const [payload,routeData]=await Promise.all([read('cases.json'),read('routes.json')]);
 if(!Array.isArray(payload.cases)||!Array.isArray(routeData.routes)||(payload.count!=null&&payload.count!==payload.cases.length))throw Error('Invalid canonical collection');
 const seen=new Set(),records=[];
 for(const r of payload.cases){
  if(typeof r.id!=='string'||!r.id||seen.has(r.id)||r.status!=='VALIDATED'||!valid(r.coordinates?.lat,r.coordinates?.lon)||!safeUrl(r.source_url))throw Error('Invalid canonical case: '+String(r.id));
  seen.add(r.id);records.push({type:'Feature',geometry:{type:'Point',coordinates:[r.coordinates.lon,r.coordinates.lat]},properties:{id:r.id,name:r.title_en||r.title_pt,country:r.country,groups:r.fauna_groups_aggregated||[],modal:r.modal_primary||'',source:r.source_label,source_url:r.source_url,event_date:r.event_date,publication_date:r.publication_date,description:r.card_text_en||r.card_text_pt,raw:r}});
 }
 const selected=new Map(),excluded=routeData.excluded||[],network=routeData.network_context||[],blocked=new Set([...excluded,...network].flatMap(r=>[r.id,r.route_id]).filter(Boolean));
 const counts={canonicalRoutes:routeData.routes.length,matchedRoutes:0,unmatchedRoutes:0,excludedRoutes:0,segments:0};
 for(const r of routeData.routes){
  if(blocked.has(r.id)||r.layer==='network_context'||r.route_type==='network_context'||r.context_only||r.render_by_default===false||!/^DOCUMENTED(?:_|$)/.test(r.status||'')){counts.excludedRoutes++;continue}
  const found=records.filter(f=>matches(f.properties.raw,r.event_match));
  if(found.length!==1){counts.unmatchedRoutes++;continue}
  const event=found[0];if(excluded.some(x=>x.event_match&&matches(event.properties.raw,x.event_match))){counts.excludedRoutes++;continue}
  const segments=(r.segments||[]).flatMap((s,i)=>valid(s.from?.lat,s.from?.lon)&&valid(s.to?.lat,s.to?.lon)?[{id:r.id+':'+i,eventId:event.properties.id,route:r,segment:s,direction:Object.prototype.hasOwnProperty.call(s,'direction')?s.direction||'unspecified':r.direction||'unspecified'}]:[]);
  if(!segments.length){counts.unmatchedRoutes++;continue}
  counts.matchedRoutes++;counts.segments+=segments.length;const arr=selected.get(event.properties.id)||[];arr.push(...segments);selected.set(event.properties.id,arr);
 }
 return {records,routes:selected,counts,updated:payload.feed_updated_at||payload.updated_at||routeData.updated_at||''};
 })()}
function matches(r,m){if(!m||!Object.keys(m).length)return false;const rules={
 event_id:v=>String(r.id)===String(v),case_id:v=>String(r.id)===String(v),
 location_contains:v=>[r.location_label_pt,r.location,r.city].some(x=>norm(x).includes(norm(v))),
 country:v=>norm(r.country)===norm(v),
 event_date:v=>r.event_date===v,publication_date:v=>r.publication_date===v,
 event_date_range:v=>Array.isArray(v)&&v.length===2&&!!r.event_date&&r.event_date>=v[0]&&r.event_date<=v[1],
 source_url:v=>r.source_url===v};
 return Object.entries(m).every(([k,v])=>rules[k]&&v!==null&&v!==''&&rules[k](v))}
export function facets(records){const values=k=>[...new Set(records.flatMap(f=>k==='groups'?f.properties.groups:[f.properties[k]]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));return {total:records.length,country:values('country'),groups:values('groups'),modal:values('modal'),source:values('source')}}
export function match(f,p,routes){const x=f.properties,r=x.raw,date=p.dateRole==='publication'?x.publication_date:x.event_date;return (!p.q||norm([x.name,x.country,x.description,x.source,r.title_pt,r.title_es,r.location_label_pt,r.taxon_text,r.fauna_label_pt,...x.groups].join(' ')).includes(norm(p.q)))&&(!p.country||x.country===p.country)&&(!p.group||x.groups.includes(p.group))&&(!p.modal||x.modal===p.modal)&&(!p.source||x.source===p.source)&&(!p.from||!!date&&date>=p.from)&&(!p.to||!!date&&date<=p.to)&&(!p.routesOnly||routes.has(x.id))}
export const approximate=p=>typeof p?.precision==='string'&&/(generalized|approximate|centroid|city|country|state|region|district|province|department|island|archipelago|continent|locality|neighborhood|corridor|border_context)/i.test(p.precision);
const rad=Math.PI/180,wrap=x=>((x+180)%360+360)%360-180;
// The three reviewed schematic exceptions are carried over with exact endpoint guards.
const schematic={'tgh-global-20261108-09-am-01-r02:0':[-23.5505,-46.6333,-25.2744,133.7751,-4],'ornfish-20261013-01:0':[4.7016,-74.1469,21.0278,105.8342,4],'tgh-20261028-callao-china-seahorses:0':[-12.05659,-77.11814,35.8617,104.1954,4]};
export function routePoint(d,t){const {from:a,to:b}=d.segment,s=schematic[d.id];if(s&&a.lat===s[0]&&a.lon===s[1]&&b.lat===s[2]&&b.lon===s[3])return {lat:a.lat+(b.lat-a.lat)*t+s[4]*Math.sin(Math.PI*t),lng:a.lon+(b.lon-a.lon)*t};const vec=p=>[Math.cos(p.lat*rad)*Math.cos(p.lon*rad),Math.sin(p.lat*rad),Math.cos(p.lat*rad)*Math.sin(p.lon*rad)],u=vec(a),v=vec(b),angle=Math.acos(Math.max(-1,Math.min(1,u.reduce((n,x,i)=>n+x*v[i],0))));if(angle<1e-8)return {lat:a.lat,lng:a.lon};if(Math.abs(Math.sin(angle))<1e-8)return {lat:a.lat+(b.lat-a.lat)*t,lng:wrap(a.lon+wrap(b.lon-a.lon)*t)};const w=u.map((x,i)=>(x*Math.sin((1-t)*angle)+v[i]*Math.sin(t*angle))/Math.sin(angle));return {lat:Math.atan2(w[1],Math.hypot(w[0],w[2]))/rad,lng:Math.atan2(w[2],w[0])/rad}}
