const nativePlay = HTMLMediaElement.prototype.play;

HTMLMediaElement.prototype.play = function (...args) {
  const src = this.getAttribute('src') ?? '';
  if (src.includes('ジャンプ.mp3')) this.volume = .62;
  return nativePlay.apply(this, args);
};
