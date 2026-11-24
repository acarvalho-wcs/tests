// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2025-2026 Ancient Nerds Contributors.
// Adapted for Archa from ancientnerds/AncientMap@7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe. See UPSTREAM.md and LICENSE.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {latLngTo3DArray,buildSegmentPositions} from './segment-builder.js';
import {createFrontLineMaterial,createBackLineMaterial,updateLineMaterialUniforms} from './line-materials.js';
const CAMERA={FOV:60,NEAR:0.01,FAR:1500,MIN_DISTANCE:1.02,MAX_DISTANCE:2.44,INITIAL_DISTANCE:2.2,AUTO_ROTATE_SPEED:0.15,DAMPING_FACTOR:0.08,PAN_SPEED:0.5,ROTATE_SPEED:0.5,ZOOM_SPEED:1};
const GLOBE={RADIUS:1,SEGMENTS_THETA:48,SEGMENTS_PHI:48,LAYER_RADIUS:1.002,DOT_RADIUS:1.008};
const UP='https://raw.githubusercontent.com/ancientnerds/AncientMap/7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe/public/data/layers/globe/';
export function createGlobe(container,{onChange=()=>{},onPick=()=>{},onError=()=>{},decorative=false}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',stencil:true,depth:true,preserveDrawingBuffer:true,alpha:true,premultipliedAlpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0x000000,0);container.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
 const camera=new THREE.PerspectiveCamera(CAMERA.FOV,1,CAMERA.NEAR,CAMERA.FAR);
 scene.add(camera);camera.position.fromArray(latLngTo3DArray(51,10,CAMERA.MAX_DISTANCE));camera.lookAt(0,0,0);
 const globe=new THREE.Mesh(new THREE.SphereGeometry(GLOBE.RADIUS,GLOBE.SEGMENTS_THETA,GLOBE.SEGMENTS_PHI),new THREE.MeshBasicMaterial({color:0x0a1628,transparent:true,opacity:0.8,depthWrite:false}));
 globe.renderOrder=0;scene.add(globe);
   const starCount = 2000
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    // Random position on a large sphere
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 800 + Math.random() * 400 // Distance 800-1200 (very far)
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)
    // Slight color variation (white to light blue)
    const brightness = 0.5 + Math.random() * 0.5
    starColors[i * 3] = brightness
    starColors[i * 3 + 1] = brightness
    starColors[i * 3 + 2] = brightness + Math.random() * 0.2
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
  // Custom shader for stars - dims behind globe, hides when satellite active
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uCameraDist: { value: CAMERA.INITIAL_DISTANCE },
      uSatelliteMode: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uGlobeScale: { value: 1.0 }  // Globe scale during warp (0.3 to 1.0)
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying float vBehindGlobe;
      uniform float uCameraDist;
      uniform float uGlobeScale;

      void main() {
        vColor = color;

        // Star position in view space
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 viewPos = mvPosition.xyz;

        // Globe center in view space (globe is at world origin, camera looks at it)
        // In view space, globe is at (0, 0, -cameraDist)
        vec3 globeCenter = vec3(0.0, 0.0, -uCameraDist);
        float globeRadius = uGlobeScale;  // Use actual globe scale during warp

        // Ray from camera (origin) toward star
        vec3 rayDir = normalize(viewPos);

        // Ray-sphere intersection test
        vec3 L = globeCenter; // origin is at 0
        float tca = dot(L, rayDir);
        float d2 = dot(L, L) - tca * tca;
        float r2 = globeRadius * globeRadius;

        // Check if ray intersects globe and star is behind it
        if (d2 < r2 && tca > 0.0) {
          // Ray intersects sphere, check if star is behind intersection
          float thc = sqrt(r2 - d2);
          float t0 = tca - thc; // near intersection
          float starDist = length(viewPos);
          vBehindGlobe = starDist > t0 ? 1.0 : 0.0;
        } else {
          vBehindGlobe = 0.0;
        }

        gl_PointSize = 1.5;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vBehindGlobe;
      uniform float uSatelliteMode;
      uniform float uOpacity;

      void main() {
        // Stars behind globe handling:
        // - Satellite ON: completely hide (opaque satellite blocks them)
        // - Satellite OFF: dim to 50%
        if (vBehindGlobe > 0.5) {
          if (uSatelliteMode > 0.5) discard; // Satellite is opaque, block completely
          // Non-satellite: dim to 50%
          gl_FragColor = vec4(vColor * 0.5, uOpacity * 0.5);
        } else {
          // Stars not behind globe - full brightness
          gl_FragColor = vec4(vColor, uOpacity);
        }
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false
  })
  const starPoints = new THREE.Points(starGeo, starMaterial)
  const starsGroup = new THREE.Group()
  starsGroup.add(starPoints)
  starsGroup.renderOrder = -30 // Behind everything
  camera.add(starsGroup) // Attach to camera so stars never move with globe rotation
  scene.add(camera) // Camera must be in scene for its children to render

 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=CAMERA.DAMPING_FACTOR;controls.enablePan=false;controls.minDistance=CAMERA.MIN_DISTANCE;controls.maxDistance=CAMERA.MAX_DISTANCE;controls.rotateSpeed=CAMERA.ROTATE_SPEED;controls.zoomSpeed=CAMERA.ZOOM_SPEED;controls.autoRotate=false;controls.enabled=!decorative;controls.update();
 const layers=new Map(), materials=[], pointMat=new THREE.ShaderMaterial({uniforms:{uSize:{value:6},uCameraPos:{value:new THREE.Vector3()},uCameraDist:{value:2.44},uPixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`uniform float uSize;uniform float uPixelRatio;uniform vec3 uCameraPos;uniform float uCameraDist;varying float vVisible;void main(){vVisible=step(1.0/uCameraDist,dot(normalize(position),normalize(uCameraPos)));gl_PointSize=uSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying float vVisible;void main(){float r=length(gl_PointCoord-vec2(0.5));if(vVisible<0.5||r>0.5)discard;gl_FragColor=vec4(1.0,0.22,0.24,1.0-smoothstep(0.38,0.5,r));}`,transparent:true,depthWrite:false});
 let features=[],points=new THREE.Points(new THREE.BufferGeometry(),pointMat);points.renderOrder=20;scene.add(points);
 let spinning=decorative,last=0,down=null,ready=false,disposed=false,previous='';
 const resize=()=>{const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=CAMERA.FOV;camera.updateProjectionMatrix();};
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 const zoomValue=()=>Math.round(100*(CAMERA.MAX_DISTANCE-camera.position.length())/(CAMERA.MAX_DISTANCE-CAMERA.MIN_DISTANCE));
 function report(){const n=camera.position.clone().normalize(),lat=Math.asin(n.y)*180/Math.PI,lng=((Math.atan2(n.z,-n.x)*180/Math.PI-180+540)%360)-180;const z=Math.max(0,Math.min(100,zoomValue()));const sig=lat.toFixed(3)+','+lng.toFixed(3)+','+z;if(sig!==previous){previous=sig;onChange({lat,lng,zoom:z,spinning})}}
 function setZoom(z){camera.position.setLength(CAMERA.MAX_DISTANCE-(Math.max(0,Math.min(100,z))/100)*(CAMERA.MAX_DISTANCE-CAMERA.MIN_DISTANCE));controls.update();report()}
 function setSpinning(v){spinning=!!v;onChange({zoom:zoomValue(),spinning});}
 function flyTo(coords,z=50){setSpinning(false);camera.position.fromArray(latLngTo3DArray(coords[1],coords[0],CAMERA.MAX_DISTANCE-(z/100)*(CAMERA.MAX_DISTANCE-CAMERA.MIN_DISTANCE)));controls.target.set(0,0,0);controls.update();report()}
 function setSites(list){features=list;const a=new Float32Array(list.length*3);for(let i=0;i<list.length;i++){const [lng,lat]=list[i].geometry.coordinates;a.set(latLngTo3DArray(lat,lng,GLOBE.DOT_RADIUS),i*3)}points.geometry.dispose();points.geometry=new THREE.BufferGeometry();points.geometry.setAttribute('position',new THREE.BufferAttribute(a,3));points.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),GLOBE.DOT_RADIUS);}
 function setDotSize(n){pointMat.uniforms.uSize.value=Number(n)}
 const ray=new THREE.Raycaster();ray.params.Points.threshold=0.014;const mouse=new THREE.Vector2();
 function pick(e){if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||!features.length)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const n=camera.position.clone().normalize(),h=1/camera.position.length();const hit=ray.intersectObject(points).find(x=>{const a=points.geometry.attributes.position;return new THREE.Vector3().fromBufferAttribute(a,x.index).normalize().dot(n)>=h});if(hit)onPick(features[hit.index]);}
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];if(!decorative)setSpinning(false)});renderer.domElement.addEventListener('pointerup',pick);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onError(Error('WebGL context lost. Reload the globe.'))});
 async function addLayer(key,filename){const res=await fetch(UP+filename);if(!res.ok)throw Error('Original '+key+' layer unavailable: '+res.status);const data=await res.json();if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid original '+key+' layer');const arrays=buildSegmentPositions(data.features,[1.002,1.001]);const group=new THREE.Group();for(let i=0;i<2;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arrays[i],3));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.002);const m=i===0?createFrontLineMaterial(0x00e0d0,1):createBackLineMaterial(0x00e0d0,1);materials.push(m);const l=new THREE.LineSegments(g,m);l.renderOrder=i===0?10:-10;group.add(l)}globe.add(group);layers.set(key,group);return group;}
 const readyPromise=Promise.all([addLayer('coastlines','coast_start.0dce00e6.json'),addLayer('countryBorders','borders_start.787780e8.json')]).then(()=>{ready=true;return true}).catch(e=>{onError(e);throw e});
 function frame(now){if(disposed)return;requestAnimationFrame(frame);if(document.hidden){last=now;return}const dt=Math.min((now-(last||now))/1000,.05);last=now;if(spinning)camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),.01*dt);controls.update();const dist=camera.position.length();updateLineMaterialUniforms(materials,camera.position,dist,Math.max(0,Math.min(1,(2.0-dist)/.7)));starMaterial.uniforms.uCameraDist.value=dist;pointMat.uniforms.uCameraPos.value.copy(camera.position);pointMat.uniforms.uCameraDist.value=dist;renderer.render(scene,camera);report();}
 requestAnimationFrame(frame);
 return {ready:readyPromise,setSites,setZoom,getZoom:zoomValue,setSpinning,flyTo,setDotSize,setLayer:(k,v)=>{if(layers.has(k))layers.get(k).visible=v},screenshot:()=>renderer.domElement.toDataURL('image/png'),dispose:()=>{disposed=true;ro.disconnect();controls.dispose();renderer.dispose()}};
}
