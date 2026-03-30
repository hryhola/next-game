const initStars = () => {
    const canvas = document.getElementById('animated-background')

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        return
    }

    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return
    }

    let width = 0
    let height = 0
    let animationFrame = 0

    const setCanvasExtents = () => {
        width = window.innerWidth
        height = window.innerHeight

        canvas.width = width
        canvas.height = height
    }

    const makeStars = count => {
        const out = []

        for (let i = 0; i < count; i++) {
            out.push({
                x: Math.random() * 1800 - 900,
                y: Math.random() * 1200 - 600,
                z: Math.random() * 1000
            })
        }

        return out
    }

    let stars = makeStars(3500)

    const clear = () => {
        ctx.clearRect(0, 0, width, height)
    }

    const putPixel = (x, y, brightness) => {
        const intensity = Math.max(120, Math.floor(brightness * 255))
        ctx.fillStyle = `rgba(${intensity}, ${intensity}, 255, ${brightness})`
        ctx.fillRect(x, y, 2, 2)
    }

    const moveStars = distance => {
        for (let i = 0; i < stars.length; i++) {
            stars[i].z -= distance

            while (stars[i].z <= 1) {
                stars[i].z += 1000
            }
        }
    }

    let prevTime = 0

    const tick = time => {
        const elapsed = prevTime ? time - prevTime : 16
        prevTime = time

        moveStars(elapsed * 0.08)
        clear()

        const cx = width / 2
        const cy = height / 2

        for (let i = 0; i < stars.length; i++) {
            const star = stars[i]
            const x = cx + star.x / (star.z * 0.001)
            const y = cy + star.y / (star.z * 0.001)

            if (x < 0 || x >= width || y < 0 || y >= height) {
                continue
            }

            const depth = star.z / 1000
            const brightness = 1 - depth * depth

            putPixel(x, y, brightness)
        }

        animationFrame = window.requestAnimationFrame(tick)
    }

    setCanvasExtents()
    window.addEventListener('resize', setCanvasExtents)
    animationFrame = window.requestAnimationFrame(tick)

    return () => {
        window.cancelAnimationFrame(animationFrame)
        window.removeEventListener('resize', setCanvasExtents)
    }
}

export default initStars
