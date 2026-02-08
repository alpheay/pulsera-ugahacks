"use client";

import { useEffect, useRef } from "react";

function getWebGLContext(canvas: HTMLCanvasElement) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  const gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null
    || canvas.getContext("webgl", params) as WebGLRenderingContext | null;
  return gl;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
  const program = gl.createProgram()!;
  const vShader = compileShader(gl, gl.VERTEX_SHADER, vs);
  const fShader = compileShader(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  return program;
}

const baseVS = `attribute vec2 aPosition;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 texelSize;void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);gl_Position=vec4(aPosition,0.0,1.0);}`;

const splatFS = `precision highp float;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}`;

const advFS = `precision highp float;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 texelSize;uniform float dt;uniform float dissipation;void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=dissipation*texture2D(uSource,coord);gl_FragColor.a=1.0;}`;

const displayFS = `precision highp float;varying vec2 vUv;uniform sampler2D uTexture;void main(){vec3 c=texture2D(uTexture,vUv).rgb;float a=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,a*0.95);}`;

export default function SplashCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = getWebGLContext(canvas);
    if (!gl) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const simW = Math.floor(w * 0.25);
    const simH = Math.floor(h * 0.25);

    const ext = gl.getExtension("OES_texture_half_float") || gl.getExtension("OES_texture_float");
    const halfFloat = (ext && (ext as { HALF_FLOAT_OES?: number }).HALF_FLOAT_OES) || gl.FLOAT;

    function createFBO(w: number, h: number) {
      const tex = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, halfFloat as number, null);
      const fbo = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
      return { tex, fbo, w, h };
    }

    function createDoubleFBO(w: number, h: number) {
      let fbo1 = createFBO(w, h);
      let fbo2 = createFBO(w, h);
      return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; },
      };
    }

    const blit = (() => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      return (target: { fbo: WebGLFramebuffer; w: number; h: number } | null) => {
        if (target) {
          gl.viewport(0, 0, target.w, target.h);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
    })();

    const splatProg = createProgram(gl, baseVS, splatFS);
    const advProg = createProgram(gl, baseVS, advFS);
    const dispProg = createProgram(gl, baseVS, displayFS);

    const velocity = createDoubleFBO(simW, simH);
    const dye = createDoubleFBO(simW, simH);

    const posAttr = gl.getAttribLocation(splatProg, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    let lastX = 0, lastY = 0;
    let splatQueue: Array<{ x: number; y: number; dx: number; dy: number }> = [];

    function handlePointer(e: PointerEvent) {
      const x = e.clientX / w;
      const y = 1.0 - e.clientY / h;
      const dx = (e.clientX - lastX) * 10;
      const dy = -(e.clientY - lastY) * 10;
      lastX = e.clientX;
      lastY = e.clientY;
      splatQueue.push({ x, y, dx, dy });
    }

    function splat(x: number, y: number, dx: number, dy: number) {
      // Velocity splat
      gl!.useProgram(splatProg);
      gl!.uniform2f(gl!.getUniformLocation(splatProg, "texelSize"), 1.0 / simW, 1.0 / simH);
      gl!.uniform1i(gl!.getUniformLocation(splatProg, "uTarget"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.tex);
      gl!.uniform1f(gl!.getUniformLocation(splatProg, "aspectRatio"), w / h);
      gl!.uniform2f(gl!.getUniformLocation(splatProg, "point"), x, y);
      gl!.uniform3f(gl!.getUniformLocation(splatProg, "color"), dx, dy, 0);
      gl!.uniform1f(gl!.getUniformLocation(splatProg, "radius"), 0.0003);
      blit(velocity.write);
      velocity.swap();

      // Dye splat with amber/warm colors
      gl!.bindTexture(gl!.TEXTURE_2D, dye.read.tex);
      gl!.uniform1i(gl!.getUniformLocation(splatProg, "uTarget"), 0);
      const r = 0.96 + Math.random() * 0.04;
      const g = 0.5 + Math.random() * 0.3;
      const b = 0.04 + Math.random() * 0.1;
      gl!.uniform3f(gl!.getUniformLocation(splatProg, "color"), r * 0.15, g * 0.15, b * 0.15);
      gl!.uniform1f(gl!.getUniformLocation(splatProg, "radius"), 0.0005);
      blit(dye.write);
      dye.swap();
    }

    function advect(target: ReturnType<typeof createDoubleFBO>, dissipation: number) {
      gl!.useProgram(advProg);
      gl!.uniform2f(gl!.getUniformLocation(advProg, "texelSize"), 1.0 / simW, 1.0 / simH);
      gl!.uniform1i(gl!.getUniformLocation(advProg, "uVelocity"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.tex);
      gl!.uniform1i(gl!.getUniformLocation(advProg, "uSource"), 1);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, target.read.tex);
      gl!.uniform1f(gl!.getUniformLocation(advProg, "dt"), 0.016);
      gl!.uniform1f(gl!.getUniformLocation(advProg, "dissipation"), dissipation);
      blit(target.write);
      target.swap();
    }

    let animId: number;

    function render() {
      while (splatQueue.length > 0) {
        const s = splatQueue.shift()!;
        splat(s.x, s.y, s.dx, s.dy);
      }

      advect(velocity, 0.98);
      advect(dye, 0.97);

      gl!.useProgram(dispProg);
      gl!.uniform2f(gl!.getUniformLocation(dispProg, "texelSize"), 1.0 / w, 1.0 / h);
      gl!.uniform1i(gl!.getUniformLocation(dispProg, "uTexture"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, dye.read.tex);
      blit(null);

      animId = requestAnimationFrame(render);
    }

    function handleResize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    window.addEventListener("pointermove", handlePointer);
    window.addEventListener("resize", handleResize);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
