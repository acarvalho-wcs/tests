import {API_BASE,json,dataset,facets} from './config.js';try{const s=API_BASE?await json(API_BASE+'/api/meta'):await facets(await dataset());document.querySelector('#total').textContent=s.total.toLocaleString();document.querySelector('#countries').textContent=s.country.length;document.querySelector('#sources').textContent=s.source.length}catch(e){console.error(e)}
try {
 if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
 const ml=await import('https://unpkg.com/maplibre-gl@6.19.0/dist/maplibre-gl.mjs');
 const globe=new ml.Map({container:'hero-map',interactive:false,attributionControl:false,center:[18,14],zoom:1.1,style:{version:8,projection:{type:'globe'},sources:{earth:{type:'raster',tiles:['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],tileSize:256}},layers:[{id:'earth',type:'raster',source:'earth'}]}});
 globe.on('style.load',()=>globe.setProjection({type:'globe'}));
 globe.on('load',()=>{let last=0;function frame(now){if(last&&!document.hidden){const c=globe.getCenter();globe.jumpTo({center:[c.lng+Math.min(now-last,40)*0.002,c.lat]});}last=now;requestAnimationFrame(frame)}requestAnimationFrame(frame)});
 const attribution=document.createElement('div');attribution.className='hero-attribution';attribution.textContent='© OpenStreetMap contributors · © CARTO';document.querySelector('.hero').append(attribution);
 }
} catch(e){console.warn('Decorative globe unavailable',e)}
