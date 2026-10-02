import { httpClient } from '@/api/HttpClient'
import type {
  Character,
  CharacterCreateRequest,
  CharacterPatchRequest,
  Scenario,
  ScenarioCreateRequest,
  ScenarioPatchRequest,
  Story,
  StoryCreateRequest,
  StoryPage,
  StoryPageCreateRequest,
  StoryPagePatchRequest,
  StoryPatchRequest,
  StyleProfile,
  StyleProfileCreateRequest,
  StyleProfilePatchRequest,
} from '@/types/api'

function queryFor(value: string | undefined): string {
  const params = new URLSearchParams()
  if (value?.trim()) params.set('q', value.trim())
  const query = params.toString()
  return query ? '?' + query : ''
}

export const resourcesApi = {
  listCharacters(q?: string): Promise<Character[]> {
    return httpClient.request<Character[]>('characters' + queryFor(q))
  },
  createCharacter(payload: CharacterCreateRequest): Promise<Character> {
    return httpClient.request<Character>('characters', { method: 'POST', body: payload })
  },
  patchCharacter(id: string, payload: CharacterPatchRequest): Promise<Character> {
    return httpClient.request<Character>('characters/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
    })
  },
  deleteCharacter(id: string): Promise<void> {
    return httpClient.request<void>('characters/' + encodeURIComponent(id), { method: 'DELETE' })
  },
  listScenarios(q?: string): Promise<Scenario[]> {
    return httpClient.request<Scenario[]>('scenarios' + queryFor(q))
  },
  createScenario(payload: ScenarioCreateRequest): Promise<Scenario> {
    return httpClient.request<Scenario>('scenarios', { method: 'POST', body: payload })
  },
  patchScenario(id: string, payload: ScenarioPatchRequest): Promise<Scenario> {
    return httpClient.request<Scenario>('scenarios/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
    })
  },
  deleteScenario(id: string): Promise<void> {
    return httpClient.request<void>('scenarios/' + encodeURIComponent(id), { method: 'DELETE' })
  },
  listStyleProfiles(q?: string): Promise<StyleProfile[]> {
    return httpClient.request<StyleProfile[]>('style-profiles' + queryFor(q))
  },
  createStyleProfile(payload: StyleProfileCreateRequest): Promise<StyleProfile> {
    return httpClient.request<StyleProfile>('style-profiles', { method: 'POST', body: payload })
  },
  patchStyleProfile(id: string, payload: StyleProfilePatchRequest): Promise<StyleProfile> {
    return httpClient.request<StyleProfile>('style-profiles/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
    })
  },
  deleteStyleProfile(id: string): Promise<void> {
    return httpClient.request<void>('style-profiles/' + encodeURIComponent(id), {
      method: 'DELETE',
    })
  },
  listStories(q?: string): Promise<Story[]> {
    return httpClient.request<Story[]>('stories' + queryFor(q))
  },
  createStory(payload: StoryCreateRequest): Promise<Story> {
    return httpClient.request<Story>('stories', { method: 'POST', body: payload })
  },
  patchStory(id: string, payload: StoryPatchRequest): Promise<Story> {
    return httpClient.request<Story>('stories/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
    })
  },
  deleteStory(id: string): Promise<void> {
    return httpClient.request<void>('stories/' + encodeURIComponent(id), { method: 'DELETE' })
  },
  listStoryPages(storyId: string): Promise<StoryPage[]> {
    return httpClient.request<StoryPage[]>('stories/' + encodeURIComponent(storyId) + '/pages')
  },
  createStoryPage(storyId: string, payload: StoryPageCreateRequest): Promise<StoryPage> {
    return httpClient.request<StoryPage>('stories/' + encodeURIComponent(storyId) + '/pages', {
      method: 'POST',
      body: payload,
    })
  },
  patchStoryPage(
    storyId: string,
    pageId: string,
    payload: StoryPagePatchRequest,
  ): Promise<StoryPage> {
    return httpClient.request<StoryPage>(
      'stories/' + encodeURIComponent(storyId) + '/pages/' + encodeURIComponent(pageId),
      { method: 'PATCH', body: payload },
    )
  },
  deleteStoryPage(storyId: string, pageId: string): Promise<void> {
    return httpClient.request<void>(
      'stories/' + encodeURIComponent(storyId) + '/pages/' + encodeURIComponent(pageId),
      { method: 'DELETE' },
    )
  },
}
