import type { Project, SchedulableItem } from '@content-machine/core';

export function project(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    name: 'bees',
    channel: 'Example Channel',
    sourcePlatform: 'youtube',
    account: 'default',
    timezone: 'America/Los_Angeles',
    weekStartsOn: 'monday',
    slots: ['12:00', '17:00', '20:00'],
    stagger: { tiktok: 0, instagram: 15, youtube: 30 },
    handles: { tiktok: '', instagram: '', youtube: '' },
    ...overrides,
  };
}

export function items(count: number, firstId = 1): SchedulableItem[] {
  return Array.from({ length: count }, (_, i) => {
    const id = firstId + i;
    const name = String(id).padStart(3, '0');
    return {
      id,
      video: `videos/${name}.mp4`,
      thumb: `thumbs/${name}.jpg`,
      duration: 45,
      postTitle: `Post ${id}`,
      captions: { tiktok: 't', instagram: 'i', youtube: 'y' },
      source: 'video1.mp4',
      sourceStart: i * 45,
      sourceEnd: (i + 1) * 45,
      note: '',
    };
  });
}
