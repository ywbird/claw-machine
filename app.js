const container = document.getElementById("canvas-container")
const debug = document.getElementById("debug")

class Renderer {
    constructor(width, height, container, draw, update) {
        this.width = width
        this.height = height

        this.container = container

        this.canvas = document.createElement("canvas")

        this.isRun = false

        this.canvas.width = width
        this.canvas.height = height

        this.showCanvas = document.createElement("canvas")

        this.showCanvas.width = width
        this.showCanvas.height = height

        this.ctx = this.canvas.getContext("2d")

        this.ctx.transform(1, 0, 0, -1, 0, height)
        this.ctx.translate(this.width / 2, this.height / 2);

        this.container.appendChild(this.showCanvas)

        this.lastTime = Date.now()

        this.delta = 0
    }

    run(draw, update) {
        this.draw = draw
        this.update = update

        this.isRun = true

        window.requestAnimationFrame(this.step.bind(this))
    }

    step() {
        this.isRun && window.requestAnimationFrame(this.step.bind(this))

        this.delta = (Date.now() - this.lastTime) / 1000

        this.update(this.delta)

        this.clear(this.ctx)
        this.draw(this.ctx, this.delta, { width: this.width, height: this.height })

        this.lastTime = Date.now()

        this.showCanvas.getContext("2d").drawImage(this.canvas, 0, 0)
    }

    clear(ctx) {
        ctx.beginPath()
        ctx.fillStyle = "rgba(200, 200, 200, 255)";
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.stroke()
        ctx.closePath()
    }

    registerListener() { }
}

const renderer = new Renderer(1000, 1000, container)

const camera = {
    yaw: 0,
    x: 0, y: 0, z: 20,
    pitch: Math.PI * 5 / 4
}

const far = -200
const near = 200
const FOV = .3
const zoom = 4

const gravityConstant = 10

const farNearComp = 1/(far-near)

const keyState = {}

window.addEventListener('keydown', (e) => keyState[e.code] = true)
window.addEventListener('keyup', (e) => keyState[e.code] = false)

renderer.registerListener([

])

const balls = Array.from({ length: 100 },
    () => {
        const randoms = Array.from(crypto.getRandomValues(new Uint8Array(5))).map(s => s / 255)
        return {
            radius: 10 + randoms[0] * 30,
            x: -1000 + 2000 * randoms[1],
            y: -1000 + 2000 * randoms[2],
            z: 300 * randoms[3] + 10 + randoms[0] * 30,
            color: hslToRgb(randoms[4], 1, 0.5),
            gravity: true,
            zSpeed: 0
        }
    })

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} delta
 * @param {{ width: number, height: number }} demension
 */
function draw(ctx, delta, demension) {

    ctx.beginPath()

    const depthSortedBalls = [...balls, {x: camera.x, y: camera.y, z: camera.z, radius: 20, color: {r:0,g:0,b:0}, gravity: false, zSpeed: 0}].sort((ballA, ballB) => projection(ballB, camera).z - projection(ballA, camera).z)

    depthSortedBalls.forEach(ball => {
        const clonedBall = structuredClone(ball)
        clonedBall.z = 0
        const shadowProjected = projection(clonedBall, camera)
        const projected = projection(ball, camera)
        if (projected.scale <= 0) return
        ctx.beginPath()
        ctx.fillStyle = `gray`
        ctx.ellipse(shadowProjected.x * projected.scale, shadowProjected.y * projected.scale, clonedBall.radius * projected.scale, clonedBall.radius * projected.scale * Math.abs(Math.sin(camera.pitch)), 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
    })

    depthSortedBalls.forEach(ball => {
        const projected = projection(ball, camera)
        if (projected.scale <= 0) return
        ctx.beginPath()
        ctx.fillStyle = `rgb(${ball.color.r}, ${ball.color.g}, ${ball.color.b})`
        ctx.arc(projected.x * projected.scale, projected.y * projected.scale, ball.radius * projected.scale, 0, 2 * Math.PI)
        ctx.fill()
        // ctx.fillStyle = "black"
        // ctx.fillText(`${projected.z}`, projected.x, projected.y)
        ctx.closePath()
    })
}

function update(delta) {


    if (keyState["ArrowRight"]) camera.yaw = (camera.yaw - 1.4 * delta) % (2*Math.PI)
    if (keyState["ArrowLeft"])  camera.yaw = (camera.yaw + 1.4 * delta) % (2*Math.PI)
    if (keyState["ArrowUp"] && camera.pitch <= Math.PI * 3 / 2)    camera.pitch = (camera.pitch + 1 * delta) % (2*Math.PI)
    if (keyState["ArrowDown"] && camera.pitch >= Math.PI * 20/19)  camera.pitch = (camera.pitch - 1 * delta) % (2*Math.PI)
    if (keyState["KeyW"]) {
        camera.y -= Math.cos(camera.yaw) * 500 * delta
        camera.x -= Math.sin(camera.yaw) * 500 * delta
    }
    if (keyState["KeyS"]) {
        camera.y += Math.cos(camera.yaw) * 500 * delta
        camera.x += Math.sin(camera.yaw) * 500 * delta
    }
    if (keyState["KeyA"]) {
        camera.y += Math.cos(camera.yaw - Math.PI/2) * 500 * delta
        camera.x += Math.sin(camera.yaw - Math.PI/2) * 500 * delta
    }
    if (keyState["KeyD"]) {
        camera.y += Math.cos(camera.yaw + Math.PI/2) * 500 * delta
        camera.x += Math.sin(camera.yaw + Math.PI/2) * 500 * delta
    }
    // if (keyState["ShiftLeft"]) camera.z -= 500 * delta
    // if (keyState["Space"]) camera.z += 500 * delta

    balls.filter(ball=>ball.gravity).forEach(ball => {
        ball.zSpeed += gravityConstant * delta * 10

        if (ball.z - ball.zSpeed * delta * 10 <= ball.radius) {
            ball.z = ball.radius

            ball.zSpeed *= - ball.radius / 50
            if (Math.abs(ball.zSpeed) <= gravityConstant) {
                ball.zSpeed = 0
            }
        }

        // if (ball.z < ball.radius) ball.z = ball.radius

        ball.z -= ball.zSpeed * delta * 10
    })

    // renderDebug([
    //     [keyState, "keyState"],
    //     [camera, "camera"],
    // ])
}

renderer.run(draw, update)

/*===============UTILITY FUNCTIONS============*/

/**
 * 
 * @param {any[]} items 
 */
function renderDebug(items) {
    debug.innerText = ""
    items.forEach(item => {
        debug.innerText += `\n${item[1]}\n${JSON.stringify(item[0], null, 2)}\n`
    })
}

function d(v_0, v_1) {
    return Math.sqrt((v_0.x - v_1.x) ** 2 + (v_0.y - v_1.y) ** 2 + (v_0.z - v_1.z) ** 2)
}

function polygon(ctx, points) {
    ctx.beginPath()

    ctx.moveTo(...points[0])

    points.forEach(point => ctx.lineTo(...point))

    ctx.closePath()

    ctx.fill()

}

function projection(ball, cam) {
    const { x, y, z } = ball
    const { yaw, pitch } = cam
    const init = { x: x, y: y, z: z }

    const moved = {
        x: init.x - camera.x,
        y: init.y - camera.y,
        z: init.z - camera.z
    
    }
    const rotated = {
        x: moved.x * Math.cos(yaw) - moved.y * Math.sin(yaw),
        y: moved.x * Math.sin(yaw) + moved.y * Math.cos(yaw),
        z: moved.z
    }


    const applyPitch = {
        x: rotated.x,
        y: rotated.y * Math.sin(pitch) - rotated.z * Math.cos(pitch),
        z: rotated.z * Math.cos(pitch) + rotated.y * Math.sin(pitch),
    }

    let scale = ( applyPitch.z - near ) * farNearComp
        scale += (1-scale) / FOV
        scale = zoom / scale

    const result = {
        x: applyPitch.x,
        y: applyPitch.y,
        z: applyPitch.z,
        scale
    }

    return result
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The value
 * @return  {{r:number, g:number, b:number}}           The RGB representation
 */
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
}


