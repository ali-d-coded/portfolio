export interface Point {
  x: number
  y: number
}

/** A smooth curve through the points (a Catmull-Rom spline), as a table of evenly stepped samples. */
export function spline(points: Point[], samples: number): Point[] {
  let table: Point[] = []
  let steps = Math.ceil(samples / (points.length - 1))
  for (let i = 0; i < points.length - 1; i++) {
    let p0 = points[Math.max(0, i - 1)]!
    let p1 = points[i]!
    let p2 = points[i + 1]!
    let p3 = points[Math.min(points.length - 1, i + 2)]!
    for (let k = 0; k < steps; k++) {
      let t = k / steps
      let t2 = t * t
      let t3 = t2 * t
      let at = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      table.push({ x: at(p0.x, p1.x, p2.x, p3.x), y: at(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  table.push(points[points.length - 1]!)
  return table
}
