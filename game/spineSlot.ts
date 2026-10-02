import type { SymbolId } from '../shared/types'

/**
 * Idle / land / win are Pixi tweens. The paths below are the drop-in contract
 * for a later Spine export — this demo does not ship a Spine runtime or any
 * .skel/.atlas files. When those exist, construct the sprite here and prefer
 * animations named idle, land, and win over the tween path.
 */
export const SPINE_SLOTS: Record<SymbolId, { skel: string; atlas: string; animations: readonly string[] }> = {
  l1: { skel: 'assets/spine/l1.skel', atlas: 'assets/spine/l1.atlas', animations: ['idle', 'land', 'win'] },
  l2: { skel: 'assets/spine/l2.skel', atlas: 'assets/spine/l2.atlas', animations: ['idle', 'land', 'win'] },
  l3: { skel: 'assets/spine/l3.skel', atlas: 'assets/spine/l3.atlas', animations: ['idle', 'land', 'win'] },
  l4: { skel: 'assets/spine/l4.skel', atlas: 'assets/spine/l4.atlas', animations: ['idle', 'land', 'win'] },
  m1: { skel: 'assets/spine/m1.skel', atlas: 'assets/spine/m1.atlas', animations: ['idle', 'land', 'win'] },
  m2: { skel: 'assets/spine/m2.skel', atlas: 'assets/spine/m2.atlas', animations: ['idle', 'land', 'win'] },
  h1: { skel: 'assets/spine/h1.skel', atlas: 'assets/spine/h1.atlas', animations: ['idle', 'land', 'win'] },
  wild: { skel: 'assets/spine/wild.skel', atlas: 'assets/spine/wild.atlas', animations: ['idle', 'land', 'win'] },
  scatter: { skel: 'assets/spine/scatter.skel', atlas: 'assets/spine/scatter.atlas', animations: ['idle', 'land', 'win'] },
}

export function activeMotion(): 'tween' {
  return 'tween'
}

/** Confirms the drop-in slot exists. Motion stays on tweens until a Spine runtime is linked. */
export function motionFor(id: SymbolId): 'tween' {
  const slot = SPINE_SLOTS[id]
  if (!slot.animations.includes('idle')) {
    throw new Error(`missing idle animation for ${id}`)
  }
  return activeMotion()
}
