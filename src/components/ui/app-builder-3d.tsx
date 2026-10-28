'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Locale } from '@/lib/i18n'
import { isLiteMotion } from '@/lib/motion-lite'

/**
 * App Builder — the hero illustration of juko.ai.
 *
 * "Custom software, built for you" as an isometric construction site: a giant phone lying on the
 * ground with its interface being assembled, a standing tablet with the website, a crane lifting
 * interface parts, dump trucks carrying gears, a forklift, little builders, an app-icon block,
 * clouds and a balloon. Procedural three.js, flat shading, no models and no images.
 *
 * The parent gives it a height. On a frame wider than 900 px the illustration sits in the right
 * part of the frame and leaves the left side for the headline.
 */

type Copy = { aria: string; sign: [string, string] }
const COPY: Record<Locale, Copy> = {
  es: {
    aria: 'Ilustración 3D: un equipo construye una app y una web a medida, con una grúa, camiones y engranajes sobre un móvil gigante.',
    sign: ['¡COTIZA', 'TU PROYECTO!'],
  },
  en: {
    aria: '3D illustration: a team builds a custom app and website, with a crane, trucks and gears on a giant phone.',
    sign: ['GET A QUOTE', 'FOR YOUR PROJECT'],
  },
}

export default function AppBuilder3D({ locale, className }: { locale: Locale; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let dispose: (() => void) | undefined
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) dispose = initBuilderScene(root, COPY[locale], getComputedStyle(root).fontFamily)
    })
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [locale])

  return (
    <div ref={rootRef} className={['app-builder-3d', className].filter(Boolean).join(' ')} role="img" aria-label={COPY[locale].aria}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    </div>
  )
}

const P = {
  frame: 0x1b1838,
  frameEdge: 0x2b2752,
  screen: 0x4b3cf0,
  ui: 0xf4f3fc,
  violet: 0x7752fe,
  peri: 0x8e8ffa,
  sky: 0xc2d9ff,
  mint: 0x5ce8a8,
  yellow: 0xffc94a,
  yellowDark: 0xe0a92c,
  navy: 0x232052,
  grey: 0x6d6a92,
  tyre: 0x17152b,
  cloud: 0xffffff,
}

function initBuilderScene(root: HTMLElement, copy: Copy, fontFamily: string): () => void {
  const cleanups: Array<() => void> = []
  const dispose = () => {
    for (const fn of cleanups.reverse()) fn()
    cleanups.length = 0
  }
  try {
    const TAU = Math.PI * 2
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const lite = isLiteMotion()
    const width0 = root.clientWidth || 1
    const narrow = width0 < 900
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : narrow ? 1.6 : 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    root.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6f63c9, 1.9))
    const sun = new THREE.DirectionalLight(0xffffff, 2.4)
    sun.position.set(9, 16, 7)
    sun.castShadow = true
    // on a phone the scene is ~400 px wide: a 1024 map gives the same soft shadows for a quarter of the work
    const shadowSize = narrow ? 1024 : 2048
    sun.shadow.mapSize.set(shadowSize, shadowSize)
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 })
    sun.shadow.bias = -0.0004
    sun.shadow.radius = 3
    scene.add(sun)
    const fillLight = new THREE.DirectionalLight(0xc2d9ff, 0.7)
    fillLight.position.set(-10, 6, 4)
    scene.add(fillLight)

    const world = new THREE.Group()
    scene.add(world)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.22 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    world.add(ground)

    const mats = new Map<string, THREE.Material>()
    const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const k = color + JSON.stringify(extra)
      if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05, flatShading: true, ...extra }))
      return mats.get(k)!
    }
    const geos: THREE.BufferGeometry[] = []
    const keep = <G extends THREE.BufferGeometry>(g: G) => (geos.push(g), g)
    function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: number, r = 0) {
      const g = keep(r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)) : new THREE.BoxGeometry(w, h, d))
      const m = new THREE.Mesh(g, mat(color))
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }
    function cyl(parent: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, color: number, seg = 16, r2 = r) {
      const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(r, r2, h, seg)), mat(color))
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }
    // A rod between two points (crane lattice, cables, ropes).
    const up = new THREE.Vector3(0, 1, 0)
    function rod(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, color: number, square = true) {
      const len = a.distanceTo(b)
      const m = new THREE.Mesh(keep(square ? new THREE.BoxGeometry(r * 2, len, r * 2) : new THREE.CylinderGeometry(r, r, len, 6)), mat(color))
      m.position.copy(a).add(b).multiplyScalar(0.5)
      m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize())
      m.castShadow = true
      parent.add(m)
      return m
    }
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
    function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
      const cv = document.createElement('canvas')
      cv.width = w
      cv.height = h
      const c = cv.getContext('2d')!
      draw(c)
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      return { t, c }
    }
    function decal(parent: THREE.Object3D, w: number, h: number, tex: THREE.Texture, transparent = false) {
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), new THREE.MeshBasicMaterial({ map: tex, transparent, toneMapped: false }))
      parent.add(m)
      return m
    }
    const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
      c.fillStyle = fill
      c.beginPath()
      c.roundRect(x, y, w, h, r)
      c.fill()
    }
    // A flat gear: teeth on a ring with a hole, extruded.
    function gearGeo(r: number, teeth: number, depth: number) {
      const shape = new THREE.Shape()
      const inner = r * 0.78
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * TAU
        const s = TAU / teeth
        const pts: Array<[number, number]> = [
          [inner, a],
          [r, a + s * 0.18],
          [r, a + s * 0.48],
          [inner, a + s * 0.66],
        ]
        pts.forEach(([rad, ang], j) => {
          const x = Math.cos(ang) * rad,
            y = Math.sin(ang) * rad
          if (i === 0 && j === 0) shape.moveTo(x, y)
          else shape.lineTo(x, y)
        })
      }
      shape.closePath()
      const hole = new THREE.Path()
      hole.absarc(0, 0, r * 0.32, 0, TAU, true)
      shape.holes.push(hole)
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 })
      g.rotateX(-Math.PI / 2)
      g.translate(0, 0, 0)
      return keep(g)
    }
    const spinners: Array<{ o: THREE.Object3D; speed: number; axis: 'y' | 'z' }> = []
    function gear(parent: THREE.Object3D, r: number, teeth: number, x: number, y: number, z: number, color: number, speed = 0.6, depth = 0.22) {
      const m = new THREE.Mesh(gearGeo(r, teeth, depth), mat(color))
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      spinners.push({ o: m, speed, axis: 'y' })
      return m
    }

    // ---- The giant phone, lying down, with its interface being assembled ----------------------
    const phone = new THREE.Group()
    phone.position.set(-0.6, 0, 0.6)
    phone.scale.setScalar(1.45)
    world.add(phone)
    box(phone, 4.7, 0.34, 8.7, 0, 0.17, 0, P.frame, 0.3)
    box(phone, 4.55, 0.06, 8.55, 0, 0.33, 0, P.frameEdge, 0.25)
    const screenTex = canvasTex(256, 480, (c) => {
      const g = c.createLinearGradient(0, 0, 256, 480)
      g.addColorStop(0, '#5a4bff')
      g.addColorStop(1, '#3d2fd0')
      c.fillStyle = g
      c.fillRect(0, 0, 256, 480)
      c.strokeStyle = 'rgba(255,255,255,.07)'
      c.lineWidth = 1
      for (let x = 0; x < 256; x += 16) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, 480)
        c.stroke()
      }
      for (let y = 0; y < 480; y += 16) {
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(256, y)
        c.stroke()
      }
    })
    const screen = decal(phone, 4.05, 7.75, screenTex.t)
    screen.rotation.x = -Math.PI / 2
    screen.position.set(0, 0.365, -0.05)
    screen.receiveShadow = true
    box(phone, 1.0, 0.06, 0.16, 0, 0.37, -4.08, P.navy, 0.05)
    // the interface parts already in place
    box(phone, 3.8, 0.12, 1.05, 0, 0.42, -3.15, P.violet, 0.06)
    box(phone, 1.5, 0.05, 0.16, -0.95, 0.5, -3.2, P.ui, 0.03)
    box(phone, 0.9, 0.16, 0.55, 1.15, 0.52, -3.15, P.ui, 0.08)
    box(phone, 0.36, 0.06, 0.2, 1.15, 0.62, -3.15, P.violet, 0.03)
    box(phone, 1.9, 0.18, 1.55, -0.85, 0.45, -1.6, P.ui, 0.08)
    box(phone, 1.05, 0.12, 0.32, 1.15, 0.42, -1.95, P.navy, 0.06)
    box(phone, 1.05, 0.12, 0.32, 1.15, 0.42, -1.4, P.navy, 0.06)
    ;[3.4, 2.7, 3.1, 1.9].forEach((len, i) => box(phone, len, 0.06, 0.2, -1.85 + len / 2, 0.39, -0.35 + i * 0.42, P.ui, 0.04))
    gear(phone, 0.62, 10, -1.0, 0.38, 2.05, P.peri, 0.5, 0.12)
    gear(phone, 0.5, 9, 0.35, 0.38, 2.55, P.sky, -0.62, 0.12)
    gear(phone, 0.42, 8, -0.45, 0.38, 3.25, P.peri, 0.74, 0.12)
    box(phone, 1.05, 0.14, 0.55, 1.2, 0.45, 3.4, P.ui, 0.08)

    // ---- The tablet standing behind, showing the website ------------------------------------
    const tablet = new THREE.Group()
    tablet.position.set(6.0, 0, -4.4)
    tablet.rotation.y = 0.12
    tablet.scale.setScalar(1.2)
    world.add(tablet)
    box(tablet, 5.8, 7.9, 0.36, 0, 4.1, 0, P.frame, 0.35)
    box(tablet, 1.2, 3.2, 0.3, 0, 1.7, -0.9, P.frameEdge, 0.1).rotation.x = 0.45
    const webTex = canvasTex(540, 740, (c) => {
      c.fillStyle = '#eef0ff'
      c.fillRect(0, 0, 540, 740)
      rr(c, 0, 0, 150, 740, 0, '#4b3cf0')
      for (let i = 0; i < 9; i++) rr(c, 20, 40 + i * 52, 110 - (i % 3) * 14, 22, 6, i === 1 ? '#c2d9ff' : '#ffffff')
      rr(c, 176, 34, 340, 40, 8, '#1b1838')
      rr(c, 176, 92, 230, 20, 6, '#1b1838')
      rr(c, 176, 140, 340, 230, 14, '#232052')
      c.fillStyle = '#ffffff'
      c.beginPath()
      c.arc(346, 255, 44, 0, TAU)
      c.fill()
      c.fillStyle = '#232052'
      c.beginPath()
      c.moveTo(333, 230)
      c.lineTo(333, 280)
      c.lineTo(372, 255)
      c.closePath()
      c.fill()
      rr(c, 176, 392, 230, 16, 8, '#4b3cf0')
      rr(c, 176, 420, 300, 16, 8, '#8e8ffa')
      rr(c, 176, 448, 180, 16, 8, '#8e8ffa')
      for (let i = 0; i < 4; i++) {
        rr(c, 410, 392 + i * 84, 110, 72, 10, '#ffffff')
        c.strokeStyle = '#8e8ffa'
        c.lineWidth = 3
        c.beginPath()
        c.roundRect(410, 392 + i * 84, 110, 72, 10)
        c.stroke()
        rr(c, 422, 404 + i * 84, 30, 30, 6, '#c2d9ff')
        rr(c, 460, 408 + i * 84, 48, 8, 4, '#232052')
        rr(c, 460, 424 + i * 84, 36, 8, 4, '#232052')
      }
      for (let i = 0; i < 3; i++) rr(c, 176, 490 + i * 70, 220, 54, 10, '#dfe3ff')
    })
    const web = decal(tablet, 5.3, 7.35, webTex.t)
    web.position.set(0, 4.1, 0.185)

    // ---- The crane, lifting interface parts onto the phone ----------------------------------
    const crane = new THREE.Group()
    crane.position.set(-5.3, 0, -4.4)
    world.add(crane)
    box(crane, 1.9, 0.5, 1.9, 0, 0.25, 0, P.grey, 0.06)
    const H = 7.2,
      half = 0.42
    for (const [x, z] of [[-half, -half], [half, -half], [half, half], [-half, half]]) rod(crane, v(x, 0.5, z), v(x, H, z), 0.07, P.yellow)
    for (let y = 0.5; y < H - 0.5; y += 0.95) {
      rod(crane, v(-half, y, half), v(half, y + 0.95, half), 0.035, P.yellowDark)
      rod(crane, v(half, y, half), v(-half, y + 0.95, half), 0.035, P.yellowDark)
      rod(crane, v(half, y, -half), v(half, y + 0.95, half), 0.035, P.yellowDark)
      rod(crane, v(half, y, half), v(half, y + 0.95, -half), 0.035, P.yellowDark)
      rod(crane, v(-half, y, half), v(half, y, half), 0.035, P.yellowDark)
    }
    const slew = new THREE.Group()
    slew.position.y = H
    crane.add(slew)
    box(slew, 1.05, 0.25, 1.05, 0, 0.12, 0, P.yellowDark)
    box(slew, 0.95, 0.85, 0.95, -0.15, 0.7, 0.75, P.sky, 0.12)
    box(slew, 0.97, 0.38, 0.6, -0.15, 0.82, 0.97, P.navy, 0.06)
    // jib towards the phone, counter-jib behind
    const JIB = 6.4
    for (const z of [-0.28, 0.28]) {
      rod(slew, v(0, 0.35, z), v(JIB, 0.35, z), 0.06, P.yellow)
      rod(slew, v(0, 0.35, z), v(-2.6, 0.35, z), 0.06, P.yellow)
    }
    rod(slew, v(0, 1.0, 0), v(JIB, 1.0, 0), 0.055, P.yellow)
    for (let x = 0; x < JIB; x += 0.7) {
      rod(slew, v(x, 0.35, -0.28), v(x + 0.35, 1.0, 0), 0.03, P.yellowDark)
      rod(slew, v(x + 0.35, 1.0, 0), v(x + 0.7, 0.35, 0.28), 0.03, P.yellowDark)
    }
    rod(slew, v(0, 0.35, 0), v(0, 2.3, 0), 0.08, P.yellow)
    rod(slew, v(0, 2.3, 0), v(JIB, 1.0, 0), 0.02, P.navy, false)
    rod(slew, v(0, 2.3, 0), v(-2.5, 0.45, 0), 0.02, P.navy, false)
    box(slew, 0.9, 0.7, 0.9, -2.2, 0.0, 0, P.grey, 0.06)
    // two hooks: a stack of interface cards near the mast, a settings gear near the tip
    const hooks = [
      { x: 2.4, base: 3.4, amp: 1.1, speed: 0.55, phase: 0 },
      { x: 5.6, base: 4.2, amp: 1.3, speed: 0.45, phase: 1.7 },
    ].map(({ x, base, amp, speed, phase }, i) => {
      box(slew, 0.4, 0.22, 0.7, x, 0.2, 0, P.navy, 0.04)
      const cable = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, 1, 5)), mat(P.navy))
      slew.add(cable)
      const load = new THREE.Group()
      slew.add(load)
      box(load, 0.3, 0.25, 0.3, 0, 0.2, 0, P.yellowDark, 0.04)
      if (i === 0) {
        box(load, 1.3, 0.5, 1.3, 0, -0.25, 0, P.violet, 0.04).scale.set(1, 0.1, 1)
        for (let k = 0; k < 4; k++) box(load, 1.2, 0.09, 1.2, 0, -0.38 - k * 0.11, 0, k % 2 ? P.sky : P.ui, 0.03)
        for (const [a, b] of [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]]) rod(load, v(0, 0.1, 0), v(a, -0.3, b), 0.012, P.navy, false)
      } else {
        const gg = new THREE.Group()
        gg.position.y = -0.55
        gg.rotation.x = Math.PI / 2
        load.add(gg)
        const gm = new THREE.Mesh(gearGeo(0.55, 9, 0.18), mat(P.violet))
        gm.castShadow = true
        gg.add(gm)
        const badge = canvasTex(128, 128, (c) => {
          rr(c, 0, 0, 128, 128, 26, '#ffffff')
          for (let k = 0; k < 3; k++) rr(c, 28, 34 + k * 24, 72, 10, 5, '#7752FE')
        })
        const bd = decal(gg, 0.42, 0.42, badge.t)
        bd.position.set(0, 0.2, 0)
        bd.rotation.x = -Math.PI / 2
        spinners.push({ o: gg, speed: 0.8, axis: 'z' })
      }
      return { x, base, amp, speed, phase, cable, load }
    })

    // ---- Vehicles ----------------------------------------------------------------------------
    type Vehicle = { g: THREE.Group; wheels: THREE.Mesh[]; from: THREE.Vector3; to: THREE.Vector3; speed: number; phase: number; last: number }
    const vehicles: Vehicle[] = []
    function wheels(g: THREE.Group, xs: number[], z: number, r: number) {
      const list: THREE.Mesh[] = []
      for (const x of xs)
        for (const s of [-1, 1]) {
          const w = cyl(g, r, 0.32, x, r, s * z, P.tyre, 14)
          w.rotation.x = Math.PI / 2
          const hub = cyl(w, r * 0.45, 0.34, 0, 0, 0, P.sky, 10)
          hub.castShadow = false
          list.push(w)
        }
      return list
    }
    function dumpTruck(cargo: number[]) {
      const g = new THREE.Group()
      box(g, 3.6, 0.32, 1.4, 0, 0.62, 0, P.navy, 0.05)
      box(g, 1.25, 1.15, 1.45, 1.25, 1.3, 0, P.peri, 0.14)
      box(g, 0.06, 0.5, 1.15, 1.88, 1.5, 0, P.navy, 0.02)
      box(g, 0.8, 0.45, 1.47, 1.15, 1.55, 0, P.navy, 0.04)
      box(g, 0.25, 0.25, 1.5, 1.95, 0.85, 0, P.sky, 0.05)
      const bed = new THREE.Group()
      bed.position.set(-0.55, 0.85, 0)
      g.add(bed)
      box(bed, 2.35, 0.12, 1.5, 0, 0, 0, P.yellow, 0.03)
      box(bed, 2.35, 0.7, 0.1, 0, 0.38, 0.7, P.yellow, 0.03)
      box(bed, 2.35, 0.7, 0.1, 0, 0.38, -0.7, P.yellow, 0.03)
      box(bed, 0.1, 0.7, 1.5, -1.15, 0.38, 0, P.yellowDark, 0.03)
      box(bed, 0.1, 0.9, 1.5, 1.15, 0.48, 0, P.yellowDark, 0.03)
      cargo.forEach((col, i) => {
        const cg = new THREE.Mesh(gearGeo(0.5, 9, 0.2), mat(col))
        cg.position.set(-0.5 + i * 0.75, 0.55, (i % 2 ? 0.15 : -0.1))
        cg.rotation.set(0.35 * (i % 2 ? 1 : -1), 0, Math.PI / 2 - 0.4)
        cg.castShadow = true
        bed.add(cg)
      })
      const ws = wheels(g, [-1.2, -0.45, 1.25], 0.66, 0.42)
      return { g, ws }
    }
    function addVehicle(g: THREE.Group, ws: THREE.Mesh[], from: THREE.Vector3, to: THREE.Vector3, speed: number, phase: number) {
      g.position.copy(from)
      g.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x)
      world.add(g)
      vehicles.push({ g, wheels: ws, from, to, speed, phase, last: 0 })
    }
    const t1 = dumpTruck([P.sky, P.peri])
    t1.g.scale.setScalar(1.3)
    addVehicle(t1.g, t1.ws, v(-9.0, 0, 0.4), v(-6.6, 0, 1.8), 0.35, 0)
    const t2 = dumpTruck([P.mint, P.sky, P.peri])
    t2.g.scale.setScalar(1.3)
    addVehicle(t2.g, t2.ws, v(9.8, 0, 4.4), v(6.9, 0, 2.9), 0.3, 1.4)
    // forklift carrying an interface card
    const fork = new THREE.Group()
    box(fork, 1.4, 0.55, 1.0, 0, 0.6, 0, P.yellow, 0.08)
    box(fork, 0.6, 0.35, 0.9, -0.4, 1.0, 0, P.yellowDark, 0.06)
    for (const [x, z] of [[-0.6, -0.42], [0.3, -0.42], [0.3, 0.42], [-0.6, 0.42]]) rod(fork, v(x, 0.85, z), v(x, 2.1, z), 0.035, P.navy)
    box(fork, 1.05, 0.06, 1.0, -0.15, 2.12, 0, P.navy, 0.02)
    for (const z of [-0.32, 0.32]) rod(fork, v(0.78, 0.3, z), v(0.78, 2.3, z), 0.05, P.navy)
    const forks = new THREE.Group()
    forks.position.set(0.85, 0.35, 0)
    fork.add(forks)
    for (const z of [-0.25, 0.25]) box(forks, 0.9, 0.05, 0.12, 0.45, 0, z, P.grey)
    box(forks, 0.85, 0.12, 0.85, 0.48, 0.09, 0, P.yellowDark, 0.02)
    box(forks, 0.75, 0.1, 0.7, 0.48, 0.22, 0, P.ui, 0.04)
    box(forks, 0.5, 0.04, 0.12, 0.48, 0.29, -0.15, P.violet, 0.02)
    const fws = wheels(fork, [-0.45, 0.45], 0.5, 0.28)
    fork.scale.setScalar(1.3)
    addVehicle(fork, fws, v(-6.0, 0, 8.6), v(-4.6, 0, 7.4), 0.42, 0.6)

    // ---- Builders --------------------------------------------------------------------------
    type Person = { g: THREE.Group; arms: THREE.Mesh[]; base: THREE.Vector3; phase: number; walk: number }
    const people: Person[] = []
    function person(x: number, y: number, z: number, ry: number, shirt: number, hair: number, skin: number, phase: number, walk = 0) {
      const g = new THREE.Group()
      g.position.set(x, y, z)
      g.rotation.y = ry
      g.scale.setScalar(1.25)
      world.add(g)
      for (const s of [-0.1, 0.1]) box(g, 0.13, 0.5, 0.15, 0, 0.25, s, P.navy, 0.04)
      const body = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.2, 0.32, 4, 8)), mat(shirt))
      body.position.y = 0.78
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(0.21, 1)), mat(skin))
      head.position.y = 1.27
      head.castShadow = true
      g.add(head)
      const h = new THREE.Mesh(keep(new THREE.SphereGeometry(0.225, 10, 6, 0, TAU, 0, Math.PI / 2)), mat(hair))
      h.position.set(-0.02, 1.3, 0)
      h.rotation.z = 0.25
      g.add(h)
      const arms = [-0.27, 0.27].map((s) => {
        const a = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.06, 0.32, 3, 6)), mat(shirt))
        a.geometry.translate(0, -0.18, 0)
        a.position.set(0, 0.98, s)
        a.castShadow = true
        g.add(a)
        return a
      })
      people.push({ g, arms, base: g.position.clone(), phase, walk })
      return g
    }
    const skin = [0xf2c9a5, 0xc68b5e, 0x8d5a3b, 0xf7d7bd]
    person(0.4, 0.55, 0.9, 0.4, P.yellow, P.navy, skin[0], 0, 0.6)
    person(-2.6, 0.55, -2.2, -0.6, P.mint, 0x2b1d14, skin[1], 1.3)
    person(-1.2, 0.55, 4.4, 1.0, P.violet, 0x3a2a1c, skin[2], 2.1)
    person(4.0, 0, -0.2, 1.2, P.yellow, P.navy, skin[3], 0.7, 0.5)
    const signer = person(3.3, 0, 6.9, 2.6, P.peri, 0x2b1d14, skin[0], 1.8)

    // ---- "Quote your project": a lit sign raised high by one of the builders --------------------
    const board = new THREE.Group()
    board.position.set(0, 0.95, 0.3)
    // turn the sign so its face looks at the camera, whatever way the builder stands
    board.rotation.y = Math.PI / 4 - signer.rotation.y
    signer.add(board)
    const BW = 2.5,
      BH = 1.21,
      BY = 1.55 + BH / 2
    cyl(board, 0.035, 1.6, 0, 0.8, -0.05, P.navy, 8)
    box(board, BW + 0.1, BH + 0.1, 0.12, 0, BY, -0.05, P.frame, 0.05)
    // neon frame in the brand gradient, pulsing
    const neon = new THREE.MeshStandardMaterial({ color: 0xc2d9ff, emissive: 0x8e8ffa, emissiveIntensity: 1.6, roughness: 0.3, toneMapped: false })
    const neonGeo = (w: number, h: number) => keep(new THREE.BoxGeometry(w, h, 0.07))
    ;[
      [BW + 0.08, 0.045, 0, BY + BH / 2 + 0.02],
      [BW + 0.08, 0.045, 0, BY - BH / 2 - 0.02],
      [0.045, BH + 0.08, -BW / 2 - 0.02, BY],
      [0.045, BH + 0.08, BW / 2 + 0.02, BY],
    ].forEach(([w, h, x, y]) => {
      const m = new THREE.Mesh(neonGeo(w, h), neon)
      m.position.set(x, y, 0.05)
      board.add(m)
    })
    const boardTex = canvasTex(1024, 496, () => {})
    function drawBoard(time: number) {
      const c = boardTex.c,
        W = 1024,
        Hh = 496
      const bg = c.createLinearGradient(0, 0, W, Hh)
      bg.addColorStop(0, '#231a68')
      bg.addColorStop(0.55, '#16123d')
      bg.addColorStop(1, '#0d0b26')
      c.fillStyle = bg
      c.fillRect(0, 0, W, Hh)
      // soft violet glow and a faint grid
      const glow = c.createRadialGradient(W * 0.3, Hh * 0.2, 10, W * 0.3, Hh * 0.2, W * 0.6)
      glow.addColorStop(0, 'rgba(142,143,250,.35)')
      glow.addColorStop(1, 'rgba(142,143,250,0)')
      c.fillStyle = glow
      c.fillRect(0, 0, W, Hh)
      c.strokeStyle = 'rgba(194,217,255,.06)'
      c.lineWidth = 2
      for (let x = 0; x < W; x += 48) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, Hh)
        c.stroke()
      }
      // eyebrow pill
      rr(c, 64, 52, 250, 52, 26, 'rgba(194,217,255,.12)')
      c.fillStyle = '#5ce8a8'
      c.beginPath()
      c.arc(94, 78, 9, 0, TAU)
      c.fill()
      c.fillStyle = '#c2d9ff'
      c.font = `700 26px ${fontFamily}`
      c.textAlign = 'left'
      c.fillText('JUKO AI', 116, 87)
      // headline: two lines, each shrunk to fit whatever the language
      const fit = (txt: string, size: number, max: number) => {
        c.font = `800 ${size}px ${fontFamily}`
        const w = c.measureText(txt).width
        if (w > max) c.font = `800 ${Math.floor((size * max) / w)}px ${fontFamily}`
        return c.measureText(txt).width
      }
      const g = c.createLinearGradient(64, 0, 700, 0)
      g.addColorStop(0, '#C2D9FF')
      g.addColorStop(0.45, '#8E8FFA')
      g.addColorStop(1, '#7752FE')
      fit(copy.sign[0], 128, 690)
      c.fillStyle = g
      c.fillText(copy.sign[0], 64, 248)
      fit(copy.sign[1], 96, 690)
      c.fillStyle = '#ffffff'
      c.fillText(copy.sign[1], 64, 360)
      rr(c, 64, 400, 120, 8, 4, '#7752FE')
      // arrow button
      const bx = 868,
        by = 300
      const bgBtn = c.createLinearGradient(bx - 80, by - 80, bx + 80, by + 80)
      bgBtn.addColorStop(0, '#C2D9FF')
      bgBtn.addColorStop(1, '#7752FE')
      c.fillStyle = bgBtn
      c.beginPath()
      c.arc(bx, by, 84, 0, TAU)
      c.fill()
      c.strokeStyle = '#0d0b26'
      c.lineWidth = 16
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.beginPath()
      c.moveTo(bx - 28, by + 28)
      c.lineTo(bx + 28, by - 28)
      c.moveTo(bx - 14, by - 28)
      c.lineTo(bx + 28, by - 28)
      c.lineTo(bx + 28, by + 14)
      c.stroke()
      // sparkles
      c.fillStyle = '#ffffff'
      for (const [sx, sy, r] of [[790, 140, 9], [960, 196, 6], [930, 96, 5]]) {
        c.beginPath()
        c.moveTo(sx, sy - r * 2.2)
        c.quadraticCurveTo(sx, sy, sx + r * 2.2, sy)
        c.quadraticCurveTo(sx, sy, sx, sy + r * 2.2)
        c.quadraticCurveTo(sx, sy, sx - r * 2.2, sy)
        c.quadraticCurveTo(sx, sy, sx, sy - r * 2.2)
        c.fill()
      }
      // a sheen sweeps across every few seconds
      const k = (time % 3.6) / 1.2
      if (k < 1) {
        const x = -300 + k * (W + 600)
        const sh = c.createLinearGradient(x - 160, 0, x + 160, Hh)
        sh.addColorStop(0, 'rgba(255,255,255,0)')
        sh.addColorStop(0.5, 'rgba(255,255,255,.16)')
        sh.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = sh
        c.fillRect(0, 0, W, Hh)
      }
      boardTex.t.needsUpdate = true
    }
    drawBoard(0)
    const face = decal(board, BW, BH, boardTex.t)
    face.position.set(0, BY, 0.04)
    // a soft violet halo behind the board, so it glows against the night
    const haloTex = canvasTex(256, 160, (c) => {
      const h = c.createRadialGradient(128, 80, 10, 128, 80, 128)
      h.addColorStop(0, 'rgba(142,143,250,.75)')
      h.addColorStop(0.5, 'rgba(119,82,254,.28)')
      h.addColorStop(1, 'rgba(119,82,254,0)')
      c.fillStyle = h
      c.fillRect(0, 0, 256, 160)
    })
    const halo = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(BW + 1.6, BH + 1.3)),
      new THREE.MeshBasicMaterial({ map: haloTex.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    )
    halo.position.set(0, BY, -0.25)
    board.add(halo)

    // ---- App icon block and loose gears ------------------------------------------------------
    const icons = new THREE.Group()
    icons.position.set(5.6, 0, 8.6)
    icons.rotation.y = 0.15
    icons.scale.setScalar(1.25)
    world.add(icons)
    box(icons, 2.5, 0.32, 2.5, 0, 0.16, 0, P.ui, 0.14)
    const iconTiles = [
      { col: '#7752FE', x: -0.58, z: -0.58, glyph: 'heart' },
      { col: '#232052', x: 0.58, z: -0.58, glyph: 'pin' },
      { col: '#FFC94A', x: -0.58, z: 0.58, glyph: 'lock' },
      { col: '#8E8FFA', x: 0.58, z: 0.58, glyph: 'search' },
    ].map(({ col, x, z, glyph }) => {
      const g = new THREE.Group()
      g.position.set(x, 0.32, z)
      icons.add(g)
      box(g, 1.0, 0.14, 1.0, 0, 0.07, 0, new THREE.Color(col).getHex(), 0.1)
      const tex = canvasTex(128, 128, (c) => {
        c.clearRect(0, 0, 128, 128)
        c.fillStyle = '#ffffff'
        c.strokeStyle = '#ffffff'
        c.lineWidth = 10
        c.lineCap = 'round'
        c.beginPath()
        if (glyph === 'heart') {
          c.moveTo(64, 98)
          c.bezierCurveTo(20, 66, 26, 30, 50, 32)
          c.bezierCurveTo(58, 33, 62, 40, 64, 46)
          c.bezierCurveTo(66, 40, 70, 33, 78, 32)
          c.bezierCurveTo(102, 30, 108, 66, 64, 98)
          c.fill()
        } else if (glyph === 'pin') {
          c.arc(64, 52, 26, Math.PI, 0)
          c.lineTo(64, 104)
          c.closePath()
          c.fill()
          c.fillStyle = '#232052'
          c.beginPath()
          c.arc(64, 52, 10, 0, TAU)
          c.fill()
        } else if (glyph === 'lock') {
          c.strokeStyle = '#1b1838'
          c.arc(64, 54, 18, Math.PI, 0)
          c.stroke()
          rr(c, 36, 54, 56, 46, 8, '#1b1838')
        } else {
          c.arc(56, 56, 24, 0, TAU)
          c.stroke()
          c.beginPath()
          c.moveTo(74, 74)
          c.lineTo(98, 98)
          c.stroke()
        }
      }).t
      const d = decal(g, 0.8, 0.8, tex, true)
      d.rotation.x = -Math.PI / 2
      d.position.y = 0.145
      return g
    })
    gear(world, 1.1, 11, 9.4, 0.2, 7.6, P.mint, 0.45)
    gear(world, 0.8, 9, 8.6, 0.2, 9.4, P.sky, -0.6)
    gear(world, 0.95, 10, 1.8, 0.2, 9.8, P.mint, 0.5)
    gear(world, 0.65, 8, -7.8, 0.2, 5.0, P.sky, -0.7)

    // ---- Sky: clouds and a balloon -----------------------------------------------------------
    const clouds: Array<{ g: THREE.Group; speed: number; base: number }> = []
    function cloud(x: number, y: number, z: number, s: number, speed: number) {
      const g = new THREE.Group()
      g.position.set(x, y, z)
      g.scale.set(s, s * 0.78, s)
      world.add(g)
      ;[[0, 0, 0, 0.9], [0.85, -0.15, 0.1, 0.7], [-0.85, -0.2, 0, 0.65], [0.3, 0.35, -0.2, 0.7], [-0.4, 0.3, 0.2, 0.6]].forEach(([cx, cy, cz, r]) => {
        const b = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(r, 1)), mat(P.cloud, { roughness: 0.9 }))
        b.position.set(cx, cy, cz)
        g.add(b)
      })
      clouds.push({ g, speed, base: x })
    }
    cloud(-8.5, 9.6, -8.5, 1.1, 0.25)
    cloud(1.5, 11.2, -11.5, 1.2, 0.18)
    cloud(10.5, 10.8, -10.0, 0.95, 0.22)
    cloud(-3.0, 10.2, -2.0, 0.75, 0.3)
    const balloon = new THREE.Group()
    balloon.position.set(-10.5, 8.6, -1.0)
    world.add(balloon)
    const env = new THREE.SphereGeometry(1.35, 10, 8).toNonIndexed()
    env.scale(1, 1.2, 1)
    const colors: number[] = []
    const pos = env.getAttribute('position')
    const ca = new THREE.Color(P.yellow),
      cb = new THREE.Color(P.peri)
    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
        cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
      const seg = Math.floor(((Math.atan2(cz, cx) + Math.PI) / TAU) * 10) % 2
      const c = seg ? ca : cb
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b)
    }
    env.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    keep(env)
    const envMesh = new THREE.Mesh(env, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }))
    envMesh.castShadow = true
    balloon.add(envMesh)
    box(balloon, 0.65, 0.5, 0.65, 0, -2.45, 0, P.yellowDark, 0.06)
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) rod(balloon, v(x, -2.2, z), v(x * 2.6, -1.1, z * 2.6), 0.015, P.navy, false)
    const pilot = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(0.17, 1)), mat(skin[1]))
    pilot.position.set(0, -2.05, 0)
    balloon.add(pilot)

    // ---- Camera: an isometric view fitted to the illustration --------------------------------
    const viewDir = new THREE.Vector3(1, 0.86, 1).normalize()
    const target = new THREE.Vector3(0, 0, 0)
    // fit the camera to the site itself; clouds and the balloon may bleed off the edges
    const fitBox = new THREE.Box3()
    world.updateMatrixWorld(true)
    ;[phone, tablet, crane, icons, board].forEach((o) => fitBox.expandByObject(o))
    fitBox.expandByScalar(0.6)
    function layout() {
      const w = root.clientWidth,
        h = root.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      const wide = w > 900
      camera.position.copy(target).addScaledVector(viewDir, 60)
      camera.lookAt(target)
      camera.updateMatrixWorld()
      const inv = camera.matrixWorldInverse
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Vector3(i & 1 ? fitBox.max.x : fitBox.min.x, i & 2 ? fitBox.max.y : fitBox.min.y, i & 4 ? fitBox.max.z : fitBox.min.z).applyMatrix4(inv)
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
      // the box is generous: trim it so the illustration fills its share of the frame
      const cw = maxX - minX,
        ch = maxY - minY
      const cx = (minX + maxX) / 2,
        cy = (minY + maxY) / 2
      const share = wide ? 0.6 : 1
      let W = cw / share
      let Hh = W / (w / h)
      if (Hh < ch) {
        Hh = ch
        W = Hh * (w / h)
      }
      const centre = wide ? 0.69 : 0.5
      camera.left = cx - centre * W
      camera.right = cx + (1 - centre) * W
      camera.top = cy + Hh / 2
      camera.bottom = cy - Hh / 2
      camera.updateProjectionMatrix()
    }
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(root)
    cleanups.push(() => ro.disconnect())

    // Pointer parallax: the whole site tilts a little towards the cursor.
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      tilt.tx = (e.clientX / innerWidth - 0.5) * 0.16
      tilt.ty = (e.clientY / innerHeight - 0.5) * 0.06
    }
    if (!matchMedia('(pointer:coarse)').matches) {
      addEventListener('pointermove', onMove)
      cleanups.push(() => removeEventListener('pointermove', onMove))
    }

    let visible = true
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0.01 })
    io.observe(root)
    cleanups.push(() => io.disconnect())

    let t = 0,
      lastBoard = -1,
      last = performance.now(),
      raf = 0,
      ready = false
    // Touch devices watch their own frame rate once: a phone that can't hold ~40 fps renders at
    // 1x pixels, smaller shadows and 30 fps rather than stutter while the page scrolls.
    let minStep = 0,
      sampled = -30, // the first frames compile shaders and upload geometry: skip them
      sampledTime = 0
    function watchQuality(dt: number) {
      if (!lite || sampled === Infinity) return
      if (++sampled <= 0) return
      sampledTime += dt
      if (sampled < 90) return
      if (sampledTime / sampled > 1 / 40) {
        renderer.setPixelRatio(1)
        sun.shadow.mapSize.set(512, 512)
        sun.shadow.map?.dispose()
        sun.shadow.map = null
        minStep = 1000 / 30 - 2
      }
      sampled = Infinity
    }
    const ease = (x: number) => 0.5 - Math.cos(x * Math.PI) / 2
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (!visible && ready) {
        last = now
        return
      }
      if (minStep && now - last < minStep) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (ready) watchQuality(dt)
      if (!reduceMotion) t += dt
      tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 3)
      tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 3)
      world.rotation.y = tilt.x
      world.rotation.x = tilt.y
      spinners.forEach(({ o, speed, axis }) => (o.rotation[axis] = t * speed))
      // crane: slewing back and forth, both loads going up and down
      slew.rotation.y = 0.12 + Math.sin(t * 0.22) * 0.32
      hooks.forEach((hk) => {
        const drop = hk.base + Math.sin(t * hk.speed + hk.phase) * hk.amp
        hk.cable.scale.y = drop - 0.25
        hk.cable.position.set(hk.x, 0.1 - (drop - 0.25) / 2, 0)
        hk.load.position.set(hk.x, 0.1 - drop - 0.2, 0)
        hk.load.rotation.y = Math.sin(t * 0.5 + hk.phase) * 0.3
      })
      // the sign bobs a little, as if held up and waved
      board.rotation.z = Math.sin(t * 1.6) * 0.04
      // vehicles drive to their stop and back
      vehicles.forEach((vh) => {
        const k = ease((Math.sin(t * vh.speed + vh.phase) + 1) / 2)
        vh.g.position.lerpVectors(vh.from, vh.to, k)
        const travelled = k * vh.from.distanceTo(vh.to)
        const d = travelled - vh.last
        vh.last = travelled
        vh.wheels.forEach((w) => (w.rotation.y -= d / 0.4))
      })
      forks.position.y = 0.35 + (Math.sin(t * 0.9) + 1) * 0.45
      people.forEach((p) => {
        p.g.position.y = p.base.y + Math.abs(Math.sin(t * 3 + p.phase)) * 0.06
        p.arms[0].rotation.z = Math.sin(t * 3 + p.phase) * 0.5
        p.arms[1].rotation.z = -Math.sin(t * 3 + p.phase) * 0.5
        if (p.walk) p.g.position.x = p.base.x + Math.sin(t * 0.5 + p.phase) * p.walk
      })
      iconTiles.forEach((g, i) => (g.position.y = 0.32 + Math.max(0, Math.sin(t * 2 - i * 0.9)) * 0.14))
      neon.emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.5
      ;(halo.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 2.4) * 0.25
      if (t - lastBoard > 1 / 20 || lastBoard < 0) {
        drawBoard(t)
        lastBoard = t
      }
      clouds.forEach((c) => (c.g.position.x = ((c.base + t * c.speed + 16) % 32) - 16))
      balloon.position.y = 8.6 + Math.sin(t * 0.6) * 0.5
      balloon.rotation.y = t * 0.15
      renderer.render(scene, camera)
      if (!ready) {
        ready = true
        root.classList.add('is-ready')
        // the first-visit intro waits for this to count the page as loaded
        window.__jukoHeroReady = true
        window.dispatchEvent(new Event('juko:hero-ready'))
      }
    }
    raf = requestAnimationFrame(frame)
    cleanups.push(() => {
      cancelAnimationFrame(raf)
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
        if (m && !Array.isArray(m)) {
          m.map?.dispose()
          m.dispose()
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    })
  } catch (error) {
    // No WebGL: the hero keeps its copy and simply shows no illustration.
    console.warn('App builder: 3D scene unavailable', error)
    root.classList.add('is-failed')
    dispose()
  }
  return dispose
}

const STYLES = String.raw`
.app-builder-3d { position:relative; width:100%; height:100%; overflow:hidden; }
.app-builder-3d canvas { display:block; width:100%; height:100%; opacity:0; transition:opacity 1.1s cubic-bezier(.22,1,.36,1); }
.app-builder-3d.is-ready canvas { opacity:1; }
@media (prefers-reduced-motion: reduce) { .app-builder-3d canvas { transition:none; } }
`
