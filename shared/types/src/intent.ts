// @trip/types — Intent extraction (D4)

export type Intent = 'show_map' | 'show_card' | 'continue' | 'rescue' | 'unknown'

export interface IntentExtraction {
  intent: Intent
  confidence: number
}
