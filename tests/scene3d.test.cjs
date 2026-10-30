const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const THREE=require('three');
const context=vm.createContext({Aurora:{},THREE});
for(const file of ['aircraft','renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),context);
test('Asas curvas têm índices válidos e normais finitas nos dois lados',()=>{
  for(const side of [-1,1])for(const tail of [true,false]){
    const g=context.Aurora.Aircraft.wingGeometry(side,tail);
    for(const key of ['position','normal','uv'])assert.ok(Array.from(g.attributes[key].array).every(Number.isFinite));
    assert.ok(Array.from(g.index.array).every(i=>i<g.attributes.position.count));
    g.computeBoundingBox();assert.ok(g.boundingBox.max.z>g.boundingBox.min.z);
  }
});
test('Mira e entidades mantêm projeção alinhada após redimensionamento',()=>{
  const r=Object.create(context.Aurora.Renderer.prototype);
  Object.assign(r,{T:THREE,ray:new THREE.Raycaster(),plane:new THREE.Plane(new THREE.Vector3(0,1,0),-95),pointer:new THREE.Vector2()});
  for(const ratio of [.7,1,1.6]){
    r.camera=new THREE.OrthographicCamera(-380*ratio,380*ratio,380,-380,1,4000);
    r.camera.position.set(360,1252,1400);r.camera.lookAt(360,0,400);r.camera.updateMatrixWorld();
    for(const height of [15,95,220])for(const [x,y] of [[80,85],[360,380],[640,710]]){
      const projected=r.world(x,y,height).project(r.camera);
      assert.ok(Math.abs(projected.x-(x/360-1))<1e-10);
      assert.ok(Math.abs(projected.y-(1-y/380))<1e-10);
    }
  }
});

// Validate assembled dimensions, rather than just configuration labels.
test('Modelo montado respeita comprimento e envergadura de referência',()=>{
  const drawing=new Proxy({}, {get:()=>()=>{}});
  const canvas={getContext:()=>drawing};
  const T={...THREE,TextureLoader:class{load(){return new THREE.Texture();}}};
  const c=vm.createContext({Aurora:{},THREE:T,AuroraMedia:{emblem:''},document:{createElement:()=>canvas}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/aircraft.js'),'utf8'),c);
  const model=c.Aurora.Aircraft.create(),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x/10-12.42)<.005);
  assert.ok(Math.abs(size.z/10-11.02)<.005);
  assert.ok(size.y/10<4.30,'Flight silhouette must not exceed ground height');
  let guns=0;model.traverse(o=>{if(o.name==='gun-jacket'){guns++;assert.ok(o.geometry.parameters.radiusTop<=.20);}});assert.equal(guns,8);
  const geo=c.Aurora.Aircraft.wingGeometry(1),pos=geo.attributes.position,idx=geo.index.array;
  let area=0;
  // Only top surface triangles (first half of the index buffer).
  for(let i=0;i<idx.length/2;i+=3){const a=idx[i],b=idx[i+1],d=idx[i+2];area+=Math.abs((pos.getX(b)-pos.getX(a))*(pos.getZ(d)-pos.getZ(a))-(pos.getZ(b)-pos.getZ(a))*(pos.getX(d)-pos.getX(a)))/2;}
  const root=c.Aurora.Aircraft.wingProfile(6),center=12*(root.back-root.front);
  const measured=(2*area+center)*model.children[0].scale.x*model.children[0].scale.z/100;
  assert.ok(Math.abs(measured-27.87)<.03,`Wing area ${measured}`);
});

test('Fw 190A-8 tem dimensões próprias, três pás e armamento distinto',()=>{
 const drawing=new Proxy({}, {get:()=>()=>{}}),canvas={getContext:()=>drawing};
 const c=vm.createContext({Aurora:{},THREE:{...THREE,TextureLoader:class{load(){return new THREE.Texture();}}},AuroraMedia:{emblem:''},document:{createElement:()=>canvas}});
 for(const file of ['aircraft','fw190'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),c);
 const model=c.Aurora.Fw190.create(),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x/10-10.50)<.005);assert.ok(Math.abs(size.z/10-8.95)<.005);
 const counts={};model.traverse(o=>{counts[o.name]=(counts[o.name]||0)+1;if(o.geometry)for(const attr of ['position','normal'])if(o.geometry.attributes[attr])assert.ok(Array.from(o.geometry.attributes[attr].array).every(Number.isFinite));});
 assert.equal(counts['fw190-propeller-blade'],3);assert.equal(counts['fw190-wing-cannon'],4);assert.equal(counts['fw190-cowl-gun'],2);assert.equal(counts['fw190-main-wing'],2);
 assert.equal(model.userData.dimensions.variant,'Fw 190A-8');assert.ok(model.getObjectByName('propeller'));
 const clone=model.clone(true);clone.getObjectByName('propeller').rotation.z=1;assert.equal(model.getObjectByName('propeller').rotation.z,0);
});
test('Relevo e rio têm posição e inclinação contínuas nas emendas',()=>{
 const r=Object.create(context.Aurora.Renderer.prototype);
 for(const x of [-350,0,180,360,580,1000])for(const fn of ['height','terrainHeight']){
  assert.ok(Math.abs(r[fn](x,0)-r[fn](x,1600))<1e-9);
  const d0=(r[fn](x,.01)-r[fn](x,-.01))/.02,d1=(r[fn](x,1600.01)-r[fn](x,1599.99))/.02;assert.ok(Math.abs(d0-d1)<1e-7);
 }
 for(const fn of ['riverX','riverWidth'])assert.ok(Math.abs(r[fn](0)-r[fn](1600))<1e-9);
});
test('Normais de iluminação são idênticas nas duas bordas do terreno',()=>{
 const r=Object.create(context.Aurora.Renderer.prototype);r.T=THREE;
 const g=new THREE.PlaneGeometry(1500,1600,20,20);g.rotateX(-Math.PI/2);g.translate(360,0,800);
 const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,r.height(p.getX(i),p.getZ(i)));g.computeVertexNormals();r.stitchTerrainNormals(g);
 const edges=new Map();for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))<.001||Math.abs(p.getZ(i)-1600)<.001){const key=p.getX(i).toFixed(3);if(!edges.has(key))edges.set(key,[]);edges.get(key).push(i);}
 for(const [a,b] of edges.values())for(const axis of ['getX','getY','getZ'])assert.equal(g.attributes.normal[axis](a),g.attributes.normal[axis](b));
});


test('Asas do Fw 190 têm faces opacas orientadas para fora em ambos os lados',()=>{
 const c=vm.createContext({Aurora:{},THREE});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/fw190.js'),'utf8'),c);
 for(const side of [-1,1])for(const tail of [false,true]){
  const g=c.Aurora.Fw190.wing(side,tail),normal=g.attributes.normal;
  const surfaceVertices=normal.count/2;
  // Interior samples avoid the degenerate rounded tip and the sharp trailing edge.
  for(let span=1;span<63;span++)for(let chord=2;chord<23;chord++){
   const index=span*25+chord;
   assert.ok(normal.getY(index)>0,`Upper face points inward: side=${side}, tail=${tail}`);
   assert.ok(normal.getY(index+surfaceVertices)<0,`Lower face points inward: side=${side}, tail=${tail}`);
  }
 }
});

test('Messerschmitt: dimensões finitas, asas externas, duas turbinas sem hélice',()=>{
 const drawing=new Proxy({}, {get:()=>()=>{}}),canvas={getContext:()=>drawing};
 const c=vm.createContext({Aurora:{},THREE,document:{createElement:()=>canvas}});
 for(const file of ['aircraft','axis-aircraft'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),c);
 for(const type of ['bf109','me262']){const model=c.Aurora.AxisAircraft.create(type),spec=c.Aurora.AxisAircraft.specs[type],size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-spec.span*10)<.01);assert.ok(Math.abs(size.z-spec.length*10)<.01);
 let pods=0;model.traverse(o=>{if(o.name==='jumo004')pods++;if(o.geometry)for(const attr of ['position','normal'])assert.ok(Array.from(o.geometry.attributes[attr].array).every(Number.isFinite));});
 assert.equal(pods,type==='me262'?2:0);assert.equal(Boolean(model.getObjectByName('propeller')),type==='bf109');assert.doesNotThrow(()=>model.clone(true));
 for(const side of [-1,1]){const geo=c.Aurora.AxisAircraft.wing(side,spec.span*5,type==='me262'),norm=geo.attributes.normal;assert.ok(norm.getY(25*15+12)>0);assert.ok(norm.getY(norm.count/2+25*15+12)<0);}
 }
});

test('Ponte possui vãos abertos e construções têm geometria válida com poucos lotes',()=>{
 const drawing=new Proxy({}, {get:()=>()=>{}}),canvas={getContext:()=>drawing};const c=vm.createContext({Aurora:{},THREE,document:{createElement:()=>canvas}});
 for(const file of ['aircraft','architecture'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),c);
 const bridge=c.Aurora.Architecture.bridge();bridge.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-38,5,-50),new THREE.Vector3(0,0,1));assert.equal(ray.intersectObject(bridge,true).length,0,'O vão deve permitir ver a água sob a ponte');ray.set(new THREE.Vector3(-19,5,-50),new THREE.Vector3(0,0,1));assert.ok(ray.intersectObject(bridge,true).length>0,'Pilar deve ser sólido');
 for(const model of [bridge,c.Aurora.Architecture.building(),c.Aurora.Architecture.building({warehouse:true}),c.Aurora.Architecture.building({snow:true})]){assert.ok(model.children.length<=8);model.traverse(o=>{if(o.geometry)for(const key of ['position','normal','uv'])assert.ok(Array.from(o.geometry.attributes[key].array).every(Number.isFinite));});}
});

test('Plano de voo deixa asas inclinadas acima das montanhas em toda a rolagem',()=>{
 const r=Object.create(context.Aurora.Renderer.prototype);Object.assign(r,{T:THREE,ray:new THREE.Raycaster(),plane:new THREE.Plane(new THREE.Vector3(0,1,0),-95),pointer:new THREE.Vector2(),currentLandscape:'mountains'});
 for(const ratio of [.65,1,1.4,1.8]){
  r.camera=new THREE.OrthographicCamera(-380*ratio,380*ratio,380,-380,1,4000);r.camera.position.set(360,1252,1400);r.camera.lookAt(360,0,400);r.camera.updateMatrixWorld();const h=r.flightHeight();
  assert.ok(h<r.camera.position.y);
  for(const sx of [45,360,675])for(const sy of [85,380,710]){
   const point=r.world(sx,sy,h),projected=point.clone().project(r.camera);
   assert.ok(Math.abs(projected.x-(sx/360-1))<1e-10);assert.ok(Math.abs(projected.y-(1-sy/380))<1e-10);
   for(let phase=0;phase<1600;phase+=20)for(const dx of [-70,0,70])for(const dz of [-60,0,60]){
    const terrain=r.mountainHeight(point.x+dx,point.z+dz-phase);
    assert.ok(h-30>terrain+40,'Asa inclinada deve passar acima do relevo e das árvores');
   }
  }
 }
 r.currentLandscape='farmland';assert.equal(r.flightHeight(),95);
});
