import { expect, it } from 'vitest'
import { formatTime, transcriptToText } from './video'

it('formatTime', () => {
  expect(formatTime(0)).toBe('0:00')
  expect(formatTime(75.9)).toBe('1:15')
  expect(formatTime(3725)).toBe('1:02:05')
  expect(formatTime(-3)).toBe('0:00')
})

it('transcriptToText', () => {
  expect(transcriptToText({ language: 'pt', segments: [{ t: 0, text: 'Olá' }, { t: 61, text: 'Tchau' }] })).toBe('[0:00] Olá\n[1:01] Tchau')
})
