class Color {
  red
  green
  blue

  constructor(red, green, blue) {
    this.red = red
    this.green = green
    this.blue = blue
  }

  get asCss() {
    return `rgb(${Math.floor(this.red)}, ${Math.floor(this.green)}, ${Math.floor(this.blue)})`
  }

  clone() {
    return new Color(this.red, this.green, this.blue)
  }
}

class Fireworks {
  particles = []
  lastTimestamp = 0
  gravity = 0.000_000_1
  minRocketHorizontalVelocity = -0.000_05
  maxRocketHorizontalVelocity = 0.000_05
  minRocketVerticalVelocity = 0.000_3
  maxRocketVerticalVelocity = 0.000_45
  minRocketTtl = 2_000
  maxRocketTtl = 4_000
  minRocketBurstVelocity = -0.000_1
  maxRocketBurstVelocity = 0.01
  minRocketSize = 1.25
  maxRocketSize = 2.4
  minStartingRockets = 1
  maxStartingRockets = 4
  rocketColors = [
    new Color(255, 255, 255),
    new Color(255, 211, 51),
    new Color(255, 173, 76),
    new Color(180, 180, 180),
  ]
  burstColors = [
    new Color(255, 255, 255),
    new Color(223, 0, 0),
    new Color(0, 200, 0),
    new Color(93, 42, 255),
    new Color(255, 211, 51),
    new Color(255, 173, 76),
    new Color(180, 180, 180),
  ]
  minBurstColors = 2
  maxBurstColors = 3
  newRocketProbability = 0.05
  canvasContext
  animationFrameRequestId = null

  constructor(canvas) {
    const canvasBounds = canvas.getBoundingClientRect()
    canvas.width = canvasBounds.width / 1.5
    canvas.height = canvasBounds.height / 1.5
    this.canvasContext = canvas.getContext('2d') || (() => {
      throw new Error("Canvas 2D context initialization failed")
    })()
  }

  run() {
    if (this.animationFrameRequestId !== null) {
      return
    }

    for (let i = randomInt(this.minStartingRockets, this.maxStartingRockets); i >= 0; i--) {
      this.#addNewRocket()
    }

    this.lastTimestamp = performance.now()
    this.animationFrameRequestId = requestAnimationFrame(this.#mainLoop.bind(this))
  }

  stop() {
    if (this.animationFrameRequestId === null) {
      return
    }

    cancelAnimationFrame(this.animationFrameRequestId)
    this.animationFrameRequestId = null
  }

  reset() {
    const canvas = this.canvasContext.canvas
    const canvasBounds = canvas.getBoundingClientRect()
    canvas.width = canvasBounds.width / Fireworks.CANVAS_RESOLUTION_SCALE
    canvas.height = canvasBounds.height / Fireworks.CANVAS_RESOLUTION_SCALE
    this.particles.splice(0)
  }

  #mainLoop() {
    const now = performance.now()
    const deltaTime = now - this.lastTimestamp
    this.lastTimestamp = now

    this.#update(deltaTime)
    this.#render()

    requestAnimationFrame(this.#mainLoop.bind(this))
  }

  #update(deltaTime) {
    const displayHeight = this.canvasContext.canvas.height

    for (const particle of this.particles) {
      particle.dy += this.gravity * displayHeight * deltaTime
      particle.update(deltaTime)
    }

    if (Math.random() < this.newRocketProbability) {
      this.#addNewRocket()
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].y > displayHeight) {
        this.particles[i].state = ParticleState.INACTIVE
        this.particles.splice(i, 1)
      }
    }
  }

  #render() {
    this.canvasContext.clearRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height)
    for (const particle of this.particles) {
      particle.render(this.canvasContext)
    }
  }

  #addNewRocket() {
    const rocket = this.#createRocket()
    rocket.onBurst = (burstParticles) => {
      rocket.state = ParticleState.DEACTIVATING
      this.particles.push(...burstParticles)
    }
    this.particles.push(rocket)
  }

  #createRocket() {
    const displayWidth = this.canvasContext.canvas.width
    const displayHeight = this.canvasContext.canvas.height
    const rocketX = random(0.2 * displayWidth, 0.8 * displayWidth)
    const rocketColor = this.rocketColors[Math.floor(random(0, this.rocketColors.length))].clone()
    const burstColors = Math.random() < 0.4 ?
      [rocketColor]
      :
      new Array(randomInt(this.minBurstColors, this.maxBurstColors)).fill(0).map(
        () => this.burstColors[randomInt(0, this.burstColors.length)],
      )
    const rocket = new Rocket(
      rocketX,
      displayHeight,
      random(this.minRocketHorizontalVelocity * displayWidth, this.maxRocketHorizontalVelocity * displayWidth),
      -random(this.minRocketVerticalVelocity * displayHeight, this.maxRocketVerticalVelocity * displayHeight),
      rocketColor,
      random(this.minRocketTtl, this.maxRocketTtl),
      random(this.minRocketBurstVelocity, this.maxRocketBurstVelocity),
      burstColors,
      (displayWidth + displayHeight) / 2,
    )
    rocket.size = random(this.minRocketSize, this.maxRocketSize)
    return rocket
  }
}

class ParticleState {
  static ACTIVE = 'ParticleState.ACTIVE'
  static DEACTIVATING = 'ParticleState.DEACTIVATING'
  static INACTIVE = 'ParticleState.INACTIVE'
}

class Particle {
  x
  y
  dx
  dy
  color
  trail = []
  trailMaxLength = 32
  size = 2
  state = ParticleState.ACTIVE

  constructor(x, y, dx, dy, color) {
    this.x = x
    this.y = y
    this.dx = dx
    this.dy = dy
    this.color = color
  }

  render(canvasContext) {
    canvasContext.fillStyle = this.color.asCss
    for (let i = 0; i < this.trail.length; i++) {
      const pastPosition = this.trail[i]
      if (this.state === ParticleState.ACTIVE) {
        canvasContext.globalAlpha = (this.trailMaxLength - this.trail.length + i) / this.trailMaxLength
      } else {
        canvasContext.globalAlpha = i / this.trailMaxLength
      }
      canvasContext.fillRect(pastPosition.x, pastPosition.y, this.size, this.size)
    }
    canvasContext.globalAlpha = 1
    if (this.state === ParticleState.ACTIVE) {
      canvasContext.fillRect(this.x, this.y, this.size, this.size)
    }
  }

  update(deltaTime) {
    switch (this.state) {
      case ParticleState.ACTIVE:
        this.trail.push({
          x: this.x,
          y: this.y,
        })
        if (this.trail.length > this.trailMaxLength) {
          this.trail.shift()
        }
        this.x += this.dx * deltaTime
        this.y += this.dy * deltaTime
        break
      case ParticleState.DEACTIVATING:
        this.trail.shift()
        if (!this.trail.length) {
          this.state = ParticleState.INACTIVE
        }
        break
      default:
        break
    }
  }
}

class Rocket extends Particle {
  lifeDuration = 0
  maxTtl
  minBurstVelocity
  onBurst = null
  minBurstForce = 0.000_06
  maxBurstForce = 0.000_15
  minBurstSize = 16
  maxBurstSize = 64
  hasBurst = false
  displaySize
  burstColors

  constructor(x, y, dx, dy, color, maxTtl, minBurstVelocity, burstColors, displaySize) {
    super(x, y, dx, dy, color)
    this.maxTtl = maxTtl
    this.minBurstVelocity = minBurstVelocity
    this.burstColors = burstColors
    this.displaySize = displaySize
  }

  update(deltaTime) {
    super.update(deltaTime)

    this.lifeDuration += deltaTime

    if (!this.hasBurst && typeof this.onBurst === 'function') {
      if (this.dy > this.minBurstVelocity || this.lifeDuration > this.maxTtl) {
        this.hasBurst = true
        const burstParticles = this.createBurstParticles()
        this.onBurst(burstParticles)
      }
    }
  }

  createBurstParticles() {
    const burstForce = random(this.minBurstForce, this.maxBurstForce) * this.displaySize
    const burstParticles = new Array(randomInt(this.minBurstSize, this.maxBurstSize)).fill(0).map(() => {
      const particle = this.createBurstParticle()
      particle.dx += burstForce * (Math.random() - 0.5)
      particle.dy += burstForce * (Math.random() - 0.5)
      return particle
    })
    return burstParticles
  }

  createBurstParticle() {
    const particle = new BurstParticle(
      this.x,
      this.y,
      this.dx,
      this.dy,
      this.burstColors[randomInt(0, this.burstColors.length)].clone(),
    )
    particle.size = this.size
    return particle
  }
}

class BurstParticle extends Particle {
  startColor = this.color
  fadeToColor = new Color(28, 28, 28)
  colorFadeSpeed = 0.000_04
  fadeProgress = 0

  update(deltaTime) {
    super.update(deltaTime)

    if (this.state !== ParticleState.INACTIVE) {
      this.fadeProgress = Math.min(this.fadeProgress + this.colorFadeSpeed * deltaTime, 1)
      this.color.red = lerp(this.startColor.red, this.fadeToColor.red, this.fadeProgress)
      this.color.green = lerp(this.startColor.green, this.fadeToColor.green, this.fadeProgress)
      this.color.blue = lerp(this.startColor.blue, this.fadeToColor.blue, this.fadeProgress)
    }
  }
}

function lerp(from, to, progress) {
  return (to - from) * progress + from
}

function random(min, max) {
  return (Math.random() * (max - min)) + min
}

function randomInt(min, max) {
  return Math.floor(random(min, max))
}

function init() {
  const fireworks = new Fireworks(document.getElementById('display'))
  fireworks.run()
}

init()
