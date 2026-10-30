/* Shared, baked scenery meshes: masonry arches, tiled houses and freight depots. */
Aurora.Architecture=(()=>{
 const T=THREE,cache=new Map();let mats;
 function texture(kind){return Aurora.Aircraft.texture((c,w,h)=>{c.fillStyle=kind==='tile'?'#805443':kind==='stone'?'#8d8c7b':'#c2b69a';c.fillRect(0,0,w,h);let seed=132;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let y=0;y<h;y+=kind==='tile'?24:40)for(let x=-40;x<w;x+=kind==='tile'?18:80){const xx=x+(y/40%2)*40;c.fillStyle=kind==='tile'?`rgba(230,156,100,${rand()*.19})`:`rgba(40,43,32,${rand()*.15})`;c.fillRect(xx+1,y+1,kind==='tile'?16:77,kind==='tile'?22:37);c.strokeStyle=kind==='tile'?'#352d2660':'#433f3445';c.strokeRect(xx,y,kind==='tile'?18:80,kind==='tile'?24:40);}
  for(let i=0;i<5000;i++){c.fillStyle=rand()>.5?'#ffffff12':'#1d251d15';c.fillRect(rand()*w,rand()*h,1+rand()*4,1+rand()*3);}
 },256,256);}
 function materials(){if(mats)return mats;const tile=texture('tile'),stone=texture('stone'),plaster=texture('plaster');tile.wrapS=tile.wrapT=stone.wrapS=stone.wrapT=plaster.wrapS=plaster.wrapT=T.RepeatWrapping;return mats={wall:new T.MeshStandardMaterial({map:plaster,roughness:1}),stone:new T.MeshStandardMaterial({map:stone,bumpMap:stone,bumpScale:.18,roughness:1}),roof:new T.MeshStandardMaterial({map:tile,bumpMap:tile,bumpScale:.15,roughness:.95}),wood:new T.MeshStandardMaterial({color:0x514c39,roughness:.94}),glass:new T.MeshStandardMaterial({color:0x253d42,roughness:.3,metalness:.15}),trim:new T.MeshStandardMaterial({color:0xa69e82,roughness:1}),road:new T.MeshStandardMaterial({color:0x8c8978,roughness:1}),snow:new T.MeshStandardMaterial({color:0xd4d9d0,roughness:1})};}
 function add(g,geo,m,x=0,y=0,z=0){if(geo.type==='ExtrudeGeometry'){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/32,uv.getY(i)/32);}const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;}
 const boxGeo=new T.BoxGeometry(1,1,1);
 function box(g,m,x,y,z,w,h,d){const o=add(g,boxGeo,m,x,y,z);o.scale.set(w,h,d);return o;}
 function roofGeometry(w,d,h,rise){const s=new T.Shape();s.moveTo(-w/2,h);s.lineTo(0,h+rise);s.lineTo(w/2,h);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});geo.translate(0,0,-d/2);return geo;}
 // Merge static geometry by material to keep detailed villages inexpensive to draw.
 function bake(g){g.updateMatrixWorld(true);const batches=new Map();g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const groups=Array.isArray(o.material)?geo.groups:[{start:0,count:geo.attributes.position.count,materialIndex:0}];for(const group of groups){const material=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;let b=batches.get(material);if(!b){b={position:[],normal:[],uv:[]};batches.set(material,b);}for(const k of Object.keys(b)){const attr=geo.attributes[k];b[k].push(...attr.array.slice(group.start*attr.itemSize,(group.start+group.count)*attr.itemSize));}}geo.dispose();});const out=new T.Group();for(const [m,b] of batches){const geo=new T.BufferGeometry();for(const k of Object.keys(b))geo.setAttribute(k,new T.Float32BufferAttribute(b[k],k==='uv'?2:3));const o=add(out,geo,m);o.castShadow=true;o.receiveShadow=true;}return out;}
 function building({warehouse=false,snow=false,variant=0}={}){const key=`building-${warehouse}-${snow}-${variant%2}`;if(cache.has(key))return cache.get(key).clone(true);const g=new T.Group(),m=materials(),w=warehouse?54:18,d=warehouse?42:25,h=warehouse?24:17,rise=warehouse?10:7;
  box(g,m.stone,0,1,0,w+1.5,2,d+1.5);box(g,variant%2?m.stone:m.wall,0,h/2,0,w,h,d);add(g,roofGeometry(w+3,d+3,h,rise),[variant%2?m.stone:m.wall,m.roof]);
  for(const side of [-1,1]){box(g,m.trim,side*(w/2+.6),h-.4,0,1,1,d+3);for(let i=0;i<(warehouse?3:2);i++){const z=-d*.28+i*d*(warehouse?.28:.56);box(g,m.trim,side*(w/2+.12),h*.6,z,.3,4.7,4);box(g,m.glass,side*(w/2+.32),h*.6,z,.12,3.8,3.1);box(g,m.wood,side*(w/2+.4),h*.6,z,.1,.3,3.2);if(!warehouse)for(const dz of [-2.2,2.2])box(g,m.wood,side*(w/2+.35),h*.6,z+dz,.3,4,1.1);}}
  const doorW=warehouse?18:4,doorH=warehouse?17:7;box(g,m.trim,0,doorH/2,d/2+.12,doorW+1.4,doorH+1,.4);box(g,m.wood,0,doorH/2,d/2+.4,doorW,doorH,.4);for(let x=-doorW/2+1;x<doorW/2;x+=2)box(g,m.trim,x,doorH/2,d/2+.65,.12,doorH,.1);box(g,m.stone,0,.4,d/2+1.5,doorW+2,.8,3);
  box(g,m.glass,0,h+rise*.35,d/2+1.6,warehouse?6:2.4,warehouse?3:2,.2);
  if(!warehouse){box(g,m.stone,-w*.25,h+rise*.7,-d*.23,2.4,7,2.8);box(g,m.trim,-w*.25,h+rise*.7+3.6,-d*.23,3.2,.7,3.6);}
  else {for(const side of [-1,1]){box(g,m.stone,side*(w/2+.5),h/2,0,2,h,3);for(let i=0;i<3;i++)box(g,m.wood,side*(w/2+4),2,d*.25-i*4,5,4,3);}box(g,m.wood,0,h-2,d/2+3,24,.8,6);}
  if(snow){const slope=Math.atan2(rise,w/2+1.5),len=Math.hypot(w/2+1.5,rise);for(const side of [-1,1]){const patch=box(g,m.snow,side*(w/4+.7),h+rise/2+.3,-1,len,.4,d*.85);patch.rotation.z=-side*slope;}}
  const model=bake(g);model.name=warehouse?'Freight depot':'Italian house';cache.set(key,model);return model.clone(true);
 }
 function bridge(){if(cache.has('bridge'))return cache.get('bridge').clone(true);const g=new T.Group(),m=materials();
  for(const x of [-57,-19,19,57]){box(g,m.stone,x,8,0,8,26,26);box(g,m.stone,x,-3,0,12,5,31);for(const side of [-1,1]){const cut=add(g,new T.ConeGeometry(5,15,3),m.stone,x,3,side*14);cut.rotation.y=side>0?0:Math.PI;}}
  for(const center of [-38,0,38]){const s=new T.Shape();s.moveTo(-15,0);s.lineTo(-15,21);s.lineTo(15,21);s.lineTo(15,0);s.bezierCurveTo(15,20,-15,20,-15,0);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:26,bevelEnabled:false,curveSegments:32});geo.translate(center,0,-13);add(g,geo,m.stone);
   for(const side of [-1,1])for(let i=0;i<13;i++){const a=i*Math.PI/13,b=(i+1)*Math.PI/13-.012,s=new T.Shape();s.moveTo(15*Math.cos(a),15*Math.sin(a));s.lineTo(17.5*Math.cos(a),17.5*Math.sin(a));s.absarc(0,0,17.5,a,b,false);s.lineTo(15*Math.cos(b),15*Math.sin(b));s.absarc(0,0,15,b,a,true);s.closePath();const ring=new T.ExtrudeGeometry(s,{depth:.6,bevelEnabled:false,curveSegments:5});add(g,ring,m.trim,center,0,side>0?13:-13.6);}
  }
  box(g,m.road,0,22,0,122,2,23);for(const side of [-1,1]){box(g,m.stone,0,25.4,side*12,124,5,2.5);box(g,m.trim,0,28.1,side*12,126,.9,3.4);for(const x of [-60,-19,19,60])box(g,m.stone,x,26,side*12,4,7,4);}
  for(const side of [-1,1]){const s=new T.Shape();s.moveTo(60,0);s.lineTo(60,23);s.lineTo(110,5);s.lineTo(110,0);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:25,bevelEnabled:false});geo.translate(0,0,-12.5);if(side<0)geo.rotateY(Math.PI);add(g,geo,m.road);}
  const model=bake(g);model.name='Three-arch masonry bridge';cache.set('bridge',model);return model.clone(true);
 }
 return {building,bridge};
})();
