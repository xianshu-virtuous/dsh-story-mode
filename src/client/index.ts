import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { StoryModeSettingsSection } from './StoryModeSettingsSection.tsx'

export const name = 'dsh-story-mode-client'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'story-mode',
    order: 40,
    label: '剧情模式',
  }, StoryModeSettingsSection))
}
