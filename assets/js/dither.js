// Контакты: 1-битная планета с кольцом, нарисованная шейдером с дизерингом Байера.
// Свет падает оттуда, где курсор. Рендер в низком разрешении и растяжение без сглаживания.

import { $, tick, palette, onTheme, damp, reduced, watchVisible, debounce } from './core.js';

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

const FRAG = `
precision highp float;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTime;
uniform vec2 uLight;
uniform vec3 uInk;
uniform vec3 uAcc;

float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+17.;a*=.5;}return v;}
float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 p=(frag-uCenter)/uRadius;
  float r2=dot(p,p);
  vec3 L=normalize(vec3(uLight,.8));
  float shade=0.;
  float body=0.;
  float hot=0.;

  if(r2<1.){
    vec3 n=vec3(p,sqrt(1.-r2));
    float diff=max(dot(n,L),0.);
    float lon=atan(n.x,n.z)+uTime*.12;
    float warp=fbm(vec2(n.y*3.,uTime*.04));
    float bands=fbm(vec2(lon*1.6,n.y*6.+warp*1.6));
    shade=(diff*(.26+.85*bands)+pow(1.-n.z,3.)*.3*diff)*.92;
    body=1.;
  }

  float tilt=-.32;
  vec2 q=vec2(cos(tilt)*p.x-sin(tilt)*p.y,sin(tilt)*p.x+cos(tilt)*p.y);
  float er=length(vec2(q.x,q.y/.24));
  if(er>1.34&&er<2.06&&(r2>1.||q.y<0.)){
    float band=.3+.6*fbm(vec2(er*13.,3.));
    float gap=step(1.62,er)*step(er,1.69);
    float lit=.45+.55*clamp(dot(normalize(vec3(q.x,0.,.4)),L)+.35,0.,1.);
    // тень планеты на кольце: полоса за планетой по направлению света
    vec2 ld=normalize(L.xy+vec2(1e-4));
    float shadow=step(abs(p.x*ld.y-p.y*ld.x),.96)*step(dot(p,ld),0.);
    shade=band*(1.-gap)*lit*(1.-shadow*.8);
    body=1.;
    hot=step(1.97,er);
  }

  float on=body*step(bayer8(frag),shade);
  float star=(1.-body)*step(.9968,hash(floor(frag)))*step(.2,sin(uTime*1.6+hash(floor(frag)+7.)*6.283));
  float a=max(on,star);
  vec3 col=mix(uInk,uAcc,hot*on);
  gl_FragColor=vec4(col*a,a);
}`;

export function initDither() {
  const canvas = $('.contact__dither');
  const section = $('.contact');
  if (!canvas || !section) return;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
  if (!gl) { canvas.remove(); return; }

  const prog = link(gl, VERT, FRAG);
  if (!prog) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['uCenter', 'uRadius', 'uTime', 'uLight', 'uInk', 'uAcc'].forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
  let time = 0;

  const setColors = () => {
    const p = palette();
    gl.uniform3f(u.uInk, p.ink[0] / 255, p.ink[1] / 255, p.ink[2] / 255);
    gl.uniform3f(u.uAcc, p.accent[0] / 255, p.accent[1] / 255, p.accent[2] / 255);
  };
  setColors();
  onTheme(() => { setColors(); draw(time); });

  let cw = 0; let ch = 0; let cssW = 0; let cssH = 0; let cell = 3;
  const center = { x: 0, y: 0 };
  let radius = 0;

  function size() {
    const r = canvas.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    cell = cssW < 600 ? 2.5 : 3;
    cw = Math.max(2, Math.round(cssW / cell));
    ch = Math.max(2, Math.round(cssH / cell));
    canvas.width = cw;
    canvas.height = ch;
    gl.viewport(0, 0, cw, ch);
    const m = Math.min(cw, ch);
    radius = m * 0.22;
    center.x = cw * 0.52;
    center.y = ch * 0.5;
    gl.uniform2f(u.uCenter, center.x, center.y);
    gl.uniform1f(u.uRadius, radius);
  }
  size();
  window.addEventListener('resize', debounce(() => { size(); draw(time); }, 150));

  const light = { x: -0.6, y: 0.5 };
  const target = { x: -0.6, y: 0.5 };
  let hover = false;
  section.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / cell - center.x) / radius;
    const y = ((r.bottom - e.clientY) / cell - center.y) / radius;
    const len = Math.hypot(x, y) || 1;
    const k = Math.min(1.6, len) / len;
    target.x = x * k * 0.9;
    target.y = y * k * 0.9;
    hover = true;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { hover = false; });

  function draw(t) {
    gl.uniform1f(u.uTime, t);
    gl.uniform2f(u.uLight, light.x, light.y);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduced()) { draw(4); return; }

  let visible = false;
  let acc = 0;
  watchVisible(section, (v) => { visible = v; }, '80px');
  tick((dt) => {
    if (!visible) return;
    time += dt;
    if (!hover) {
      target.x = Math.cos(time * 0.25) * 0.9;
      target.y = 0.35 + Math.sin(time * 0.25) * 0.45;
    }
    light.x = damp(light.x, target.x, 3, dt);
    light.y = damp(light.y, target.y, 3, dt);
    acc += dt;
    if (acc < 1 / 30) return;
    acc = 0;
    draw(time);
  });
}

function link(gl, vs, fs) {
  const make = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[zipka] shader', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = make(gl.VERTEX_SHADER, vs);
  const f = make(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('[zipka] program', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}
