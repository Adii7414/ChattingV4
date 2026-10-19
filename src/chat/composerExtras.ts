export const SHORTCODES: Record<string, string> = {
  smile: '😄', grin: '😁', joy: '😂', rofl: '🤣', wink: '😉', blush: '😊', heart_eyes: '😍', kiss: '😘', thinking: '🤔', neutral: '😐',
  eyeroll: '🙄', sleepy: '😴', cool: '😎', cry: '😢', sob: '😭', angry: '😠', scream: '😱', party: '🥳', skull: '💀', clown: '🤡',
  heart: '❤️', fire: '🔥', thumbsup: '👍', '+1': '👍', thumbsdown: '👎', clap: '👏', pray: '🙏', wave: '👋', muscle: '💪', eyes: '👀',
  tada: '🎉', star: '⭐', sparkles: '✨', check: '✅', x: '❌', warning: '⚠️', rocket: '🚀', '100': '💯', ok: '👌', shrug: '🤷',
  coffee: '☕', pizza: '🍕', cake: '🎂', sun: '☀️', moon: '🌙', rainbow: '🌈', poop: '💩', ghost: '👻', robot: '🤖', cat: '🐱', dog: '🐶',
};

export const SLASH: { cmd: string; desc: string; run: (rest: string) => string; confetti?: boolean }[] = [
  { cmd: '/shrug', desc: 'Append ¯\\_(ツ)_/¯', run: (r) => `${r} ¯\\_(ツ)_/¯`.trim() },
  { cmd: '/tableflip', desc: '(╯°□°)╯︵ ┻━┻', run: (r) => `${r} (╯°□°)╯︵ ┻━┻`.trim() },
  { cmd: '/unflip', desc: '┬─┬ノ( º _ ºノ)', run: (r) => `${r} ┬─┬ノ( º _ ºノ)`.trim() },
  { cmd: '/lenny', desc: '( ͡° ͜ʖ ͡°)', run: (r) => `${r} ( ͡° ͜ʖ ͡°)`.trim() },
  { cmd: '/confetti', desc: 'Send with a confetti burst 🎉', run: (r) => r || '🎉', confetti: true },
  { cmd: '/spoiler', desc: 'Hide text until tapped', run: (r) => `||${r || 'spoiler'}||` },
  { cmd: '/code', desc: 'Send as a code block', run: (r) => `\`\`\`\n${r}\n\`\`\`` },
  { cmd: '/me', desc: 'Describe an action in italics', run: (r) => `_${r || 'waves'}_` },
];

export function applySlash(body: string) {
  const m = /^(\/\w+)\s*([\s\S]*)$/.exec(body);
  const c = m && SLASH.find((s) => s.cmd === m[1].toLowerCase());
  if (!c || !m) return { body, confetti: false };
  return { body: c.run(m[2].trim()), confetti: !!c.confetti };
}

export const STICKERS: { name: string; items: string[] }[] = [
  { name: 'Moods', items: ['😂', '🥹', '😍', '🥳', '😎', '🤯', '😭', '😴', '🤔', '🙃', '😤', '🫠'] },
  { name: 'Love', items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💘', '😘', '🥰', '🫶', '💌'] },
  { name: 'Animals', items: ['🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐸', '🐵', '🦄', '🐙', '🦖', '🐧'] },
  { name: 'Hype', items: ['🔥', '🎉', '💯', '🚀', '👏', '🙌', '✨', '🏆', '⚡', '🤝', '💪', '👀'] },
];

export function confetti() { window.dispatchEvent(new Event('chat:confetti')); }
