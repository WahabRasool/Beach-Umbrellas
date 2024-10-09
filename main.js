import * as THREE from "three";
import {uv, vec2, vec3, fract, attribute, select, color, length, smoothstep, add, mix, oneMinus, positionGeometry} from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {SimplexNoise} from "three/addons/math/SimplexNoise.js";

console.clear();

let simplex = new SimplexNoise();

let scene = new THREE.Scene();
scene.background = new THREE.Color("skyblue");
let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 0.35, 1).setLength(40);
let renderer = new THREE.WebGPURenderer({antialias: true});
renderer.setPixelRatio( devicePixelRatio );
renderer.setSize( innerWidth, innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let light = new THREE.DirectionalLight(0xffffff, Math.PI * 1.5);
light.position.set(0.5, 1, 1).setLength(100);
light.castShadow = true;
light.shadow.intensity = 0.6;
light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.5;
let camSize = 100;
light.shadow.camera.far = camSize * 2;
light.shadow.camera.left = -camSize;
light.shadow.camera.right = camSize;
light.shadow.camera.top = camSize;
light.shadow.camera.bottom = -camSize;
//scene.add(new THREE.CameraHelper(light.shadow.camera));
scene.add(light, new THREE.AmbientLight(0xffffff, Math.PI * 0.5));

let circle = 100;

let getHeight = (x, z) => {
  let n = simplex.noise(x / circle, z / circle) + 1;
  let l = Math.hypot(x, z);
  let s = 1. - THREE.MathUtils.smoothstep(l, 0, circle);
  return n * 7 * s;
}

let sand = new THREE.Mesh(
  new THREE.PlaneGeometry(circle * 3, circle * 3, circle * 3, circle * 3).rotateX(-Math.PI * 0.5),
  new THREE.MeshLambertNodeMaterial({color: 0xF6DCBD})
);
sand.receiveShadow = true;
let pos = sand.geometry.attributes.position;
for(let i = 0; i < pos.count; i++){
  pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
}
sand.geometry.computeVertexNormals();
let seaCol = color(scene.background.getHex());
let dist = length(positionGeometry.xz).toVar();
let sandF = smoothstep(circle, add(circle, 50.), dist).toVar();
sand.material.colorNode = color(sand.material.color).mul(sandF.oneMinus());
sand.material.emissiveNode = seaCol.mul(sandF);
console.log(sand.material)
scene.add(sand);

let gs = [
  new THREE.CylinderGeometry(0.025, 0.025, 0.9, 3, 1, true).translate(0, 0.45, 0),
  new THREE.LatheGeometry([
    [1, 0.8], [0.66, 0.9], [0.33, 0.96], [0, 1]
  ].map(p => {return new THREE.Vector2(...p)}),
  8)
];
gs.forEach((g, gIdx) => {
  g.setAttribute("color", new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(gIdx), 3));
});
let g = mergeGeometries(gs);
let m = new THREE.MeshLambertNodeMaterial({vertexColors: true, side: THREE.DoubleSide});
let amount = 2500;
let io = new THREE.InstancedMesh(g, m, amount);
io.castShadow = true;

let dummy = new THREE.Object3D();
let dummyColor = new THREE.Color();
let instColor = [];
for(let i = 0; i < amount; i++){
  dummy.position.setFromCylindricalCoords(Math.sqrt(circle * circle * Math.random()), Math.random() * 2 * Math.PI, 0);
  dummy.position.y = getHeight(dummy.position.x, dummy.position.z);
  dummy.rotation.y = Math.PI * 2 * Math.random();
  dummy.rotation.z = Math.PI * 0.05 * Math.sign(Math.random() - 0.5);
  dummy.updateMatrix();
  io.setMatrixAt(i, dummy.matrix);
  dummyColor.setHSL(Math.random(), 0.875, 0.5);
  instColor.push(dummyColor.r, dummyColor.g, dummyColor.b);
}
g.setAttribute("instColor", new THREE.InstancedBufferAttribute(new Float32Array(instColor), 3));

let uvScaled = uv().mul(vec2(4., 1.)).toVar();
let iColor = attribute("instColor").toVar();
let col = select(fract(uvScaled.x).greaterThan(0.5), vec3(1., 1., 1.), iColor).toVar();
m.colorNode = col;

scene.add(io);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
})