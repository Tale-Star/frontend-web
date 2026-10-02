export interface UserResponse {
  id: string
  email: string
  display_name: string
  pin_configured: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserResponse
}

export interface RegisterRequest {
  email: string
  display_name: string
  password: string
  parental_pin?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SetParentalPinRequest {
  current_password: string
  pin: string
}

export interface ValidateParentalPinRequest {
  pin: string
}

export interface ValidateParentalPinResponse {
  valid: boolean
}

export interface Character {
  id: string
  name: string
  description: string
  visual_description: string
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CharacterCreateRequest {
  name: string
  description?: string
  visual_description?: string
  attributes?: Record<string, unknown>
}

export type CharacterPatchRequest = Partial<CharacterCreateRequest>

export interface Scenario {
  id: string
  name: string
  description: string
  visual_description: string
  seed: number | null
  created_at: string
  updated_at: string
}

export interface ScenarioCreateRequest {
  name: string
  description?: string
  visual_description?: string
  seed?: number | null
}

export type ScenarioPatchRequest = Partial<ScenarioCreateRequest>

export interface StyleProfile {
  id: string
  name: string
  description: string
  prompt_modifier: string
  visual_settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StyleProfileCreateRequest {
  name: string
  description?: string
  prompt_modifier?: string
  visual_settings?: Record<string, unknown>
}

export type StyleProfilePatchRequest = Partial<StyleProfileCreateRequest>

export interface Story {
  id: string
  title: string
  description: string
  scenario_id: string | null
  style_profile_id: string | null
  seed: number | null
  created_at: string
  updated_at: string
}

export interface StoryCreateRequest {
  title: string
  description?: string
  scenario_id?: string | null
  style_profile_id?: string | null
  seed?: number | null
}

export type StoryPatchRequest = Partial<StoryCreateRequest>

export interface StoryPage {
  id: string
  story_id: string
  page_number: number
  action: string
  text: string
  visual_config: Record<string, unknown>
  character_ids: string[]
  seed: number | null
  created_at: string
  updated_at: string
}

export interface StoryPageCreateRequest {
  page_number: number
  action?: string
  text?: string
  visual_config?: Record<string, unknown>
  character_ids?: string[]
  seed?: number | null
}

export type StoryPagePatchRequest = Partial<StoryPageCreateRequest>

export interface ImageGenerationRequest {
  Action?: string
  Emotion?: string
  Scene?: string
  Moment?: string
  Extra?: string
  FreePrompt?: string
  Style?: string
  Characters?: string[]
  Objects?: string[]
  Seed?: number | null
}

export interface MusicSectionRequest {
  Type: string
  Modifier: string
  Text: string
}

export interface MusicGenerationRequest {
  Caption?: string
  Duration: number
  Bpm: number
  Voice?: string
  Language: 'Español' | 'English'
  Output: 'song' | 'instrumental'
  Genre?: string[]
  Mood?: string[]
  Instruments?: string[]
  Production?: string[]
  Sections?: MusicSectionRequest[]
  Seed?: number | null
}

export type GenerationStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed'
export type GenerationType = 'Image' | 'Music'

export interface GenerationJob {
  id: string
  type: GenerationType
  status: GenerationStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  seed: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  attempts: number
}

export type LibraryItemType = 'image' | 'story' | 'music'

export interface LibraryItem {
  id: string
  type: LibraryItemType
  resource_id: string
  name: string
  description: string
  favorite: boolean
  resource_url: string
  media_type: string | null
  created_at: string
  updated_at: string
}

export interface LibraryItemCreateRequest {
  type: LibraryItemType
  resource_id: string
  name?: string | null
  description?: string
}

export interface LibraryItemPatchRequest {
  name?: string | null
  description?: string | null
  favorite?: boolean | null
}

export interface ErrorIssue {
  loc: Array<string | number>
  type: string
  msg: string
}

export interface ErrorResponse {
  error: {
    code: string
    message: string | ErrorIssue[]
  }
}
