"use client";

import { ContactShadows, Edges, Outlines } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Two moon blocks (筊). Hold the mouse to pick them up, flick forward (up the screen), let go.
// The flight is a simple hand-made simulation: gravity, bounces, spin. Each block's face
// (flat or round up) is decided at release; after the first bounce it eases onto that face.

// ---- Edit these to change how it feels. ----
const SIZE = [0.8, 0.26, 0.3]; // half length, dome height, half width of one block
const BEND = 0.35; // how curved the crescent is
const GRAVITY = 14;
const BOUNCE = 0.35; // 0–1, speed kept after each bounce
const HOLD_HEIGHT = 1.4; // how high the blocks float while held
const THROW = 1; // multiplier on the flick speed
// -----------------------------------------------

export type Throw = "聖筊" | "笑筊" | "陰筊";

// Squash a unit dome into a block and bend it into a crescent.
function shape(v: THREE.Vector3) {
  v.set(v.x * SIZE[0], v.y * SIZE[1], v.z * SIZE[2]);
  v.z -= BEND * v.x * v.x - (BEND * SIZE[0] * SIZE[0]) / 3;
}

// Round side = dome on +y, flat side = cap at y = 0. Plus three contour lines on the dome.
function makeBlock() {
  const dome = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.CircleGeometry(1, 48).rotateX(Math.PI / 2);
  const body = mergeGeometries([dome, cap])!;
  const p = body.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    shape(v.fromBufferAttribute(p, i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  body.computeVertexNormals();

  const rings = [0.5, 0.8, 0.95].map((h) => {
    const r = Math.sqrt(1 - h * h);
    const points = Array.from({ length: 64 }, (_, a) => {
      const point = new THREE.Vector3(Math.cos((a / 64) * Math.PI * 2) * r, h, Math.sin((a / 64) * Math.PI * 2) * r);
      shape(point);
      return point;
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  });
  return { body, rings };
}

type Body = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  q: THREE.Quaternion;
  spin: THREE.Vector3; // angular velocity, rad/s
  target: THREE.Quaternion; // resting orientation for the face it will land on
  flatUp: boolean;
  restY: number;
  bounces: number;
  settled: boolean;
};

const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
const UP = new THREE.Vector3(0, 1, 0);

// Where a block comes to rest: flat side up (dome on the floor) or round side up.
function land(b: Body, flatUp: boolean, yaw: number) {
  b.flatUp = flatUp;
  b.restY = flatUp ? SIZE[1] : 0;
  b.target.setFromAxisAngle(UP, yaw);
  if (flatUp) b.target.multiply(FLIP);
}

function newBody(x: number, flatUp: boolean): Body {
  const b: Body = {
    pos: new THREE.Vector3(x, 0, 0.6),
    vel: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    spin: new THREE.Vector3(),
    target: new THREE.Quaternion(),
    flatUp,
    restY: 0,
    bounces: 0,
    settled: true,
  };
  land(b, flatUp, x * 0.6);
  b.pos.y = b.restY;
  b.q.copy(b.target);
  return b;
}

export function Blocks({ enabled, onResult }: { enabled: boolean; onResult: (t: Throw) => void }) {
  const { camera, gl } = useThree();
  const block = useMemo(makeBlock, []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const bodies = useRef([newBody(-0.75, false), newBody(0.75, true)]);
  const mode = useRef<"rest" | "held" | "flying">("rest");
  const flyTime = useRef(0);
  const hand = useRef(new THREE.Vector3(0, HOLD_HEIGHT, 0.6));
  const trail = useRef<{ p: THREE.Vector3; t: number }[]>([]);

  // Keep the latest props for the event handlers and the frame loop.
  const enabledRef = useRef(enabled);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    enabledRef.current = enabled;
    onResultRef.current = onResult;
  });

  // Mouse: down = pick up, move = carry, up = throw with the speed of the last ~100 ms.
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(UP, -HOLD_HEIGHT);

    const toHand = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (hit) hand.current.set(THREE.MathUtils.clamp(hit.x, -3, 3), HOLD_HEIGHT, THREE.MathUtils.clamp(hit.z, -5, 2.5));
      const now = performance.now();
      trail.current.push({ p: hand.current.clone(), t: now });
      while (trail.current.length > 2 && now - trail.current[0].t > 100) trail.current.shift();
    };

    const down = (e: PointerEvent) => {
      if (!enabledRef.current || mode.current === "flying") return;
      mode.current = "held";
      trail.current = [];
      toHand(e);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (mode.current === "held") toHand(e);
    };
    const up = () => {
      if (mode.current !== "held") return;
      el.style.cursor = "grab";
      const first = trail.current[0];
      const last = trail.current[trail.current.length - 1];
      const dt = Math.max((last.t - first.t) / 1000, 0.016);
      const v = last.p.clone().sub(first.p).divideScalar(dt);
      const speed = Math.min(v.length(), 14);

      bodies.current.forEach((b, i) => {
        b.vel.set(v.x * 0.4 * THROW + (i - 0.5) * 0.6, 2.5 + speed * 0.3, Math.max(Math.min(v.z, 0) * 0.5 * THROW - 1, -8));
        b.spin
          .set(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(8 + speed);
        land(b, Math.random() < 0.5, Math.random() * Math.PI * 2);
        b.bounces = 0;
        b.settled = false;
      });
      flyTime.current = 0;
      mode.current = "flying";
    };

    el.style.cursor = "grab";
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera, gl]);

  const dq = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(), []);
  const held = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const list = bodies.current;

    if (mode.current === "held") {
      // Float in the hand, side by side, wobbling a little.
      const t = clock.elapsedTime;
      list.forEach((b, i) => {
        const side = i ? 1 : -1;
        b.pos.lerp(axis.set(hand.current.x + side * 0.3, HOLD_HEIGHT, hand.current.z), 1 - Math.exp(-dt * 18));
        held.setFromEuler(euler.set(-0.9 + Math.sin(t * 3 + i) * 0.1, side * 0.3, side * 0.25));
        b.q.slerp(held, 1 - Math.exp(-dt * 10));
      });
    }

    if (mode.current === "flying") {
      flyTime.current += dt;
      for (const b of list) {
        if (b.settled) continue;
        b.vel.y -= GRAVITY * dt;
        b.pos.addScaledVector(b.vel, dt);

        const angle = b.spin.length() * dt;
        if (angle > 0) b.q.premultiply(dq.setFromAxisAngle(axis.copy(b.spin).normalize(), angle));

        // After the first bounce, ease onto the face it was given.
        if (b.bounces > 0) {
          b.q.slerp(b.target, 1 - Math.exp(-dt * (2 + b.bounces * 2)));
          b.spin.multiplyScalar(Math.exp(-dt * 3));
        }

        // Floor: bounce while fast, then slide to a stop.
        if (b.pos.y < b.restY) {
          b.pos.y = b.restY;
          if (b.vel.y < -1) {
            b.vel.set(b.vel.x * 0.6, -b.vel.y * BOUNCE, b.vel.z * 0.6);
            b.spin.multiplyScalar(0.5);
            b.bounces++;
          } else {
            b.bounces = Math.max(b.bounces, 1);
            b.vel.set(b.vel.x * Math.exp(-dt * 5), 0, b.vel.z * Math.exp(-dt * 5));
          }
        }

        // Invisible walls so they stay in view.
        if (Math.abs(b.pos.x) > 3) {
          b.pos.x = Math.sign(b.pos.x) * 3;
          b.vel.x *= -0.5;
        }
        if (b.pos.z < -4.5 || b.pos.z > 2.5) {
          b.pos.z = THREE.MathUtils.clamp(b.pos.z, -4.5, 2.5);
          b.vel.z *= -0.5;
        }

        const still = b.vel.y === 0 && Math.hypot(b.vel.x, b.vel.z) < 0.05 && b.q.angleTo(b.target) < 0.02;
        if (still || flyTime.current > 6) {
          b.pos.y = b.restY;
          b.q.copy(b.target);
          b.settled = true;
        }
      }

      // Don't let them overlap.
      const [a, b] = list;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6 && d > 0) {
        const push = (0.6 - d) / 2 / d;
        a.pos.x -= dx * push;
        a.pos.z -= dz * push;
        b.pos.x += dx * push;
        b.pos.z += dz * push;
      }

      if (list.every((x) => x.settled)) {
        mode.current = "rest";
        const flat = list.filter((x) => x.flatUp).length;
        onResultRef.current(flat === 1 ? "聖筊" : flat === 2 ? "笑筊" : "陰筊");
      }
    }

    list.forEach((b, i) => {
      groups.current[i]?.position.copy(b.pos);
      groups.current[i]?.quaternion.copy(b.q);
    });
  });

  return (
    <>
      {[0, 1].map((i) => (
        <group key={i} ref={(g) => void (groups.current[i] = g)}>
          <mesh geometry={block.body}>
            <meshBasicMaterial color="#fff" />
            <Edges threshold={30} color="#000" />
            <Outlines thickness={0.02} color="#000" />
          </mesh>
          {block.rings.map((ring, j) => (
            <lineLoop key={j} geometry={ring}>
              <lineBasicMaterial color="#000" />
            </lineLoop>
          ))}
        </group>
      ))}
      <ContactShadows position={[0, 0.001, 0]} scale={14} far={2} blur={2.5} opacity={0.25} />
    </>
  );
}
