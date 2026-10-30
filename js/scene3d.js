/* Pequeno renderizador WebGL: malhas com volume, luz e teste de profundidade.
   Projeção ortográfica inclinada mantém a mira previsível para o arcade. */
Aurora.Scene3D = class {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', {antialias:true, alpha:false});
    if (!gl) throw new Error('WebGL não está disponível. Ative a aceleração gráfica ou use a versão 2D.');
    this.gl=gl; this.vertices=[]; this.cache=new Map();
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const vs=compile(gl.VERTEX_SHADER,`
      attribute vec3 position; attribute vec3 normal; attribute vec3 color;
      varying vec3 tint;
      void main(){
        float screenY=position.z*.78-position.y*.62+80.;
        gl_Position=vec4((position.x-360.)/360.,1.-screenY/380.,-(position.z*.62+position.y*.78)/2000.,1.);
        float light=.42+.58*max(dot(normalize(normal),normalize(vec3(-.6,1.,.5))),0.);
        tint=color*light;
      }`);
    const fs=compile(gl.FRAGMENT_SHADER,`precision mediump float; varying vec3 tint; void main(){gl_FragColor=vec4(tint,1.);}`);
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [i,name] of ['position','normal','color'].entries()){const at=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,3,gl.FLOAT,false,36,i*12);}
    gl.enable(gl.DEPTH_TEST);gl.clearColor(.30,.40,.35,1);
    this.meshes={box:this.boxMesh(),sphere:this.sphereMesh(),cone:this.coneMesh()};
  }
  boxMesh(){
    const p=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
    return [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].flatMap(([a,b,c,d])=>[[p[a],p[b],p[c]],[p[a],p[c],p[d]]]);
  }
  sphereMesh(){
    const tris=[],p=(lat,lon)=>[Math.cos(lat)*Math.cos(lon)*.5,Math.sin(lat)*.5,Math.cos(lat)*Math.sin(lon)*.5];
    for(let j=0;j<6;j++)for(let i=0;i<10;i++){const a=-Math.PI/2+j*Math.PI/6,b=a+Math.PI/6,c=i*Math.PI/5,d=c+Math.PI/5;tris.push([p(a,c),p(b,c),p(b,d)],[p(a,c),p(b,d),p(a,d)]);}
    return tris;
  }
  coneMesh(){const tris=[];for(let i=0;i<7;i++){const a=i*Math.PI*2/7,b=(i+1)*Math.PI*2/7;tris.push([[Math.cos(a)*.5,-.5,Math.sin(a)*.5],[0,.5,0],[Math.cos(b)*.5,-.5,Math.sin(b)*.5]]);}return tris;}
  color(hex){if(!this.cache.has(hex))this.cache.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));return this.cache.get(hex);}
  begin(){this.vertices.length=0;}
  mesh(type,x,y,z,sx,sy,sz,color,roll=0,yaw=0){
    const cr=Math.cos(roll),sr=Math.sin(roll),cy=Math.cos(yaw),sn=Math.sin(yaw),rgb=this.color(color);
    const transform=p=>{let a=p[0]*sx,b=p[1]*sy,c=p[2]*sz;const r=a*cr-b*sr;b=a*sr+b*cr;a=r;return [x+a*cy+c*sn,y+b,z-a*sn+c*cy];};
    for(const triangle of this.meshes[type]){
      const points=triangle.map(transform),a=points[0],b=points[1],c=points[2];
      const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
      let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;n=n.map(v=>v/len);
      for(const p of points)this.vertices.push(...p,...n,...rgb);
    }
  }
  end(){const gl=this.gl;gl.viewport(0,0,gl.canvas.width,gl.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.vertices),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,this.vertices.length/9);}
};
